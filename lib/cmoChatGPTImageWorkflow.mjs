import { getCtoProviderSecret } from "./ctoProviderVault.mjs";

const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_BUCKET = "cmo-generated-assets";
const DEFAULT_IMAGE_SIZE = "1024x1536";
const DEFAULT_IMAGE_QUALITY = "high";

export const CMO_BRAND = {
  company_name: "GOPU EXPORTS",
  website: "www.gopuexports.com",
  linkedin_page_name: "GOPU Exports",
  tagline: "Global Trade - Spices - Rice - Agricultural Products",
  colors: {
    navy: "#0D2A4A",
    gold: "#D4AF37",
    white: "#FFFFFF"
  }
};

// Keep legacy alias for any remaining references
export const CMO_CANVA_BRAND = CMO_BRAND;

export const CMO_IMAGE_CONTENT_TYPES = {
  knowledge_carousel: { label: "Knowledge Carousel" },
  shipment_announcement: { label: "Shipment Announcement" },
  market_update: { label: "Market Update" },
  product_spotlight: { label: "Product Spotlight" },
  buyer_education: { label: "Buyer Education" }
};

// Keep legacy alias
export const CMO_CANVA_TEMPLATE_TYPES = Object.fromEntries(
  Object.entries(CMO_IMAGE_CONTENT_TYPES).map(([k, v]) => [k, { ...v, env: `CHATGPT_IMAGE_${k.toUpperCase()}_TEMPLATE` }])
);

function env(name) {
  return process.env[name]?.trim() || "";
}

function nowIso() {
  return new Date().toISOString();
}

function text(value, fallback = "") {
  return String(value || fallback).trim();
}

function metadata(row = {}) {
  return row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
}

function selectedCaption(row = {}) {
  return text(row.final_approved_content || row.final_text || row.caption || row.generated_text);
}

function safeStorageSlug(value = "") {
  return text(value, String(Date.now()))
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || String(Date.now());
}

function storageBucket() {
  return env("SUPABASE_STORAGE_BUCKET") || DEFAULT_BUCKET;
}

function normalizeContentType(value = "") {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (key === "carousel" || key === "knowledge") return "knowledge_carousel";
  if (key === "shipment" || key === "shipment_post") return "shipment_announcement";
  if (key === "market" || key === "price_update") return "market_update";
  if (key === "product" || key === "spotlight") return "product_spotlight";
  if (key === "buyer" || key === "education") return "buyer_education";
  return CMO_IMAGE_CONTENT_TYPES[key] ? key : "";
}

function titleFromTopic(row = {}) {
  const title = text(row.topic || row.campaign_name || metadata(row).topic);
  if (title) return title.replace(/\s+--\s+/g, ": ");
  const firstLine = selectedCaption(row).split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  return firstLine || "GOPU Exports Export Insights";
}

export function selectCmoImageContentType(row = {}) {
  const rowMetadata = metadata(row);
  const explicit = normalizeContentType(
    rowMetadata.canva_template_type || rowMetadata.image_content_type || row.template_type || row.content_type
  );
  if (explicit) return explicit;

  const haystack = [row.topic, row.campaign_name, rowMetadata.topic, selectedCaption(row)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(buyer|checklist|guide|learn|education|document|compliance|payment|incoterm|fob|cif|lc|logistics)\b/.test(haystack)) return "buyer_education";
  if (/\b(shipment|shipped|sailed|loaded|container|dispatch|port)\b/.test(haystack)) return "shipment_announcement";
  if (/\b(market|price|mandi|trend|forecast|update|demand|supply)\b/.test(haystack)) return "market_update";
  if (/\b(product|spotlight|chilli|chili|turmeric|cumin|pepper|rice|spice|agricultural)\b/.test(haystack)) return "product_spotlight";
  return "knowledge_carousel";
}

// Keep legacy alias
export const selectCmoCanvaTemplateType = selectCmoImageContentType;

