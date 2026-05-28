import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const processedApprovalKeys = new Set<string>();
const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function approvalWebhookUrl() {
  return env("SLACK_APPROVAL_WEBHOOK_URL") || env("SLACK_WEBHOOK_URL");
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function readRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySlackSignature(req: any, rawBody: string) {
  const signingSecret = env("SLACK_SIGNING_SECRET");
  if (!signingSecret) return { ok: false, status: "missing_signing_secret", message: "SLACK_SIGNING_SECRET is missing. Slack approval requests cannot be verified." };
  const signature = String(req.headers["x-slack-signature"] || "");
  const timestamp = String(req.headers["x-slack-request-timestamp"] || "");
  const requestTime = Number(timestamp);
  if (!signature || !timestamp || !Number.isFinite(requestTime)) return { ok: false, status: "invalid_signature", message: "Slack signature headers are missing." };
  if (Math.abs(Math.floor(Date.now() / 1000) - requestTime) > 300) return { ok: false, status: "stale_signature", message: "Slack request timestamp is outside the allowed verification window." };
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  if (!safeEqual(expected, signature)) return { ok: false, status: "invalid_signature", message: "Invalid Slack signature." };
  return { ok: true, status: "verified" };
}

function parsePayload(rawBody: string, contentType = "") {
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    const payload = params.get("payload");
    return payload ? JSON.parse(payload) : Object.fromEntries(params.entries());
  }
  return rawBody ? JSON.parse(rawBody) : {};
}

function safeJsonParse(value: string, fallback: Record<string, unknown> = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function auditLogExists(idempotencyKey: string) {
  const client = getSupabaseClient();
  if (!client || !idempotencyKey) return false;
  const result = await client
    .from("audit_logs")
    .select("id")
    .eq("metadata->>idempotency_key", idempotencyKey)
    .limit(1);
  return !result.error && Array.isArray(result.data) && result.data.length > 0;
}

async function writeApprovalAuditLog(decision: string, details: Record<string, string>) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "not_configured", message: "Supabase server env is missing." };
  if (await auditLogExists(details.idempotency_key)) {
    return { ok: true, status: "duplicate", message: "Audit log already exists for this approval action." };
  }

  const row = {
    tenant_id: details.tenant_id || demoTenantId,
    action_type: decision === "approved" ? "Approval approved" : "Approval rejected",
    module: details.module || "Founder Approval",
    related_table: details.related_table || "slack_approval_requests",
    related_id: details.related_record_id || null,
    actor: "Slack Founder Action",
    description: `Founder approval ${decision} from Slack for ${details.approval_id || "approval request"}.`,
    previous_value: { approval_status: "pending" },
    new_value: { approval_status: decision },
    risk_level: details.risk_level || "Medium",
    metadata: {
      approval_id: details.approval_id || "",
      idempotency_key: details.idempotency_key || "",
      slack_user_id: details.slack_user_id || "",
      slack_action_id: details.slack_action_id || ""
    }
  };

  const result = await client.from("audit_logs").insert(row).select("id,action_type,module,created_at").maybeSingle();
  if (result.error) return { ok: false, status: "db_write_failed", message: result.error.message };
  return { ok: true, status: "inserted", row: result.data };
}

