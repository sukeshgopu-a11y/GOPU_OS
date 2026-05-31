import { createClient } from "@supabase/supabase-js";

function env(name) {
  return process.env[name]?.trim() || "";
}

function supabaseUrl() {
  return env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
}

function supabaseServiceRoleKey() {
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

function getSupabaseClient() {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getMetaConfig() {
  const pageToken = env("META_PAGE_ACCESS_TOKEN") || env("META_ACCESS_TOKEN");
  const pageId = env("META_PAGE_ID") || env("FACEBOOK_PAGE_ID");
  const instagramBusinessAccountId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  return {
    appId: env("META_APP_ID"),
    appSecret: env("META_APP_SECRET"),
    pageId,
    pageToken,
    instagramBusinessAccountId,
    graphVersion: env("META_GRAPH_VERSION") || "v23.0",
    facebookMissing: [
      env("META_APP_ID") ? "" : "META_APP_ID",
      env("META_APP_SECRET") ? "" : "META_APP_SECRET",
      pageToken ? "" : "META_PAGE_ACCESS_TOKEN",
      pageId ? "" : "META_PAGE_ID"
    ].filter(Boolean),
    instagramMissing: [
      pageToken ? "" : "META_PAGE_ACCESS_TOKEN",
      instagramBusinessAccountId ? "" : "INSTAGRAM_BUSINESS_ACCOUNT_ID"
    ].filter(Boolean)
  };
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown Meta integration error");
  return message
    .replace(/access_token=([^&\s]+)/gi, "access_token=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/|=-]+/gi, "Bearer [redacted]");
}

async function graphGet(path, params = {}) {
  const config = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${path.replace(/^\//, "")}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  url.searchParams.set("access_token", config.pageToken);

  const response = await fetch(url.toString(), { method: "GET", signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: data?.error?.message || `Meta Graph API returned HTTP ${response.status}.`
    };
  }
  return { ok: true, status: response.status, data };
}

async function graphPost(path, body = {}) {
  const config = getMetaConfig();
  const params = new URLSearchParams();
  Object.entries({ ...body, access_token: config.pageToken }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });

  const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: data?.error?.message || `Meta Graph API returned HTTP ${response.status}.`
    };
  }
  return { ok: true, status: response.status, data };
}

async function upsertIntegration(platformKey, patch) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "supabase_not_configured" };

  const now = new Date().toISOString();
  const { data: existing } = await client
    .from("platform_integrations")
    .select("metadata")
    .eq("platform_key", platformKey)
    .maybeSingle();

  const metadata = {
    ...(existing?.metadata || {}),
    ...(patch.metadata || {}),
    last_checked_at: now,
    token_present: Boolean(getMetaConfig().pageToken)
  };

  const { error } = await client.from("platform_integrations").upsert({
    platform_key: platformKey,
    platform_name: patch.platform_name,
    logo_key: patch.logo_key,
    provider: patch.provider,
    status: patch.status,
    runtime: "cmo_publishing",
    error_message: patch.error_message || null,
    last_checked_at: now,
    metadata,
    updated_at: now
  }, { onConflict: "platform_key" });

  return error ? { ok: false, status: "storage_failed", message: error.message } : { ok: true, status: "stored" };
}

export async function verifyFacebookPage() {
  const config = getMetaConfig();
  if (config.facebookMissing.length) {
    await upsertIntegration("facebook_page", {
      platform_name: "Facebook Page",
      logo_key: "facebook",
      provider: "meta",
      status: "missing_credentials",
      error_message: `Missing ${config.facebookMissing.join(", ")}`,
      metadata: { page_id: config.pageId || null, configured: false, missing_env: config.facebookMissing }
    });
    return { ok: true, configured: false, connected: false, missing_env: config.facebookMissing, page_name: null, page_id_matches: false };
  }

  const result = await graphGet(config.pageId, { fields: "id,name" });
  if (!result.ok) {
    const message = safeErrorMessage(result.error);
    await upsertIntegration("facebook_page", {
      platform_name: "Facebook Page",
      logo_key: "facebook",
      provider: "meta",
      status: "error",
      error_message: message,
      metadata: { page_id: config.pageId, configured: true, connected: false, error: message }
    });
    return { ok: true, configured: true, connected: false, missing_env: [], page_name: null, page_id_matches: false, error: message };
  }

  const pageIdMatches = String(result.data?.id || "") === String(config.pageId);
  await upsertIntegration("facebook_page", {
    platform_name: "Facebook Page",
    logo_key: "facebook",
    provider: "meta",
    status: pageIdMatches ? "live" : "error",
    error_message: pageIdMatches ? null : "Facebook page id mismatch.",
    metadata: {
      page_id: result.data?.id || config.pageId,
      configured_page_id: config.pageId,
      page_name: result.data?.name || "",
      configured: true,
      connected: pageIdMatches,
      page_id_matches: pageIdMatches
    }
  });

  return {
    ok: true,
    configured: true,
    connected: pageIdMatches,
    missing_env: [],
    page_id: result.data?.id || null,
    page_name: result.data?.name || null,
    page_id_matches: pageIdMatches
  };
}

