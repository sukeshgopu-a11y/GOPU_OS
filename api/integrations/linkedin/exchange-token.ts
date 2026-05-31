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

function invalidEnv() {
  const invalid: string[] = [];
  const clientId = env("LINKEDIN_CLIENT_ID");
  const clientSecret = env("LINKEDIN_CLIENT_SECRET");
  const redirectUri = env("LINKEDIN_REDIRECT_URI");

  if (clientId.includes("=") || /^LINKEDIN_/i.test(clientId) || clientId.length < 5) invalid.push("LINKEDIN_CLIENT_ID");
  if (clientSecret.includes("=") || /^LINKEDIN_/i.test(clientSecret) || clientSecret.length < 8) invalid.push("LINKEDIN_CLIENT_SECRET");
  try {
    const parsed = new URL(redirectUri);
    if (!/^https?:$/.test(parsed.protocol)) invalid.push("LINKEDIN_REDIRECT_URI");
  } catch {
    invalid.push("LINKEDIN_REDIRECT_URI");
  }

  return [...new Set(invalid)];
}

async function fetchLinkedInProfile(accessToken: string) {
  try {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000)
    });
    const profile = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, profile: {}, status: response.status };
    return { ok: true, profile, status: response.status };
  } catch {
    return { ok: false, profile: {}, status: 0 };
  }
}

async function saveAccessToken(accessToken: string, expiresIn: number | null, scope: string, profile: Record<string, unknown> = {}) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "supabase_not_configured" };

  const now = new Date();
  const expiresAt = expiresIn ? new Date(now.getTime() + Number(expiresIn) * 1000).toISOString() : null;
  const { data: existing } = await client
    .from("platform_integrations")
    .select("metadata")
    .eq("platform_key", "linkedin_personal")
    .maybeSingle();

  const linkedinUserId = String(profile.sub || profile.id || "").trim();
  const linkedinName = String(profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || "").trim();
  const linkedinEmail = String(profile.email || "").trim();
  const existingMetadata = existing?.metadata || {};
  const metadata = {
    ...existingMetadata,
    required_scope: "w_member_social",
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_saved_at: now.toISOString(),
    token_expires_at: expiresAt,
    scope,
    linkedin_user_id: linkedinUserId || existingMetadata.linkedin_user_id || "",
    linkedin_name: linkedinName || existingMetadata.linkedin_name || "",
    linkedin_email: linkedinEmail || existingMetadata.linkedin_email || "",
    connected_at: now.toISOString()
  };

  const { error } = await client.from("platform_integrations").upsert({
    tenant_id: DEMO_TENANT_ID,
    platform: "LinkedIn Personal",
    platform_key: "linkedin_personal",
    platform_name: "LinkedIn Personal",
    logo_key: "linkedin",
    provider: "linkedin_personal",
    status: "live",
    runtime: "cmo_publishing",
    last_checked_at: now.toISOString(),
    metadata,
    updated_at: now.toISOString()
  }, { onConflict: "platform_key" });

  return error ? { ok: false, status: "storage_failed", message: error.message } : { ok: true, status: "saved", profile_saved: Boolean(linkedinUserId || linkedinName || linkedinEmail) };
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
    const invalid = invalidEnv();
    if (invalid.length) {
      return res.status(200).json({
        ok: false,
        status: "invalid_env",
        invalid,
        message: "LinkedIn OAuth environment values are blank, malformed, or placeholders. Add the real LinkedIn app values and generate a fresh authorization code."
      });
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
    const profileResult = await fetchLinkedInProfile(String(result.access_token || ""));
    const storage = await saveAccessToken(
      String(result.access_token || ""),
      result.expires_in ? Number(result.expires_in) : null,
      String(result.scope || ""),
      profileResult.profile || {}
    );

    return res.status(200).json({
      ok: true,
      expires_in: result.expires_in || null,
      scope: result.scope || "",
      connected: storage.ok === true,
      profile_saved: storage.profile_saved === true,
      storage: { ok: storage.ok, status: storage.status }
    });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      status: "failed_safely",
      message: error?.message || "LinkedIn token exchange failed safely."
    });
  }
}
