import fs from "node:fs/promises";

const baseUrl = process.env.GOPU_OS_BASE_URL || process.argv[2] || "https://gopu-os-2h3arlcsz-sukeshreddy4g-4031s-projects.vercel.app";

const requiredRoutes = [
  "/export-os",
  "/export-os/leads",
  "/export-os/leads/new",
  "/export-os/buyer-crm",
  "/export-os/executives/cfo",
  "/export-os/director",
  "/export-os/invoices",
  "/export-os/invoices/new",
  "/export-os/coo/leads/demo-sukesh-turmeric-australia",
  "/export-os/document-factory",
  "/export-os/shipments",
  "/export-os/payment-vault",
  "/export-os/executives/cmo",
  "/export-os/executives/cto",
  "/export-os/company-master-data",
  "/export-os/tasks"
];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function fetchStatus(route) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    return { route, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch (error) {
    return { route, status: "ERROR", ok: false, error: error.message };
  }
}

async function extractCrmRoutes() {
  const source = await fs.readFile("src/pages/TemporaryCRMHome.jsx", "utf8");
  const matches = [
    ...source.matchAll(/route:\s*'([^']+)'/g),
    ...source.matchAll(/route="([^"]+)"/g),
    ...source.matchAll(/href=\{item\.route\}/g)
  ];
  const literalRoutes = matches.map((match) => match[1]).filter((route) => route?.startsWith("/"));
  return unique([...requiredRoutes, ...literalRoutes]);
}

const crmSource = await fs.readFile("src/pages/TemporaryCRMHome.jsx", "utf8");
const mainSource = await fs.readFile("src/main.jsx", "utf8");
const routes = await extractCrmRoutes();
const routeResults = await Promise.all(routes.map(fetchStatus));
const failed = routeResults.filter((result) => !result.ok);
const checks = [
  { name: "temporary CRM uses router link handler", ok: crmSource.includes("handleCrmLink") },
  { name: "onboarding tour removed from clean CRM screen", ok: !mainSource.includes("showTour && <OnboardingTour") },
  { name: "demo COO route is registered", ok: mainSource.includes("route.startsWith('/export-os/coo/leads/')") },
  { name: "all required routes returned HTTP 2xx/3xx", ok: failed.length === 0 }
];

console.log(JSON.stringify({
  ok: checks.every((check) => check.ok),
  baseUrl,
  checks,
  routeResults
}, null, 2));

if (checks.some((check) => !check.ok) || failed.length) {
  process.exitCode = 1;
}