export async function verifyInstagramBusinessAccount() {
  const config = getMetaConfig();
  if (config.instagramMissing.length) {
    await upsertIntegration("instagram_business", {
      platform_name: "Instagram Business",
      logo_key: "instagram",
      provider: "meta",
      status: "missing_credentials",
      error_message: `Missing ${config.instagramMissing.join(", ")}`,
      metadata: { instagram_business_account_id: config.instagramBusinessAccountId || null, configured: false, missing_env: config.instagramMissing }
    });
    return { ok: true, configured: false, connected: false, missing_env: config.instagramMissing, username: null };
  }

  const result = await graphGet(config.instagramBusinessAccountId, { fields: "id,username,name" });
  if (!result.ok) {
    const message = safeErrorMessage(result.error);
    await upsertIntegration("instagram_business", {
      platform_name: "Instagram Business",
      logo_key: "instagram",
      provider: "meta",
      status: "error",
      error_message: message,
      metadata: { instagram_business_account_id: config.instagramBusinessAccountId, configured: true, connected: false, error: message }
    });
    return { ok: true, configured: true, connected: false, missing_env: [], username: null, error: message };
  }

  await upsertIntegration("instagram_business", {
    platform_name: "Instagram Business",
    logo_key: "instagram",
    provider: "meta",
    status: "live",
    metadata: {
      instagram_business_account_id: result.data?.id || config.instagramBusinessAccountId,
      username: result.data?.username || "",
      name: result.data?.name || "",
      configured: true,
      connected: true
    }
  });

  return {
    ok: true,
    configured: true,
    connected: true,
    missing_env: [],
    instagram_business_account_id: result.data?.id || null,
    username: result.data?.username || null,
    name: result.data?.name || null
  };
}

export async function publishFacebookPagePost({ message, imageUrl }) {
  const config = getMetaConfig();
  if (config.facebookMissing.length) {
    return { ok: false, status: "missing_credentials", error: `Missing Facebook credentials: ${config.facebookMissing.join(", ")}.` };
  }
  if (!String(message || "").trim()) return { ok: false, status: "missing_content", error: "Facebook post message is empty." };

  const result = imageUrl
    ? await graphPost(`${config.pageId}/photos`, { url: imageUrl, caption: message, published: "true" })
    : await graphPost(`${config.pageId}/feed`, { message });

  if (!result.ok || !result.data?.id) {
    return { ok: false, status: "facebook_api_failed", error: safeErrorMessage(result.error || "Facebook publishing failed.") };
  }

  const postId = String(result.data.id || "");
  return {
    ok: true,
    status: "published",
    provider_post_id: postId,
    post_url: postId ? `https://www.facebook.com/${config.pageId}/posts/${postId.split("_")[1] || postId}` : ""
  };
}

export async function publishInstagramImagePost({ caption, imageUrl }) {
  const config = getMetaConfig();
  if (config.instagramMissing.length) {
    return { ok: false, status: "missing_credentials", error: `Missing Instagram credentials: ${config.instagramMissing.join(", ")}.` };
  }
  if (!String(caption || "").trim()) return { ok: false, status: "missing_content", error: "Instagram caption is empty." };
  if (!String(imageUrl || "").trim()) return { ok: false, status: "missing_media", error: "Instagram image publishing requires an image URL." };

  const container = await graphPost(`${config.instagramBusinessAccountId}/media`, { caption, image_url: imageUrl });
  if (!container.ok || !container.data?.id) {
    return { ok: false, status: "instagram_container_failed", error: safeErrorMessage(container.error || "Instagram media container creation failed.") };
  }

  const published = await graphPost(`${config.instagramBusinessAccountId}/media_publish`, { creation_id: container.data.id });
  if (!published.ok || !published.data?.id) {
    return { ok: false, status: "instagram_publish_failed", error: safeErrorMessage(published.error || "Instagram publish failed.") };
  }

  return {
    ok: true,
    status: "published",
    provider_post_id: String(published.data.id || ""),
    post_url: `https://www.instagram.com/p/${published.data.id}/`
  };
}