const STYLE_RULES = [
  // What to generate
  "STYLE: Corporate infographic poster. Realistic photography combined with professional infographic layout.",
  "Use business magazine editorial aesthetics — think Forbes, Bloomberg Businessweek, or McKinsey report cover design.",
  "Premium typography: clean sans-serif headlines, professionally typeset body text, fully readable at all sizes.",
  "Luxury B2B branding: deep navy blue (#0D2A4A) background, gold (#D4AF37) accent lines, white text panels.",
  "Export industry visuals: real spice commodities, container logistics, trade documentation, global map overlays.",
  // What NOT to generate
  "STRICT EXCLUSIONS — never render any of the following: cartoons, illustrations, sketches, paintings, watercolors, anime, manga, mascots, characters, clipart, flat icons, stock poster templates, generic infographic templates, abstract art.",
  "No fake social media frames, no mocked UI screenshots, no watermarks, no competitor logos, no pricing claims.",
  "No human faces, no caricatures, no avatars.",
  "Text in the image must be sharp, fully legible, and professionally typeset — never blurry, distorted, or decorative-only."
].join(" ");

const TYPE_PROMPTS = {
  knowledge_carousel: [
    "Layout: vertical corporate infographic poster with numbered key-point sections.",
    "Background: realistic high-resolution macro photography of Indian spices (turmeric, chilli, cumin) blended into a dark navy base.",
    "Foreground: clean white and gold typeset text panels listing trade knowledge points.",
    "Include subtle global trade route map line art in gold on the lower third.",
    "Design feel: McKinsey insight report meets premium spice export brand."
  ].join(" "),
  shipment_announcement: [
    "Layout: bold shipment milestone announcement poster.",
    "Photography: aerial view of a major container port (JNPT/Mundra/Singapore) at golden hour, ultra-sharp and photorealistic.",
    "Overlay: gold shipping route arc line from India to destination country on a dark world map.",
    "Typography: large bold headline announcing the shipment, professional sub-text with product and destination details.",
    "Design feel: Bloomberg trade desk announcement meets luxury freight brand."
  ].join(" "),
  market_update: [
    "Layout: data-forward market intelligence poster.",
    "Photography: dramatic macro close-up of the featured spice commodity on a dark slate surface.",
    "Infographic element: clean bar or line chart in gold/white on navy showing price or demand trend.",
    "Typography: headline with commodity name and market direction, sub-text with key data points.",
    "Design feel: financial terminal data card meets premium commodity trade report."
  ].join(" "),
  product_spotlight: [
    "Layout: luxury product showcase poster.",
    "Photography: studio-quality macro photography of the featured Indian spice — vivid color, sharp texture, dramatic lighting on a dark background.",
    "Include small certification badge row (FSSAI, APEDA, ISO, Spice Board) rendered cleanly in the lower section.",
    "Typography: large product name headline, origin provenance line, key quality spec in professional typeset.",
    "Design feel: high-end commodity trading catalogue meets Monocle magazine product feature."
  ].join(" "),
  buyer_education: [
    "Layout: professional B2B buyer guide poster with structured numbered steps or checklist.",
    "Background: subtle photographic texture — trade documents, customs paperwork, or port logistics — at low opacity on navy.",
    "Foreground: clean white content panels with gold-bordered numbered items, fully typeset in readable corporate font.",
    "Include small compliance or certification icon row in gold.",
    "Design feel: import compliance briefing document meets premium business publication."
  ].join(" ")
};

function buildImagePrompt(row = {}, contentType = "knowledge_carousel") {
  const headline = titleFromTopic(row);
  const topic = text(row.topic || row.campaign_name || metadata(row).topic);
  const typePrompt = TYPE_PROMPTS[contentType] || TYPE_PROMPTS.knowledge_carousel;

  return [
    `Corporate infographic poster for GOPU Exports — Indian premium spice and rice exporter. Topic: "${headline}".`,
    STYLE_RULES,
    typePrompt,
    topic && topic !== headline ? `Additional context: ${topic}.` : "",
    "Portrait format 2:3. All text in the poster must be sharp, correctly spelled, and professionally typeset."
  ].filter(Boolean).join(" ");
}

function openAIApiKey() {
  const secret = getCtoProviderSecret("openai");
  return secret.ok ? secret.secret : env("OPENAI_API_KEY");
}

function imageModel() {
  return env("OPENAI_IMAGE_MODEL") || "gpt-image-1";
}

function imageSize() {
  return env("CMO_IMAGE_SIZE") || DEFAULT_IMAGE_SIZE;
}

function imageQuality() {
  return env("CMO_IMAGE_QUALITY") || DEFAULT_IMAGE_QUALITY;
}

