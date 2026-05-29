// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import {
  buildReply,
  isGopuSystemReply,
  isLeadMessage,
  normalizeText,
  processLead,
  sendSlackBotMessage,
  upsertSlackStatus,
} from "./events.js";

const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function slackApi(method: string, params: Record<string, string | number | boolean>) {
  const token = env("SLACK_BOT_TOKEN");
  if (!token) return { ok: false, error: "missing_slack_bot_token" };
  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  return { httpStatus: response.status, ...body };
}

async function alreadyProcessed(text: string) {
  const client = getSupabaseClient();
  if (!client) return false;
  const notes = normalizeText(text);
  const { data } = await client
    .from("lead_intake")
    .select("id")
    .eq("tenant_id", demoTenantId)
    .eq("source", "Slack")
    .eq("notes", notes)
    .limit(1);
  return Boolean(data?.length);
}

async function syncSlackLeads() {
  const channel = env("SLACK_CHANNEL_ID");
  if (!channel) return { ok: false, status: "not_configured", message: "SLACK_CHANNEL_ID is missing." };

  const history = await slackApi("conversations.history", {
    channel,
    limit: 25,
    inclusive: true,
  });

  if (!history.ok) {
    return {
      ok: false,
      status: "slack_history_failed",
      message: history.error || "Slack conversations.history failed.",
      httpStatus: history.httpStatus,
    };
  }

  const messages = Array.isArray(history.messages) ? history.messages : [];
  const candidates = messages
    .filter((message: any) => {
      const text = String(message.text || "");
      return text && isLeadMessage(text) && !isGopuSystemReply(text);
    })
    .reverse();

  const results = [];
  for (const message of candidates) {
    const text = String(message.text || "");
    if (await alreadyProcessed(text)) {
      results.push({ ts: message.ts, status: "skipped_duplicate" });
      continue;
    }

    const event = {
      type: "message",
      channel,
      ts: message.ts,
      thread_ts: message.thread_ts || message.ts,
      user: message.user,
      bot_id: message.bot_id,
      subtype: message.subtype,
    };

    try {
      const result = await processLead(event, text);
      const reply = await sendSlackBotMessage({
        channel,
        thread_ts: message.thread_ts || message.ts,
        text: buildReply(result),
      });
      await upsertSlackStatus(result.issues.length ? "error" : "live", {
        event: "lead_intake_sync",
        approval_id: result.approval.data?.id || "",
        error_message: [...result.issues, reply.ok ? "" : `Slack reply: ${reply.message}`].filter(Boolean).join(" | "),
      });
      results.push({
        ts: message.ts,
        status: result.issues.length ? "partial" : "processed",
        reply_status: reply.status,
        issues: result.issues,
      });
    } catch (error: any) {
      results.push({ ts: message.ts, status: "failed", message: error?.message || "Unknown sync failure" });
    }
  }

  return { ok: true, status: "synced", checked: messages.length, candidates: candidates.length, results };
}

export default async function handler(req: any, res: any) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const result = await syncSlackLeads();
  return res.status(result.ok ? 200 : 500).json(result);
}
