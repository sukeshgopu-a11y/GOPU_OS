// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { getLinkedInPersonalEnvStatus, publishLinkedInPersonalPost } from "../../src/server/integrations/linkedinPersonal";
import { ensureLinkedInPostRules, validateLinkedInPublishText } from "../../lib/cmoLinkedInRules.mjs";

const BLOCKED_MESSAGE = "LinkedIn personal publish blocked: Founder/Director approval required";
const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

export function normalizeBody(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

export function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isApproved(value: unknown): boolean {
  return ["approved", "approve", "approved for release"].includes(String(value || "").trim().toLowerCase());
}

function selectedText(row: any, fallback = ""): string {
  return String(row?.final_approved_content || row?.final_text || row?.caption || row?.generated_text || fallback || "").trim();
}

export async function logLinkedInPersonalPublish(client: any, payload: any) {
  if (!client) return { ok: false, skipped: true };
  try {
    const insert = await client.from("social_publish_logs").insert({
      tenant_id: payload.tenant_id || DEMO_TENANT_ID,
      content_history_id: payload.content_history_id || null,
      founder_approval_id: payload.founder_approval_id || null,
      platform: "linkedin_personal",
      content_text: payload.content_text || "",
      media_url: payload.media_url || null,
      status: payload.status,
      linkedin_post_id: payload.linkedin_post_id || null,
      linkedin_post_urn: payload.linkedin_post_urn || null,
      error_message: payload.error_message || null,
      metadata: payload.metadata || {}
    }).select("id").maybeSingle();
    return insert.error ? { ok: false, error: insert.error.message } : { ok: true, id: insert.data?.id || null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "social publish log failed" };
  }
}

export async function resolveApprovedPublishPayload(client: any, payload: any) {
  const contentHistoryId = String(payload.content_history_id || payload.contentHistoryId || "").trim();
  const approvalId = String(payload.approval_id || payload.founder_approval_id || payload.approvalId || "").trim();
  let content: any = null;
  let approval: any = null;

  if (contentHistoryId) {
    const { data, error } = await client
      .from("content_history")
      .select("*")
      .eq("id", contentHistoryId)
      .maybeSingle();
    if (error) return { ok: false, status: "content_read_failed", message: error.message };
    content = data;
  }

  if (approvalId) {
    const { data, error } = await client
      .from("founder_approvals")
      .select("*")
      .eq("id", approvalId)
      .maybeSingle();
    if (error) return { ok: false, status: "approval_read_failed", message: error.message };
    approval = data;
  }

  const contentApproved = content && isApproved(content.approval_status);
  const approvalApproved = approval && (isApproved(approval.status) || isApproved(approval.approval_status));

  if (!contentApproved && !approvalApproved) {
    await logLinkedInPersonalPublish(client, {
      tenant_id: content?.tenant_id || approval?.tenant_id || payload.tenant_id || DEMO_TENANT_ID,
      content_history_id: content?.id || contentHistoryId || null,
      founder_approval_id: approval?.id || approvalId || null,
      content_text: selectedText(content, payload.text),
      media_url: payload.media_url || payload.mediaUrl || null,
      status: "blocked",
      error_message: BLOCKED_MESSAGE,
      metadata: { reason: "missing_founder_director_approval" }
    });
    return { ok: false, status: "blocked", message: BLOCKED_MESSAGE, content, approval };
  }

  return {
    ok: true,
    content,
    approval,
    tenant_id: content?.tenant_id || approval?.tenant_id || payload.tenant_id || DEMO_TENANT_ID,
    text: selectedText(content, payload.text),
    mediaUrl: payload.media_url || payload.mediaUrl || content?.image_url || ""
  };
}

export async function publishApprovedLinkedInPersonal(payload: any) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "not_configured", message: "Supabase server env is missing." };

  const gate = await resolveApprovedPublishPayload(client, payload);
  if (!gate.ok) return gate;
  const preparedText = ensureLinkedInPostRules(gate.text, { platform: "LinkedIn Personal" }).text;
  if (!preparedText) {
    await logLinkedInPersonalPublish(client, {
      tenant_id: gate.tenant_id,
      content_history_id: gate.content?.id || null,
      founder_approval_id: gate.approval?.id || null,
      status: "failed",
      error_message: "LinkedIn personal publish failed: content text is empty."
    });
    return { ok: false, status: "missing_content", message: "LinkedIn personal publish failed: content text is empty." };
  }
  const validation = validateLinkedInPublishText(preparedText);
  if (!validation.ok) return { ok: false, status: validation.status, message: validation.error };

  await logLinkedInPersonalPublish(client, {
    tenant_id: gate.tenant_id,
    content_history_id: gate.content?.id || null,
    founder_approval_id: gate.approval?.id || null,
    content_text: preparedText,
    media_url: gate.mediaUrl || null,
    status: "pending",
    metadata: { approval_guard: "passed" }
  });

  const result = await publishLinkedInPersonalPost({ text: preparedText, mediaUrl: gate.mediaUrl });
  const status = result.ok ? "published" : "failed";
  await logLinkedInPersonalPublish(client, {
    tenant_id: gate.tenant_id,
    content_history_id: gate.content?.id || null,
    founder_approval_id: gate.approval?.id || null,
    content_text: result.text || preparedText,
    media_url: gate.mediaUrl || null,
    status,
    linkedin_post_id: result.post_id || null,
    linkedin_post_urn: result.post_urn || null,
    error_message: result.ok ? null : result.error || "LinkedIn personal publish failed.",
    metadata: { provider_status: result.status || status }
  });

  if (gate.content?.id) {
    await client.from("content_history").update({
      platform: "linkedin_personal",
      publish_status: result.ok ? "published" : "failed",
      live_post_url: result.post_url || gate.content.live_post_url || null,
      post_url: result.post_url || gate.content.post_url || null,
      published_at: result.ok ? new Date().toISOString() : gate.content.published_at || null,
      last_publish_error: result.ok ? null : result.error || "LinkedIn personal publish failed.",
      metadata: {
        ...(gate.content.metadata || {}),
        linkedin_personal_post_id: result.post_id || null,
        linkedin_personal_post_urn: result.post_urn || null,
        linkedin_personal_publish_status: result.status || status
      }
    }).eq("id", gate.content.id);
  }

  return result.ok
    ? { ok: true, status: "published", platform: "linkedin_personal", post_id: result.post_id, post_urn: result.post_urn, post_url: result.post_url }
    : { ok: false, status: result.status || "failed", message: result.error || "LinkedIn personal publish failed." };
}

export function linkedinPersonalStatusPayload() {
  const status = getLinkedInPersonalEnvStatus();
  return {
    ok: true,
    ...status,
    status: status.configured ? "configured" : "not_configured"
  };
}

export { BLOCKED_MESSAGE };