async function upsertSlackIntegrationStatus(status: string, details: Record<string, string> = {}) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "not_configured", message: "Supabase server env is missing." };
  const now = new Date().toISOString();
  const row = {
    platform_key: "slack",
    platform_name: "Slack",
    logo_key: "slack",
    provider: "slack",
    status,
    runtime: "vercel_function",
    error_message: details.error_message || "",
    last_sync_at: now,
    last_checked_at: now,
    metadata: {
      webhook_configured: Boolean(approvalWebhookUrl()),
      approval_webhook_configured: Boolean(approvalWebhookUrl()),
      bot_token_configured: Boolean(env("SLACK_BOT_TOKEN")),
      channel_configured: Boolean(env("SLACK_CHANNEL_ID")),
      signing_secret_configured: Boolean(env("SLACK_SIGNING_SECRET")),
      last_event: details.event || "",
      last_decision: details.decision || "",
      last_approval_id: details.approval_id || ""
    }
  };
  const result = await client.from("platform_integrations").upsert(row, { onConflict: "platform_key" }).select("platform_key,status,error_message,metadata").maybeSingle();
  if (result.error) return { ok: false, status: "db_write_failed", message: result.error.message };
  return { ok: true, row: result.data };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const botTokenConfigured = Boolean(env("SLACK_BOT_TOKEN"));
    const channelConfigured = Boolean(env("SLACK_CHANNEL_ID"));
    const signingSecretConfigured = Boolean(env("SLACK_SIGNING_SECRET"));
    const approvalWebhookConfigured = Boolean(approvalWebhookUrl());
    const live = botTokenConfigured && channelConfigured && signingSecretConfigured && approvalWebhookConfigured;

    res.status(200).json({
      platform_key: "slack",
      platform_name: "Slack Approval",
      provider: "slack",
      status: live ? "live" : "error",
      runtime: "slack_block_kit",
      error_message: live ? null : "Missing Slack approval config.",
      last_success_at: live ? new Date().toISOString() : null,
      required_config: {
        bot_token_configured: botTokenConfigured,
        channel_configured: channelConfigured,
        signing_secret_configured: signingSecretConfigured,
        approval_webhook_configured: approvalWebhookConfigured
      },
      source: "slack_approval_endpoint"
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, status: "method_not_allowed", message: "Use POST for Slack approvals." });
    return;
  }

  const rawBody = await readRawBody(req);
  const verification = verifySlackSignature(req, rawBody);
  if (!verification.ok) {
    res.status(401).json(verification);
    return;
  }

  let payload: any;
  try {
    payload = parsePayload(rawBody, String(req.headers["content-type"] || ""));
  } catch {
    res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid Slack approval payload." });
    return;
  }

  const action = payload.actions?.[0] || {};
  const value = safeJsonParse(String(action.value || ""), {});
  const decision = String((value as any).decision || (action.action_id === "gopu_approval_approve" ? "approved" : action.action_id === "gopu_approval_reject" ? "rejected" : ""));
  if (!["approved", "rejected"].includes(decision)) {
    res.status(400).json({ ok: false, status: "unsupported_action", message: "Slack approval action is not supported." });
    return;
  }

  const fallbackHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const idempotencyKey = String(payload.idempotency_key || action.action_ts || action.value || payload.callback_id || payload.trigger_id || payload.container?.message_ts || fallbackHash);
  if (processedApprovalKeys.has(idempotencyKey)) {
    res.status(200).json({ ok: true, status: "duplicate", message: "Slack approval already processed." });
    return;
  }

  const auditResult = await writeApprovalAuditLog(decision, {
    approval_id: String((value as any).approval_id || ""),
    module: String((value as any).module || "Founder Approval"),
    related_table: String((value as any).related_table || "slack_approval_requests"),
    related_record_id: String((value as any).related_record_id || ""),
    risk_level: String((value as any).risk_level || "Medium"),
    idempotency_key: idempotencyKey,
    slack_user_id: String(payload.user?.id || ""),
    slack_action_id: String(action.action_id || "")
  });
  if (!auditResult.ok) {
    await upsertSlackIntegrationStatus("error", {
      event: "approval_action",
      decision,
      approval_id: String((value as any).approval_id || ""),
      error_message: auditResult.message || "Audit log write failed."
    });
    res.status(200).json({ ok: false, status: "audit_failed", message: auditResult.message || "Audit log write failed." });
    return;
  }

  processedApprovalKeys.add(idempotencyKey);
  const integrationResult = await upsertSlackIntegrationStatus("live", {
    event: "approval_action",
    decision,
    approval_id: String((value as any).approval_id || "")
  });

  res.status(200).json({
    ok: true,
    status: auditResult.status === "duplicate" ? "duplicate" : decision,
    decision,
    audit: auditResult,
    integration: integrationResult,
    message: `Slack approval ${decision}.`
  });
}