async function generateChatGPTImage(prompt) {
  const apiKey = openAIApiKey();
  if (!apiKey) {
    const error = new Error("OpenAI API key is missing.");
    error.status = "missing_openai_key";
    throw error;
  }

  const body = {
    model: imageModel(),
    prompt,
    n: 1,
    size: imageSize(),
    quality: imageQuality()
  };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(env("OPENAI_IMAGE_TIMEOUT_MS") || 120000))
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json?.error?.message || `OpenAI image generation returned HTTP ${response.status}.`);
    error.status = json?.error?.code || "openai_image_failed";
    error.http_status = response.status;
    throw error;
  }

  const b64 = json?.data?.[0]?.b64_json;
  const revisedPrompt = json?.data?.[0]?.revised_prompt || "";
  if (!b64) {
    const error = new Error("OpenAI image generation returned no image data.");
    error.status = "openai_image_empty";
    throw error;
  }

  return { buffer: Buffer.from(b64, "base64"), revisedPrompt };
}

async function uploadGeneratedImage(client, row, buffer, extension = "png") {
  const bucket = storageBucket();
  const storagePath = [
    "cmo",
    "chatgpt-images",
    new Date().toISOString().slice(0, 10),
    `${safeStorageSlug(row.run_id || row.id)}.${extension}`
  ].join("/");

  const upload = await client.storage.from(bucket).upload(storagePath, buffer, {
    contentType: `image/${extension}`,
    upsert: true,
    cacheControl: "3600"
  });
  if (upload.error) throw new Error(`Image upload failed: ${upload.error.message}`);

  const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) throw new Error("Supabase Storage did not return a public URL for the generated image.");
  return { publicUrl, bucket, storagePath };
}

async function upsertContentLink(client, row, payload) {
  const existing = await client
    .from("content_links")
    .select("id")
    .eq("content_history_id", row.id)
    .eq("link_type", payload.link_type)
    .limit(1)
    .maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") return;
  if (existing.data?.id) await client.from("content_links").update(payload).eq("id", existing.data.id);
  else await client.from("content_links").insert(payload);
}

async function writeImageAudit(client, row, actionType, description, metadataPayload = {}) {
  await client.from("audit_logs").insert({
    tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
    action_type: actionType,
    action: actionType,
    module: "CMO ChatGPT Image Workflow",
    related_table: "content_history",
    related_record_id: row.id || null,
    record_type: "content_history",
    record_id: row.id || null,
    actor: "CMO Image Engine",
    actor_role: "System",
    description,
    notes: description,
    risk_level: metadataPayload.risk_level || "Medium",
    metadata: {
      run_id: row.run_id || "",
      platform: row.platform || "",
      ...metadataPayload
    }
  });
}

export async function ensureCmoCanvaApprovalRow(client, row = {}) {
  if (!client || !row?.id) return { ok: false, status: "missing_client_or_row" };
  const existing = await client.from("content_approvals").select("id").eq("content_history_id", row.id).limit(1).maybeSingle();
  if (!existing.error && existing.data?.id) return { ok: true, status: "exists", id: existing.data.id };
  const inserted = await client.from("content_approvals").insert({
    tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
    content_history_id: row.id,
    run_id: row.run_id || "",
    approval_status: row.approval_status || "pending_approval",
    status: "Pending",
    notes: "ChatGPT-generated CMO creative waiting for Director approval.",
    audit_references: []
  }).select("id").maybeSingle();
  if (inserted.error) return { ok: false, status: "insert_failed", message: inserted.error.message };
  return { ok: true, status: "created", id: inserted.data?.id || "" };
}

export function isCmoChatGPTImageRequired(row = {}) {
  const rowMetadata = metadata(row);
  if (rowMetadata.chatgpt_image_required === false) return false;
  if (String(rowMetadata.chatgpt_image_required || "").toLowerCase() === "false") return false;
  if (env("CMO_DISABLE_IMAGE_GENERATION") === "true") return false;
  return env("CMO_IMAGE_GENERATION_REQUIRED") !== "false";
}

// Keep legacy alias
export const isCmoCanvaRequired = isCmoChatGPTImageRequired;

