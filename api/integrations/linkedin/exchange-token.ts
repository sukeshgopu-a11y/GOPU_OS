// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function normalizeBody(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function missingEnv() {
  return ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"]
    .filter((name) => !env(name));
}

async function saveAccessToken(accessToken: string, expiresIn: number | null, scope: string) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "supabase_not_configured" };

  const now = new Date();
  const expiresAt = expiresIn ? new Date(now.getTime() + Number(expiresIn) * 1000).toISOString() : null;
  const { data: existing } = await client
    .from("platform_integrations")
    .select("config,metadata")
    .eq("platform_key", "linkedin_personal")
    .maybeSingle();

  const config = {
    ...(existing?.config || {}),
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    scope
  };
  const metadata = {
    ...(existing?.metadata || {}),
    required_scope: "w_member_social",
    token_saved_at: now.toISOString(),
    token_expires_at: expiresAt,
    scope
  };

  const { error } = await client.from("platform_integrations").upsert({
    tenant_id: DEMO_TENANT_ID,
    platform: "LinkedIn Personal",
    platform_key: "linkedin_personal",
    platform_name: "LinkedIn Personal",
    logo_key: "linkedin",
    provider: "linkedin",
    status: "pending",
    runtime: "cmo_publishing",
    connection_status: "token_saved",
    access_token_present: true,
    configured_at: now.toISOString(),
    last_checked_at: now.toISOString(),
    config,
    metadata,
    updated_at: now.toISOString()
  }, { onConflict: "platform_key" });

  return error ? { ok: false, status: "storage_failed", message: error.message } : { ok: true, status: "saved" };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const body = normalizeBody(req);
    const code = String(body.code || "").trim();
    if (!code) return res.status(200).json({ ok: false, status: "missing_code", message: "LinkedIn authorization code is required." });

    const missing = missingEnv();
    if (missing.length) {
      return res.status(200).json({ ok: false, status: "missing_env", missing });
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env("LINKEDIN_REDIRECT_URI"),
      client_id: env("LINKEDIN_CLIENT_ID"),
      client_secret: env("LINKEDIN_CLIENT_SECRET")
    });

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token) {
      return res.status(200).json({
        ok: false,
        status: "linkedin_exchange_failed",
        message: result.error_description || result.error || `LinkedIn token exchange failed with HTTP ${response.status}.`
      });
    }

    process.env.LINKEDIN_ACCESS_TOKEN = String(result.access_token || "");
    const storage = await saveAccessToken(
      String(result.access_token || ""),
      result.expires_in ? Number(result.expires_in) : null,
      String(result.scope || "")
    );

    return res.status(200).json({
      access_token: result.access_token,
      expires_in: result.expires_in || null,
      scope: result.scope || "",
      storage
    });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      status: "failed_safely",
      message: error?.message || "LinkedIn token exchange failed safely."
    });
  }
}
