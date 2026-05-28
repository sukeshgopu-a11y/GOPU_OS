import { loadLocalEnv, getSupabaseServiceClient } from "../lib/learningCentreDb.mjs";

loadLocalEnv();

const topics = {
  COO: ["logistics", "supply chain", "warehouse systems", "export operations", "SOPs", "operational scaling", "procurement systems", "workflow optimization"],
  CFO: ["cash flow", "scaling finance", "margin optimization", "export economics", "budgeting", "risk management", "operational finance", "business scaling"],
  CTO: ["AI agents", "SaaS scaling", "automation systems", "cloud architecture", "security", "infrastructure", "orchestration", "API systems"],
  CMO: ["B2B marketing", "export branding", "LinkedIn growth", "international trade marketing", "content psychology", "founder branding", "conversion systems", "social growth"],
  CIO: ["analytics", "business intelligence", "dashboards", "information systems", "data organization", "reporting systems", "decision intelligence"]
};

const client = getSupabaseServiceClient();
const rows = Object.entries(topics).flatMap(([role, values]) => values.map((topic, index) => ({
  role,
  topic,
  priority: index < 2 ? 5 : index < 5 ? 4 : 3,
  active: true
})));

const { data, error } = await client
  .from("executive_topics")
  .upsert(rows, { onConflict: "role,topic" })
  .select("id,role,topic,priority");

if (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, seeded: data?.length || 0 }, null, 2));