export function hasCmoChatGPTImage(row = {}) {
  const rowMetadata = metadata(row);
  const imageGen = rowMetadata.chatgpt_image || rowMetadata.chatgpt_image_generation || {};
  const hasUrl = Boolean(row.poster_url || row.image_url || rowMetadata.poster_url || rowMetadata.approval_preview_url);
  // Accept images generated by chatgpt_image or by the legacy canva provider
  const hasValidProvider = imageGen.ok === true || Boolean(rowMetadata.canva?.ok);
  return hasUrl && hasValidProvider;
}

// Keep legacy alias
export const hasCmoCanvaDesign = hasCmoChatGPTImage;

export function validateCmoChatGPTImageBeforePublish(row = {}) {
  if (!isCmoChatGPTImageRequired(row)) return { ok: true, status: "not_required" };
  if (!hasCmoChatGPTImage(row)) {
    return {
      ok: false,
      status: "missing_image",
      error: "Publishing blocked: A ChatGPT-generated creative image is required before Director approval can publish."
    };
  }
  return { ok: true, status: "valid" };
}

// Keep legacy alias used by cmoPublishingEngine
export const validateCmoCanvaBeforePublish = validateCmoChatGPTImageBeforePublish;

async function failImageGeneration(client, row, status, message, extra = {}) {
  const rowMetadata = metadata(row);
  const patch = {
    approval_status: status === "missing_config" ? "needs_edit" : row.approval_status || "pending_approval",
    publish_status: "not_published",
    metadata: {
      ...rowMetadata,
      chatgpt_image_required: true,
      chatgpt_image_generation: {
        ok: false,
        status,
        message,
        at: nowIso(),
        ...extra
      },
      creative_source: "chatgpt_image_required",
      no_ai_image_text: false
    }
  };
  if (!client || !row?.id) return { ...row, ...patch };
  const { data } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
  if (patch.approval_status === "needs_edit") {
    await client.from("content_approvals").update({
      approval_status: "needs_edit",
      status: "Needs Edit",
      notes: message
    }).eq("content_history_id", row.id);
  }
  await writeImageAudit(client, { ...row, ...patch }, "cmo_image_generation_blocked", message, { status, risk_level: "High", ...extra }).catch(() => {});
  return data || { ...row, ...patch };
}

export async function ensureCmoChatGPTImageForApproval(row = {}, options = {}) {
  const client = options.client || null;

  if (!isCmoChatGPTImageRequired(row)) return { ok: true, status: "not_required", content_history: row };
  if (!options.force && hasCmoChatGPTImage(row)) return { ok: true, status: "already_rendered", content_history: row };
  if (!client || !row?.id) {
    return { ok: false, status: "missing_client", message: "Supabase client is required to store generated images.", content_history: row };
  }

  if (!openAIApiKey()) {
    const failed = await failImageGeneration(client, row, "missing_config", "OpenAI API key is missing. Set OPENAI_API_KEY.", { missing: ["OPENAI_API_KEY"] });
    return { ok: false, status: "missing_config", missing: ["OPENAI_API_KEY"], content_history: failed };
  }

  const contentType = selectCmoImageContentType(row);

  try {
    const prompt = buildImagePrompt(row, contentType);
    const { buffer, revisedPrompt } = await generateChatGPTImage(prompt);
    const uploaded = await uploadGeneratedImage(client, row, buffer, "png");

    await upsertContentLink(client, row, {
      tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
      content_history_id: row.id,
      run_id: row.run_id || "",
      platform: row.platform || "LinkedIn",
      platform_target: row.platform || "LinkedIn",
      link_type: "poster",
      label: "ChatGPT image approval preview",
      url: uploaded.publicUrl,
      poster_url: uploaded.publicUrl,
      publish_status: row.publish_status || "not_published",
      timezone: row.timezone || metadata(row).timezone || "Asia/Kolkata",
      country: row.country || metadata(row).country || "India",
      audit_references: Array.isArray(row.audit_references) ? row.audit_references : []
    });

    const imageMetadata = {
      ok: true,
      provider: "chatgpt_image",
      model: imageModel(),
      content_type: contentType,
      content_type_label: CMO_IMAGE_CONTENT_TYPES[contentType]?.label || contentType,
      image_prompt: prompt,
      revised_prompt: revisedPrompt,
      image_size: imageSize(),
      image_quality: imageQuality(),
      storage_path: uploaded.storagePath,
      storage_bucket: uploaded.bucket,
      public_url: uploaded.publicUrl,
      website: CMO_BRAND.website,
      linkedin_page_name: CMO_BRAND.linkedin_page_name,
      brand_colors: CMO_BRAND.colors,
      at: nowIso()
    };

    const rowMetadata = metadata(row);
    const patch = {
      poster_url: uploaded.publicUrl,
      image_url: uploaded.publicUrl,
      image_prompt: prompt,
      approval_status: row.approval_status === "needs_edit" ? "pending_approval" : row.approval_status || "pending_approval",
      publish_status: "not_published",
      metadata: {
        ...rowMetadata,
        chatgpt_image_required: true,
        chatgpt_image: imageMetadata,
        chatgpt_image_generation: imageMetadata,
        approval_preview_url: uploaded.publicUrl,
        poster_url: uploaded.publicUrl,
        creative_source: "chatgpt_image",
        no_ai_image_text: false,
        workflow_stage: "director_approval"
      }
    };

    const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    if (error) throw new Error(`content_history image update failed: ${error.message}`);

    await ensureCmoCanvaApprovalRow(client, data || { ...row, ...patch });
    await client.from("content_approvals").update({
      approval_status: "pending_approval",
      status: "Pending",
      rejected_at: null,
      rejected_at_utc: null,
      notes: "ChatGPT-generated CMO creative waiting for Director approval."
    }).eq("content_history_id", row.id);

    await writeImageAudit(
      client,
      data || { ...row, ...patch },
      "cmo_chatgpt_image_generated",
      "ChatGPT generated the CMO creative image and queued it for Director approval.",
      { chatgpt_image: imageMetadata }
    );

    return { ok: true, status: "rendered", content_history: data || { ...row, ...patch }, chatgpt_image: imageMetadata };
  } catch (error) {
    const status = error?.status || "image_generation_failed";
    const message = error?.message || "ChatGPT image generation failed.";
    const failed = await failImageGeneration(client, row, status, message, { content_type: contentType });
    return { ok: false, status, message, content_history: failed };
  }
}

