import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { LINKEDIN_KNOWLEDGE_HUB_ENTRY } from "../lib/cmoLinkedInRules.mjs";

const root = process.cwd();
const defaultTenantId = "11111111-1111-1111-1111-111111111111";

function loadEnv() {
  for (const file of [".env", ".env.development", ".env.local"]) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) continue;
    for (const row of fs.readFileSync(target, "utf8").split(/\r?\n/)) {
      const match = row.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (value && !process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}

function env(name) {
  return process.env[name]?.trim() || "";
}

loadEnv();

const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const executiveKnowledgePayload = {
  tenant_id: env("DEMO_TENANT_ID") || defaultTenantId,
  ...LINKEDIN_KNOWLEDGE_HUB_ENTRY,
  source_metadata: {
    ...LINKEDIN_KNOWLEDGE_HUB_ENTRY.source_metadata,
    seeded_by: "scripts/seed-linkedin-knowledge-hub-style.mjs",
    seeded_at: new Date().toISOString()
  }
};

const result = await client
  .from("executive_knowledge")
  .upsert(executiveKnowledgePayload, { onConflict: "role,knowledge_key" })
  .select("id,role,platform,knowledge_key,updated_at")
  .maybeSingle();

if (!result.error) {
  console.log(JSON.stringify({ ok: true, table: "executive_knowledge", knowledge: result.data }, null, 2));
} else if (/executive_knowledge|schema cache|does not exist/i.test(result.error.message || "")) {
  const promptKey = LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_key;
  const memoryPayload = {
    tenant_id: env("DEMO_TENANT_ID") || defaultTenantId,
    platform: "LinkedIn",
    prompt: promptKey,
    generated_version: LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_value,
    approved_version: LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_value,
    performance_summary: "Permanent LinkedIn default style from founder-uploaded reference images. Applies only to LinkedIn; Instagram and Facebook unchanged.",
    campaign_impact: `LinkedIn creatives use educational export knowledge-post style with subtle GOPU Exports logo, ${LINKEDIN_KNOWLEDGE_HUB_ENTRY.hashtags.join(" ")} hashtags, and Slack Founder/Director approval before publishing.`,
    ai_reasoning: LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_value
  };
  const existing = await client.from("ai_content_memory").select("id").eq("platform", "LinkedIn").eq("prompt", promptKey).limit(1).maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") throw new Error(existing.error.message);
  const memoryResult = existing.data?.id
    ? await client.from("ai_content_memory").update(memoryPayload).eq("id", existing.data.id).select("id,platform,prompt").maybeSingle()
    : await client.from("ai_content_memory").insert(memoryPayload).select("id,platform,prompt").maybeSingle();
  if (memoryResult.error) throw new Error(memoryResult.error.message);
  console.log(JSON.stringify({ ok: true, table: "ai_content_memory", knowledge: memoryResult.data }, null, 2));
} else {
  throw new Error(result.error.message);
}
