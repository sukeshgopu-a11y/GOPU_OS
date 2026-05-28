import { createClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = Number(process.env.SUPABASE_STORAGE_STATUS_CACHE_TTL_MS || 30000);
const CHECK_TIMEOUT_MS = Number(process.env.SUPABASE_STORAGE_STATUS_TIMEOUT_MS || 10000);
const DEFAULT_BUCKET = "cmo-generated-assets";
const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

let cachedStatus = null;
let cachedAt = 0;

function env(name) {
  return process.env[name]?.trim() || "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getSupabaseServiceKey() {
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

function getStorageBucket() {
  return env("SUPABASE_STORAGE_BUCKET") || DEFAULT_BUCKET;
}

function baseStatus(status, details = {}) {
  return {
    platform_key: "supabase-storage",
    platform_name: "Supabase Storage",
    status,
    bucket: details.bucket || getStorageBucket(),
    latency_ms: details.latency_ms ?? null,
    last_success_at: details.last_success_at || null,
    error_message: details.error_message || null,
    outputs: ["Poster asset public URL", "Generated image public URL"],
    health: {
      upload: Boolean(details.health?.upload),
      public_url: Boolean(details.health?.public_url),
      signed_url: Boolean(details.health?.signed_url)
    },
    source: "supabase_storage_health_endpoint"
  };
}

function safeStorageError(error, fallback = "Supabase Storage health check failed") {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("bucket") && (message.includes("not found") || message.includes("does not exist"))) {
    return "Supabase Storage bucket missing";
  }
  if (message.includes("permission") || message.includes("policy") || message.includes("row-level") || message.includes("rls")) {
    return "Supabase Storage policy blocked upload or retrieval";
  }
  if (message.includes("jwt") || message.includes("api key") || message.includes("unauthorized")) {
    return "Supabase service role key is invalid";
  }
  return fallback;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFetchUrl(url) {
  if (!url) return false;
  try {
    const response = await fetchWithTimeout(url);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getSupabaseStorageStatus({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedStatus && now - cachedAt < CACHE_TTL_MS) {
    return cachedStatus;
  }

  const started = Date.now();
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceKey();
  const bucket = getStorageBucket();

  if (!supabaseUrl) {
    cachedStatus = baseStatus("error", {
      bucket,
      error_message: "Missing Supabase project URL"
    });
    cachedAt = now;
    return cachedStatus;
  }

  if (!serviceRoleKey) {
    cachedStatus = baseStatus("error", {
      bucket,
      error_message: "Missing Supabase service role key"
    });
    cachedAt = now;
    return cachedStatus;
  }

  if (!bucket) {
    cachedStatus = baseStatus("error", {
      bucket,
      error_message: "Missing SUPABASE_STORAGE_BUCKET"
    });
    cachedAt = now;
    return cachedStatus;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const testPath = `_health/cmo-storage-${Date.now()}.png`;
  const health = { upload: false, public_url: false, signed_url: false };

  try {
    const uploadResult = await client.storage
      .from(bucket)
      .upload(testPath, Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"), {
        contentType: "image/png",
        upsert: false
      });

    if (uploadResult.error) {
      cachedStatus = baseStatus("error", {
        bucket,
        latency_ms: Date.now() - started,
        error_message: safeStorageError(uploadResult.error, "Supabase Storage upload failed"),
        health
      });
      cachedAt = now;
      return cachedStatus;
    }

    health.upload = true;

    const publicResult = client.storage.from(bucket).getPublicUrl(testPath);
    health.public_url = await tryFetchUrl(publicResult.data?.publicUrl);

    if (!health.public_url) {
      const signedResult = await client.storage.from(bucket).createSignedUrl(testPath, 60);
      health.signed_url = await tryFetchUrl(signedResult.data?.signedUrl);
    }

    await client.storage.from(bucket).remove([testPath]).catch(() => {});

    if (!health.public_url) {
      cachedStatus = baseStatus("error", {
        bucket,
        latency_ms: Date.now() - started,
        error_message: "Supabase Storage upload works but public retrieval failed",
        health
      });
      cachedAt = now;
      return cachedStatus;
    }

    cachedStatus = baseStatus("live", {
      bucket,
      latency_ms: Date.now() - started,
      last_success_at: new Date().toISOString(),
      health
    });
    cachedAt = now;
    return cachedStatus;
  } catch (error) {
    await client.storage.from(bucket).remove([testPath]).catch(() => {});
    cachedStatus = baseStatus("error", {
      bucket,
      latency_ms: Date.now() - started,
      error_message: safeStorageError(error),
      health
    });
    cachedAt = now;
    return cachedStatus;
  }
}