// Keep legacy alias used by many consumers
export const ensureCmoCanvaDesignForApproval = ensureCmoChatGPTImageForApproval;

export async function getChatGPTImageConnectionStatus({ forceApiCheck = false } = {}) {
  const apiKey = openAIApiKey();
  const model = imageModel();

  if (!apiKey) {
    return {
      platform_key: "chatgpt_image",
      platform_name: "ChatGPT Image Generation",
      status: "unconfigured",
      provider: "OpenAI Images API",
      error_message: "Missing OpenAI API key.",
      render_pipeline: { image_generation: false, text_rendering: "chatgpt_image_required" }
    };
  }

  if (!forceApiCheck) {
    return {
      platform_key: "chatgpt_image",
      platform_name: "ChatGPT Image Generation",
      status: "configured",
      provider: "OpenAI Images API",
      model,
      image_size: imageSize(),
      image_quality: imageQuality(),
      render_pipeline: { image_generation: true, text_rendering: "chatgpt_image" },
      error_message: null
    };
  }

  const started = Date.now();
  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000)
    });
    const body = await response.json().catch(() => ({}));
    const latency = Date.now() - started;
    if (!response.ok) {
      return {
        platform_key: "chatgpt_image",
        platform_name: "ChatGPT Image Generation",
        status: "error",
        provider: "OpenAI Images API",
        latency_ms: latency,
        model,
        render_pipeline: { image_generation: false, text_rendering: "chatgpt_image_required" },
        error_message: body?.error?.message || "OpenAI model check failed."
      };
    }
    return {
      platform_key: "chatgpt_image",
      platform_name: "ChatGPT Image Generation",
      status: "live",
      provider: "OpenAI Images API",
      latency_ms: latency,
      model,
      image_size: imageSize(),
      image_quality: imageQuality(),
      render_pipeline: { image_generation: true, text_rendering: "chatgpt_image" },
      error_message: null
    };
  } catch (error) {
    return {
      platform_key: "chatgpt_image",
      platform_name: "ChatGPT Image Generation",
      status: "error",
      provider: "OpenAI Images API",
      latency_ms: Date.now() - started,
      model,
      render_pipeline: { image_generation: false, text_rendering: "chatgpt_image_required" },
      error_message: error?.message || "OpenAI API check failed."
    };
  }
}

// Keep legacy alias used by many consumers
export const getCanvaConnectionStatus = getChatGPTImageConnectionStatus;
