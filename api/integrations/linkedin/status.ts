// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function envMissing() {
  return ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"]
    .filter((name) => !env(name));
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  const client = getSupabaseClient();
  const missing = envMissing();
  if (!client) {
    return res.status(200).json({
      ok: true,
      connected: Boolean(env("LINKEDIN_ACCESS_TOKEN")),
      account_name: null,
      account_email: null,
      expires_at: null,
      scopes: [],
      missing_env: missing
    });
  }

  const { data, error } = await client
    .from("platform_integrations")
    .select("status,metadata,last_checked_at")
    .eq("platform_key", "linkedin_personal")
    .maybeSingle();

  if (error) {
    return res.status(200).json({ ok: false, connected: false, status: "status_read_failed", message: error.message, missing_env: missing });
  }

  const metadata = data?.metadata || {};
  const expiresAt = metadata.expires_at || metadata.token_expires_at || null;
  const expired = expiresAt ? new Date(expiresAt) <= new Date() : false;
  const connected = Boolean((metadata.access_token || env("LINKEDIN_ACCESS_TOKEN")) && !expired);
  const scopes = String(metadata.scope || "")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return res.status(200).json({
    ok: true,
    connected,
    account_name: metadata.linkedin_name || null,
    account_email: metadata.linkedin_email || null,
    expires_at: expiresAt,
    scopes,
    missing_env: missing
  });
}
