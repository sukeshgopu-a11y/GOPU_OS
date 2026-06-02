import { getCtoProviderSecret } from "./ctoProviderVault.mjs";
import { getCanvaConnectionStatus } from "./cmoCanvaWorkflow.mjs";

const CACHE_TTL_MS = Number(process.env.CREATIVE_STATUS_CACHE_TTL_MS || 60000);
const CHECK_TIMEOUT_MS = Number(process.env.CREATIVE_STATUS_TIMEOUT_MS || 8000);
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

let cachedStatus = null;
let cachedAt = 0;

function providerStatus(status, details = {}) {
  return {
    status,
    ...details,
    error_message: details.error_message || null
  };
}

function withTimeout(ms = CHECK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timeout) };
}

function safeImageError(response, body = {}, timeout = false) {
  if (timeout) return "Generation timeout";
  const code = String(body?.error?.code || body?.error?.type || "").toLowerCase();
  if (response?.status === 401 || response?.status === 403) return "Invalid provider credentials";
  if (code.includes("invalid") || code.includes("auth")) return "Invalid provider credentials";
  if (response && response.status >= 500) return "Image provider unavailable";
  return "API request failed";
}

async function checkOpenAICreativeProvider() {
  const providerSecret = getCtoProviderSecret("openai");
  if (!providerSecret.ok) {
    return providerStatus("error", {
      provider: "OpenAI Creative",
      latency_ms: null,
      error_message: "OpenAI key missing in CTO provider vault."
    });
  }
  const apiKey = providerSecret.secret;

  const started = Date.now();
  const { controller, clear } = withTimeout();

  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(OPENAI_IMAGE_MODEL)}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const latency = Date.now() - started;
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return providerStatus("error", {
        provider: "OpenAI Creative",
        latency_ms: latency,
        error_message: safeImageError(response, body)
      });
    }

    return providerStatus("live", {
      provider: "OpenAI Creative",
      latency_ms: latency
    });
  } catch (error) {
    return providerStatus("error", {
      provider: "OpenAI Creative",
      latency_ms: Date.now() - started,
      error_message: error?.name === "AbortError" ? "Generation timeout" : "API request failed"
    });
  } finally {
    clear();
  }
}

async function checkSharpPipeline() {
  try {
    const sharpModule = await import("sharp").catch(() => null);
    const sharp = sharpModule?.default;
    if (!sharp) {
      return providerStatus("error", {
        version: null,
        error_message: "Sharp package missing"
      });
    }

    const logo = await sharp({
      create: {
        width: 96,
        height: 32,
        channels: 4,
        background: { r: 4, g: 18, b: 24, alpha: 0.8 }
      }
    })
      .png()
      .toBuffer();

    const output = await sharp({
      create: {
        width: 160,
        height: 160,
        channels: 4,
        background: { r: 8, g: 13, b: 18, alpha: 1 }
      }
    })
      .composite([{ input: logo, left: 48, top: 112 }])
      .png()
      .toBuffer();

    if (!output?.length) {
      return providerStatus("error", {
        version: sharp.versions?.sharp || "latest",
        error_message: "Asset processing failed"
      });
    }

    return providerStatus("live", {
      version: sharp.versions?.sharp || "latest"
    });
  } catch {
    return providerStatus("error", {
      version: null,
      error_message: "Sharp render failure"
    });
  }
}

function firstProviderError(providers) {
  return Object.values(providers).find((provider) => provider.status === "error")?.error_message || null;
}

export async function getCreativeEngineStatus({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedStatus && now - cachedAt < CACHE_TTL_MS) {
    return cachedStatus;
  }

  const [openaiCreative, sharp, canva] = await Promise.all([
    checkOpenAICreativeProvider(),
    checkSharpPipeline(),
    getCanvaConnectionStatus()
  ]);

  const providers = {
    openai_creative: openaiCreative,
    sharp,
    canva
  };
  const posterComposerLive = canva.status === "live" || canva.status === "configured";
  const posterComposerPending = openaiCreative.status === "pending" || sharp.status === "pending";
  const status = posterComposerLive ? "live" : posterComposerPending ? "pending" : "error";
  const lastSuccessAt = posterComposerLive ? new Date().toISOString() : null;

  cachedStatus = {
    platform_key: "creative_engine",
    platform_name: "Poster & Creative Engine",
    status,
    providers,
    last_success_at: lastSuccessAt,
    render_pipeline: {
      poster_generation: canva.status === "live" || canva.status === "configured",
      logo_stamping: Boolean(canva.logo_asset_id || canva.templates),
      canva_autofill: canva.status === "live" || canva.status === "configured",
      canva_export: canva.status === "live" || canva.status === "configured",
      ai_image_text_disabled: true,
      video_generation: false,
      video_generation_required_for_step_3: false
    },
    error_message: status === "live" ? null : firstProviderError({ canva, openaiCreative, sharp })
  };
  cachedAt = now;
  return cachedStatus;
}
