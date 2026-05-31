// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const BLOCKED_MESSAGE = "LinkedIn personal publish blocked: Founder/Director approval required";
const DEFAULT_TEXT = "🚀 GOPU OS LinkedIn integration connected successfully.\n\n#GopuExports\n#Exports\n#InternationalTrade";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeBody(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

function isApproved(value: unknown): boolean {
  return ["approved", "approve", "approved for release"].includes(String(value || "").trim().toLowerCase());
}

async function hasApproval(client: any, payload: any) {
  const contentHistoryId = String(payload.content_history_id || "").trim();
  const approvalId = String(payload.approval_id || payload.founder_approval_id || "").trim();
  if (contentHistoryId) {
    const { data } = await client.from("content_history").select("approval_status").eq("id", contentHistoryId).maybeSingle();
    if (isApproved(data?.approval_status)) return true;
  }
  if (approvalId) {
    const { data } = await client.from("founder_approvals").select("status,approval_status").eq("id", approvalId).maybeSingle();
    if (isApproved(data?.status) || isApproved(data?.approval_status)) return true;
  }
  return false;
}

async function readStoredToken(client: any) {
  const { data, error } = await client
    .from("platform_integrations")
    .select("metadata")
    .eq("platform_key", "linkedin_personal")
    .maybeSingle();
  if (error) return "";
  return String(data?.metadata?.access_token || env("LINKEDIN_ACCESS_TOKEN") || "").trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  const payload = normalizeBody(req);
  const client = getSupabaseClient();
  if (!client) return res.status(200).json({ ok: false, status: "not_configured", message: "Supabase server env is missing." });
  if (!(await hasApproval(client, payload))) {
    return res.status(200).json({ ok: false, status: "blocked", message: BLOCKED_MESSAGE });
  }

  const token = await readStoredToken(client);
  if (!token) return res.status(200).json({ ok: false, status: "not_connected", message: "LinkedIn personal access token is not connected." });

  const text = String(payload.text || DEFAULT_TEXT).trim();
  return res.status(200).json({
    ok: false,
    status: "not_published",
    message: "LinkedIn test-post endpoint is approval-gated and token-ready, but direct test publishing is disabled in this temporary endpoint."
  });
}
