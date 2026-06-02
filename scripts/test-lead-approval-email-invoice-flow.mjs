import fs from "node:fs";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.GOPU_OS_BASE_URL || process.argv.find((arg) => arg.startsWith("http")) || "https://gopu-os-2h3arlcsz-sukeshreddy4g-4031s-projects.vercel.app";
const approvalId = process.env.LIVE_LEAD_FLOW_APPROVAL_ID || "";
const live = process.argv.includes("--live") || process.env.LIVE_LEAD_FLOW_TEST === "true";

async function getJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { httpStatus: response.status, body };
}

const sharedSource = fs.readFileSync("api/_shared/approvedLeadProformaInvoice.ts", "utf8");
const staticChecks = [
  { name: "buyer email defaults to admin@gopuexports.com", ok: sharedSource.includes('DEFAULT_BUYER_RELEASE_EMAIL = "admin@gopuexports.com"') },
  { name: "demo Sukesh email can release directly", ok: sharedSource.includes('DEMO_BUYER_RELEASE_EMAIL = "sukeshgopu@gmail.com"') },
  { name: "invoice email sender is implemented", ok: sharedSource.includes("async function sendInvoiceEmail") },
  { name: "invoice email attaches PDF", ok: sharedSource.includes("attachments") && sharedSource.includes("buildInvoicePdfBase64") },
  { name: "proforma invoice writes invoice structure", ok: sharedSource.includes("invoice_line_items") && sharedSource.includes("invoice_export_details") }
];

const slackStatus = await getJson("/api/slack/approval");
const catalogStatus = await getJson("/api/cfo/product-catalog");
let approvalResult = null;

if (live) {
  if (!approvalId) {
    approvalResult = { ok: false, status: "missing_live_approval_id", message: "Set LIVE_LEAD_FLOW_APPROVAL_ID to run an actual approval send test." };
  } else {
    approvalResult = await getJson("/api/director/approve-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approval_id: approvalId,
        note: "GOPU OS live flow verification: Director approval -> buyer email -> proforma invoice."
      })
    });
  }
}

const localEnvChecks = [
  {
    name: "Supabase service env present locally",
    ok: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    required: live
  },
  {
    name: "Resend API key present locally",
    ok: Boolean(process.env.RESEND_API_KEY),
    required: live
  }
];

const endpointChecks = [
  { name: "Slack approval endpoint live", ok: slackStatus.httpStatus === 200 && ["live", "error"].includes(slackStatus.body.status) },
  { name: "CFO catalog endpoint live", ok: catalogStatus.httpStatus === 200 && catalogStatus.body.ok === true }
];

const liveChecks = live
  ? [
      { name: "live approval request executed", ok: approvalResult?.body?.ok === true },
      { name: "buyer email attempted", ok: Boolean(approvalResult?.body?.email || approvalResult?.body?.invoice?.email) },
      { name: "proforma invoice created or already present", ok: Boolean(approvalResult?.body?.invoice?.invoice?.invoice_number || approvalResult?.body?.invoice?.status === "already_created") }
    ]
  : [{ name: "live send skipped intentionally", ok: true }];

const result = {
  ok: [...staticChecks, ...endpointChecks, ...liveChecks, ...localEnvChecks.filter((check) => check.required)].every((check) => check.ok),
  mode: live ? "live" : "readiness",
  baseUrl,
  staticChecks,
  endpointChecks,
  localEnvChecks,
  warnings: localEnvChecks.filter((check) => !check.ok).map((check) => `${check.name} is not set in local env; live Vercel env may still be configured.`),
  liveChecks,
  slackStatus: {
    httpStatus: slackStatus.httpStatus,
    status: slackStatus.body.status,
    required_config: slackStatus.body.required_config
  },
  catalog: {
    httpStatus: catalogStatus.httpStatus,
    counts: catalogStatus.body.counts
  },
  approvalResult: approvalResult
    ? {
        httpStatus: approvalResult.httpStatus,
        status: approvalResult.body?.status,
        email: approvalResult.body?.email ? {
          ok: approvalResult.body.email.ok,
          status: approvalResult.body.email.status,
          to: approvalResult.body.email.to,
          release_reason: approvalResult.body.email.release_reason
        } : null,
        invoice: approvalResult.body?.invoice ? {
          ok: approvalResult.body.invoice.ok,
          status: approvalResult.body.invoice.status,
          invoice_number: approvalResult.body.invoice.invoice?.invoice_number,
          buyer_email: approvalResult.body.invoice.invoice?.buyer_email,
          email_status: approvalResult.body.invoice.email?.status || approvalResult.body.invoice.email?.reason
        } : null
      }
    : null
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
