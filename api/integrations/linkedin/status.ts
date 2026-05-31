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

function envInvalid() {
  const invalid: string[] = [];
  const clientId = env("LINKEDIN_CLIENT_ID");
  const clientSecret = env("LINKEDIN_CLIENT_SECRET");
  const redirectUri = env("LINKEDIN_REDIRECT_URI");

  if (clientId && (clientId.includes("=") || /^LINKEDIN_/i.test(clientId) || clientId.length < 5)) invalid.push("LINKEDIN_CLIENT_ID");
  if (clientSecret && (clientSecret.includes("=") || /^LINKEDIN_/i.test(clientSecret) || clientSecret.length < 8)) invalid.push("LINKEDIN_CLIENT_SECRET");
  if (redirectUri) {
    try {
      const parsed = new URL(redirectUri);
      if (!/^https?:$/.test(parsed.protocol)) invalid.push("LINKEDIN_REDIRECT_URI");
    } catch {
      invalid.push("LINKEDIN_REDIRECT_URI");
    }
  }

  return [...new Set(invalid)];
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  const client = getSupabaseClient();
  const missing = envMissing();
  const invalid = envInvalid();
  if (!client) {
    return res.status(200).json({
      ok: true,
      connected: false,
      account_name: null,
      account_email: null,
      expires_at: null,
      scopes: [],
      missing_env: missing,
      invalid_env: invalid,
      status: "supabase_not_configured"
    });
  }

  const { data, error } = await client
    .from("platform_integrations")
    .select("status,metadata,last_checked_at")
    .eq("platform_key", "linkedin_personal")
    .maybeSingle();

  if (error) {
    return res.status(200).json({ ok: false, connected: false, status: "status_read_failed", message: error.message, missing_env: missing, invalid_env: invalid });
  }

  const metadata = data?.metadata || {};
  const expiresAt = metadata.expires_at || metadata.token_expires_at || null;
  const expired = expiresAt ? new Date(expiresAt) <= new Date() : false;
  const connected = Boolean(metadata.access_token && !expired);
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
    missing_env: missing,
    invalid_env: invalid,
    status: connected ? "connected" : env("LINKEDIN_ACCESS_TOKEN") ? "env_token_present_not_oauth_connected" : "not_connected"
  });
}
