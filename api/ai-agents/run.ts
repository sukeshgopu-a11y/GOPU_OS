// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { buildReply, processLead, sendSlackBotMessage } from "../slack/events.js";

const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getLead(client: any, leadId: string) {
  const { data, error } = await client
    .from("lead_intake")
    .select("*")
    .eq("tenant_id", demoTenantId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function leadToSlackText(lead: any) {
  return [
    `Lead ${lead.buyer_name || lead.company_name || "Slack lead"}`,
    lead.country ? `Country ${lead.country}` : "",
    lead.destination_port ? `Destination ${lead.destination_port}` : "",
    lead.product ? `Product ${lead.product}` : "",
    lead.quantity ? `Quantity ${lead.quantity} ${lead.unit || "mt"}` : "",
    lead.email ? `Email ${lead.email}` : "",
    lead.incoterm ? `Incoterm ${lead.incoterm}` : "",
  ].filter(Boolean).join("\n");
}

export default async function handler(req: any, res: any) {
  if (!["POST", "GET"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  try {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ ok: false, status: "not_configured", message: "Supabase server env is missing." });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const url = new URL(req.url || "/api/ai-agents/run", "https://gopu-os-cmo.vercel.app");
    const leadId = body.lead_id || body.leadId || url.searchParams.get("lead_id");
    const taskId = body.task_id || body.taskId || url.searchParams.get("task_id");

    let lead = leadId ? await getLead(client, leadId) : null;
    if (!lead && taskId) {
      const { data: task, error } = await client.from("tasks").select("*").eq("tenant_id", demoTenantId).eq("id", taskId).maybeSingle();
      if (error) throw error;
      if (task?.linked_record_id) lead = await getLead(client, task.linked_record_id);
    }
    if (!lead) return res.status(404).json({ ok: false, status: "lead_not_found", message: "Lead id or AI agent task id is required." });

    const result = await processLead({ channel: env("SLACK_CHANNEL_ID"), ts: lead.source_thread_ts || "" }, leadToSlackText(lead), { force: true });
    const shouldReply = body.reply === true || url.searchParams.get("reply") === "true";
    let slackReply = null;
    if (shouldReply) {
      slackReply = await sendSlackBotMessage({ channel: env("SLACK_CHANNEL_ID"), text: buildReply(result) });
    }

    return res.status(200).json({
      ok: result.issues.length === 0,
      status: result.issues.length ? "partial" : "rerun_complete",
      lead_id: lead.id,
      approval_id: result.approval.data?.id || null,
      issues: result.issues,
      slack_reply: slackReply,
      agent_runs: result.agentRuns?.map((item: any) => ({ agent: item.run?.agent_name || item.task?.owner_command, status: item.status })) || [],
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, status: "failed", message: error?.message || "AI agent rerun failed." });
  }
}
