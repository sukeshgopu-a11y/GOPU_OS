import { getCtoProviderSecret } from "./ctoProviderVault.mjs";

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_BUCKET = "cmo-generated-assets";
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

export const CMO_CANVA_BRAND = {
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

export const CMO_CANVA_TEMPLATE_TYPES = {
  knowledge_carousel: {
    label: "Knowledge Carousel",
    env: "CANVA_TEMPLATE_KNOWLEDGE_CAROUSEL_ID"
  },
  shipment_announcement: {
    label: "Shipment Announcement",
    env: "CANVA_TEMPLATE_SHIPMENT_ANNOUNCEMENT_ID"
  },
  market_update: {
    label: "Market Update",
    env: "CANVA_TEMPLATE_MARKET_UPDATE_ID"
  },
  product_spotlight: {
    label: "Product Spotlight",
    env: "CANVA_TEMPLATE_PRODUCT_SPOTLIGHT_ID"
  },
  buyer_education: {
    label: "Buyer Education",
    env: "CANVA_TEMPLATE_BUYER_EDUCATION_ID"
  }
};

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

function normalizeTemplateType(value = "") {
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
  return CMO_CANVA_TEMPLATE_TYPES[key] ? key : "";
}

function normalizePlatform(value = "") {
  const platform = String(value || "").trim().toLowerCase();
  if (platform === "linkedin personal" || platform === "linkedin_personal" || platform === "linkedin-personal") return "LinkedIn Personal";
  if (platform === "linkedin" || platform === "linked in") return "LinkedIn";
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  return String(value || "").trim();
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeTemplateIds(value = {}) {
  const source = parseJsonObject(value);
  const templates = {};
  for (const key of Object.keys(CMO_CANVA_TEMPLATE_TYPES)) {
    templates[key] = text(source[key] || source[CMO_CANVA_TEMPLATE_TYPES[key].label] || source[CMO_CANVA_TEMPLATE_TYPES[key].env]);
  }
  return templates;
}

function envTemplateIds() {
  const fromJson = normalizeTemplateIds(env("CMO_CANVA_TEMPLATE_IDS") || env("CANVA_TEMPLATE_IDS_JSON"));
  const templates = { ...fromJson };
  for (const [key, config] of Object.entries(CMO_CANVA_TEMPLATE_TYPES)) {
    templates[key] = text(templates[key] || env(config.env));
  }
  return templates;
}

function configuredTemplateIds(config = {}) {
  const fromConfig = normalizeTemplateIds(config.templates || config.canva_templates || config.canvaTemplateIds);
  const templates = envTemplateIds();
  for (const [key, value] of Object.entries(fromConfig)) {
    if (value) templates[key] = value;
  }
  return templates;
}

async function readCanvaIntegrationRow(client, tenantId = DEFAULT_TENANT_ID) {
  if (!client) return {};
  const { data, error } = await client
    .from("platform_integrations")
    .select("config,metadata,status,provider,platform_key")
    .eq("platform_key", "canva")
    .maybeSingle();
  if (error || !data) return {};
  return {
    ...(data.config || {}),
    ...(data.metadata || {}),
    integration_status: data.status || "",
    integration_provider: data.provider || "",
    tenant_id: tenantId
  };
}

export function isCmoCanvaRequired(row = {}) {
  const rowMetadata = metadata(row);
  if (rowMetadata.canva_required === false) return false;
  if (String(rowMetadata.canva_required || "").toLowerCase() === "false") return false;
  if (env("CMO_DISABLE_CANVA") === "true") return false;
  return env("CMO_CANVA_REQUIRED") !== "false";
}

export async function getCmoCanvaConfig({ client = null, tenantId = DEFAULT_TENANT_ID } = {}) {
  const integration = await readCanvaIntegrationRow(client, tenantId);
  const secret = getCtoProviderSecret("canva");
  const token = text(
    secret.ok ? secret.secret : "",
    env("CANVA_ACCESS_TOKEN") || env("CANVA_API_TOKEN")
  );
  const templates = configuredTemplateIds(integration);
  const logoAssetId = text(
    integration.logo_asset_id
    || integration.gopu_logo_asset_id
    || integration.brand?.logo_asset_id
    || env("CANVA_GOPU_LOGO_ASSET_ID")
  );
  const defaultImageAssetId = text(
    integration.default_image_asset_id
    || integration.brand?.default_image_asset_id
    || env("CANVA_DEFAULT_IMAGE_ASSET_ID")
  );

  return {
    token,
    token_source: secret.ok ? secret.source : "",
    templates,
    logo_asset_id: logoAssetId,
    default_image_asset_id: defaultImageAssetId,
    required: env("CMO_CANVA_REQUIRED") !== "false",
    export_width: Number(integration.export_width || env("CANVA_EXPORT_WIDTH") || DEFAULT_WIDTH),
    export_height: Number(integration.export_height || env("CANVA_EXPORT_HEIGHT") || DEFAULT_HEIGHT),
    brand: CMO_CANVA_BRAND,
    integration
  };
}

export function missingCanvaConfiguration(config = {}) {
  const missing = [];
  if (!config.token) missing.push("CANVA_ACCESS_TOKEN");
  for (const [key, template] of Object.entries(CMO_CANVA_TEMPLATE_TYPES)) {
    if (!config.templates?.[key]) missing.push(template.env);
  }
  if (!config.logo_asset_id) missing.push("CANVA_GOPU_LOGO_ASSET_ID");
  return missing;
}

function canvaHeaders(token, json = true) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

async function canvaRequest(path, { token, method = "GET", body, timeoutMs = 30000 } = {}) {
  if (!token) {
    const error = new Error("Canva access token is missing.");
    error.status = "missing_canva_token";
    throw error;
  }

  const response = await fetch(`${CANVA_API_BASE}${path}`, {
    method,
    headers: canvaHeaders(token, Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const textBody = await response.text().catch(() => "");
  let parsed = {};
  try {
    parsed = textBody ? JSON.parse(textBody) : {};
  } catch {
    parsed = { message: textBody };
  }
  if (!response.ok) {
    const error = new Error(parsed?.message || parsed?.error?.message || `Canva API returned HTTP ${response.status}.`);
    error.status = parsed?.code || parsed?.error?.code || "canva_api_failed";
    error.http_status = response.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}

export async function listCanvaBrandTemplates({ token, dataset = "non_empty", limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (dataset) params.set("dataset", dataset);
  if (limit) params.set("limit", String(limit));
  return canvaRequest(`/brand-templates?${params.toString()}`, { token });
}

export async function getCanvaBrandTemplateDataset(templateId, { token } = {}) {
  if (!templateId) throw new Error("Canva brand template ID is required.");
  return canvaRequest(`/brand-templates/${encodeURIComponent(templateId)}/dataset`, { token });
}

async function createCanvaAutofillJob({ token, brandTemplateId, title, data }) {
  return canvaRequest("/autofills", {
    token,
    method: "POST",
    body: {
      brand_template_id: brandTemplateId,
      title: title || undefined,
      data
    },
    timeoutMs: 45000
  });
}

async function getCanvaAutofillJob(jobId, { token } = {}) {
  return canvaRequest(`/autofills/${encodeURIComponent(jobId)}`, { token });
}

async function createCanvaExportJob({ token, designId, format }) {
  return canvaRequest("/exports", {
    token,
    method: "POST",
    body: {
      design_id: designId,
      format
    },
    timeoutMs: 45000
  });
}

async function getCanvaExportJob(jobId, { token } = {}) {
  return canvaRequest(`/exports/${encodeURIComponent(jobId)}`, { token });
}

async function waitForCanvaJob({ label, jobId, poll, timeoutMs = 90000, intervalMs = 1500 }) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await poll(jobId);
    const job = last.job || {};
    if (job.status === "success") return job;
    if (job.status === "failed") {
      const error = new Error(job.error?.message || `${label} failed.`);
      error.status = job.error?.code || `${label}_failed`;
      error.job = job;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const error = new Error(`${label} timed out.`);
  error.status = `${label}_timeout`;
  error.last = last;
  throw error;
}

function titleFromTopic(row = {}) {
  const title = text(row.topic || row.campaign_name || metadata(row).topic);
  if (title) return title.replace(/\s+--\s+/g, ": ");
  const firstLine = selectedCaption(row).split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return firstLine || "GOPU Exports Knowledge Post";
}

function cleanCaptionForSlides(row = {}) {
  return selectedCaption(row)
    .replace(/Follow Gopu Exports for export insights and global trade updates\./gi, "")
    .replace(/@GOPU Exports/gi, "")
    .replace(/#[A-Za-z][A-Za-z0-9_]*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapFieldText(value = "", max = 280) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3).trim()}...` : clean;
}

export function extractCanvaSlides(row = {}, maxSlides = 8) {
  const rowMetadata = metadata(row);
  const provided = rowMetadata.canva_content?.slides || rowMetadata.canva_slides || rowMetadata.slides;
  if (Array.isArray(provided) && provided.length) {
    return provided.slice(0, maxSlides).map((slide, index) => ({
      heading: wrapFieldText(slide.heading || slide.title || `Slide ${index + 1}`, 80),
      body: wrapFieldText(slide.body || slide.text || slide.content || "", 220)
    }));
  }

  const clean = cleanCaptionForSlides(row);
  const lines = clean.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const slides = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (!match) continue;
    const body = lines[index + 1] && !/^\d{1,2}[.)]\s+/.test(lines[index + 1]) ? lines[index + 1] : "";
    slides.push({
      heading: wrapFieldText(match[2], 80),
      body: wrapFieldText(body, 220)
    });
  }
  if (slides.length) return slides.slice(0, maxSlides);

  const paragraphs = clean.split(/\n\s*\n/).map((line) => line.trim()).filter(Boolean);
  return paragraphs.slice(0, maxSlides).map((paragraph, index) => ({
    heading: `Key Point ${index + 1}`,
    body: wrapFieldText(paragraph, 220)
  }));
}

export function selectCmoCanvaTemplateType(row = {}) {
  const rowMetadata = metadata(row);
  const explicit = normalizeTemplateType(rowMetadata.canva_template_type || row.template_type || row.content_type);
  if (explicit) return explicit;

  const haystack = [
    row.topic,
    row.campaign_name,
    rowMetadata.topic,
    selectedCaption(row)
  ].filter(Boolean).join(" ").toLowerCase();
  if (/\b(buyer|checklist|guide|learn|education|document|compliance|payment|incoterm|fob|cif|lc|logistics)\b/.test(haystack)) return "buyer_education";
  if (/\b(shipment|shipped|sailed|loaded|container|dispatch|port)\b/.test(haystack)) return "shipment_announcement";
  if (/\b(market|price|mandi|trend|forecast|update|demand|supply)\b/.test(haystack)) return "market_update";
  if (/\b(product|spotlight|chilli|chili|turmeric|cumin|pepper|rice|spice|agricultural)\b/.test(haystack)) return "product_spotlight";
  return "knowledge_carousel";
}

function normalizeFieldKey(key = "") {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function slideValueForKey(key, slides) {
  const match = key.match(/(?:slide|page|section|point|item)_?(\d{1,2})(?:_?(heading|title|body|content|text|copy))?/);
  if (!match) return null;
  const slide = slides[Number(match[1]) - 1] || {};
  const field = match[2] || "";
  if (field === "heading" || field === "title") return slide.heading || "";
  if (field === "body" || field === "content" || field === "text" || field === "copy") return slide.body || "";
  return [slide.heading, slide.body].filter(Boolean).join("\n");
}

function resolveTextFieldValue(key, values) {
  const normalized = normalizeFieldKey(key);
  const slideValue = slideValueForKey(normalized, values.slides);
  if (slideValue !== null) return slideValue;
  if (/\b(headline|title|hook)\b/.test(normalized)) return values.headline;
  if (/\b(subheadline|subtitle|intro|summary)\b/.test(normalized)) return values.intro;
  if (/\b(caption|post_copy|body_copy|linkedin_copy|facebook_copy)\b/.test(normalized)) return values.caption;
  if (/\b(hashtag|hashtags)\b/.test(normalized)) return values.hashtags;
  if (normalized.includes("website") || normalized.includes("url") || normalized.includes("domain")) return CMO_CANVA_BRAND.website;
  if (normalized.includes("linkedin") || normalized.includes("page_name")) return CMO_CANVA_BRAND.linkedin_page_name;
  if (normalized.includes("company") || normalized.includes("brand") || normalized.includes("logo_text") || normalized.includes("business_name")) return CMO_CANVA_BRAND.company_name;
  if (normalized.includes("tagline") || normalized.includes("footer_line")) return CMO_CANVA_BRAND.tagline;
  if (normalized.includes("navy") || normalized.includes("brand_navy")) return CMO_CANVA_BRAND.colors.navy;
  if (normalized.includes("gold") || normalized.includes("brand_gold")) return CMO_CANVA_BRAND.colors.gold;
  if (normalized.includes("white") || normalized.includes("brand_white")) return CMO_CANVA_BRAND.colors.white;
  if (normalized.includes("export_format") || normalized === "format") return values.export_label;
  return "";
}

function isLogoField(key = "") {
  return /\b(logo|wordmark|brand_mark|gopu_logo)\b/.test(normalizeFieldKey(key));
}

export function buildCmoCanvaAutofillData(row = {}, dataset = {}, config = {}) {
  const rowMetadata = metadata(row);
  const slides = extractCanvaSlides(row, 10);
  const headline = wrapFieldText(rowMetadata.canva_content?.headline || rowMetadata.canva_headline || titleFromTopic(row), 92);
  const clean = cleanCaptionForSlides(row);
  const intro = wrapFieldText(rowMetadata.canva_content?.intro || clean.split(/\n\s*\n/).find((line) => line.length > 30) || clean, 180);
  const caption = selectedCaption(row);
  const hashtags = Array.isArray(row.hashtags)
    ? row.hashtags.join(" ")
    : Array.isArray(rowMetadata.hashtags)
      ? rowMetadata.hashtags.join(" ")
      : String(row.hashtags || rowMetadata.hashtags || "");
  const values = {
    headline,
    intro,
    caption,
    hashtags,
    slides,
    export_label: `${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}`
  };

  const data = {};
  const textFields = [];
  const imageFields = [];
  for (const [key, definition] of Object.entries(dataset || {})) {
    const type = String(definition?.type || "").toLowerCase();
    if (type === "text") {
      textFields.push(key);
      data[key] = { type: "text", text: resolveTextFieldValue(key, values) };
    } else if (type === "image") {
      imageFields.push(key);
      if (isLogoField(key) && config.logo_asset_id) {
        data[key] = { type: "image", asset_id: config.logo_asset_id };
      } else if (config.default_image_asset_id) {
        data[key] = { type: "image", asset_id: config.default_image_asset_id };
      }
    }
  }

  return {
    data,
    summary: {
      headline,
      slide_count: slides.length,
      text_fields: textFields,
      image_fields: imageFields,
      logo_field_present: imageFields.some(isLogoField),
      logo_asset_present: Boolean(config.logo_asset_id)
    }
  };
}

function exportSpecForPlatform(platform = "", config = {}) {
  const normalized = normalizePlatform(platform);
  const width = Number(config.export_width || DEFAULT_WIDTH);
  const height = Number(config.export_height || DEFAULT_HEIGHT);
  if (normalized === "Facebook") {
    return {
      extension: "jpg",
      contentType: "image/jpeg",
      format: { type: "jpg", quality: 90, width, height }
    };
  }
  return {
    extension: "png",
    contentType: "image/png",
    format: { type: "png", width, height }
  };
}

async function uploadCanvaExport(client, row, buffer, { extension, contentType, pageNumber }) {
  const bucket = storageBucket();
  const storagePath = [
    "cmo",
    "canva-exports",
    new Date().toISOString().slice(0, 10),
    `${safeStorageSlug(row.run_id || row.id)}-page-${pageNumber}.${extension}`
  ].join("/");
  const upload = await client.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true,
    cacheControl: "3600"
  });
  if (upload.error) throw new Error(`Canva export upload failed: ${upload.error.message}`);
  const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) throw new Error("Supabase Storage did not return a Canva export public URL.");
  return { publicUrl, bucket, storagePath };
}

async function downloadExportUrl(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(Number(env("CANVA_EXPORT_DOWNLOAD_TIMEOUT_MS") || 45000)) });
  if (!response.ok) throw new Error(`Canva export download failed with HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
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

async function writeCanvaAudit(client, row, actionType, description, metadataPayload = {}) {
  await client.from("audit_logs").insert({
    tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
    action_type: actionType,
    action: actionType,
    module: "CMO Canva Workflow",
    related_table: "content_history",
    related_record_id: row.id || null,
    record_type: "content_history",
    record_id: row.id || null,
    actor: "CMO Canva Engine",
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
    notes: "Canva-rendered CMO creative waiting for Director approval.",
    audit_references: []
  }).select("id").maybeSingle();
  if (inserted.error) return { ok: false, status: "insert_failed", message: inserted.error.message };
  return { ok: true, status: "created", id: inserted.data?.id || "" };
}

async function failCanvaGeneration(client, row, status, message, extra = {}) {
  const rowMetadata = metadata(row);
  const patch = {
    approval_status: status === "missing_config" || status === "missing_template_dataset" ? "needs_edit" : row.approval_status || "pending_approval",
    publish_status: "not_published",
    metadata: {
      ...rowMetadata,
      canva_required: true,
      canva_generation: {
        ok: false,
        status,
        message,
        at: nowIso(),
        ...extra
      },
      creative_source: "canva_required",
      no_ai_image_text: true
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
  await writeCanvaAudit(client, { ...row, ...patch }, "cmo_canva_generation_blocked", message, { status, risk_level: "High", ...extra }).catch(() => {});
  return data || { ...row, ...patch };
}

export function hasCmoCanvaDesign(row = {}) {
  const rowMetadata = metadata(row);
  const canva = rowMetadata.canva || rowMetadata.canva_generation || {};
  return Boolean((row.poster_url || row.image_url || rowMetadata.poster_url || rowMetadata.approval_preview_url) && canva.ok === true && canva.provider === "canva");
}

export function validateCmoCanvaBeforePublish(row = {}) {
  if (!isCmoCanvaRequired(row)) return { ok: true, status: "not_required" };
  if (!hasCmoCanvaDesign(row)) {
    return {
      ok: false,
      status: "missing_canva_design",
      error: "Publishing blocked: Canva-rendered creative is required before Director approval can publish."
    };
  }
  return { ok: true, status: "valid" };
}

export async function ensureCmoCanvaDesignForApproval(row = {}, options = {}) {
  const client = options.client || null;
  const rowMetadata = metadata(row);
  if (!isCmoCanvaRequired(row)) return { ok: true, status: "not_required", content_history: row };
  if (!options.force && hasCmoCanvaDesign(row)) return { ok: true, status: "already_rendered", content_history: row };
  if (!client || !row?.id) {
    return { ok: false, status: "missing_client", message: "Supabase client is required to store Canva exports.", content_history: row };
  }

  const config = await getCmoCanvaConfig({ client, tenantId: row.tenant_id || DEFAULT_TENANT_ID });
  const missing = missingCanvaConfiguration(config);
  if (missing.length) {
    const failed = await failCanvaGeneration(client, row, "missing_config", `Canva configuration is incomplete: ${missing.join(", ")}.`, { missing });
    return { ok: false, status: "missing_config", missing, content_history: failed };
  }

  const templateType = selectCmoCanvaTemplateType(row);
  const brandTemplateId = config.templates[templateType];
  if (!brandTemplateId) {
    const failed = await failCanvaGeneration(client, row, "missing_template_id", `Canva template ID missing for ${templateType}.`, { template_type: templateType });
    return { ok: false, status: "missing_template_id", content_history: failed };
  }

  try {
    const datasetResponse = await getCanvaBrandTemplateDataset(brandTemplateId, { token: config.token });
    const dataset = datasetResponse.dataset || {};
    if (!Object.keys(dataset).length) {
      const failed = await failCanvaGeneration(client, row, "missing_template_dataset", `Canva template ${brandTemplateId} has no autofill dataset.`, { template_type: templateType, brand_template_id: brandTemplateId });
      return { ok: false, status: "missing_template_dataset", content_history: failed };
    }

    const autofill = buildCmoCanvaAutofillData(row, dataset, config);
    const autofillJob = await createCanvaAutofillJob({
      token: config.token,
      brandTemplateId,
      title: `${CMO_CANVA_BRAND.company_name} - ${titleFromTopic(row)}`.slice(0, 255),
      data: autofill.data
    });
    const autofillJobId = autofillJob.job?.id;
    if (!autofillJobId) throw new Error("Canva did not return an autofill job ID.");
    const completedAutofill = await waitForCanvaJob({
      label: "canva_autofill",
      jobId: autofillJobId,
      poll: (jobId) => getCanvaAutofillJob(jobId, { token: config.token }),
      timeoutMs: Number(env("CANVA_AUTOFILL_TIMEOUT_MS") || 120000)
    });
    const design = completedAutofill.result?.design || {};
    const designId = design.id;
    if (!designId) throw new Error("Canva autofill completed without a design ID.");

    const exportSpec = exportSpecForPlatform(row.platform, config);
    const exportJob = await createCanvaExportJob({
      token: config.token,
      designId,
      format: exportSpec.format
    });
    const exportJobId = exportJob.job?.id;
    if (!exportJobId) throw new Error("Canva did not return an export job ID.");
    const completedExport = await waitForCanvaJob({
      label: "canva_export",
      jobId: exportJobId,
      poll: (jobId) => getCanvaExportJob(jobId, { token: config.token }),
      timeoutMs: Number(env("CANVA_EXPORT_TIMEOUT_MS") || 120000)
    });
    const exportUrls = Array.isArray(completedExport.urls) ? completedExport.urls : [];
    if (!exportUrls.length) throw new Error("Canva export completed without download URLs.");

    const uploadedPages = [];
    for (let index = 0; index < exportUrls.length; index += 1) {
      const buffer = await downloadExportUrl(exportUrls[index]);
      const uploaded = await uploadCanvaExport(client, row, buffer, {
        extension: exportSpec.extension,
        contentType: exportSpec.contentType,
        pageNumber: index + 1
      });
      uploadedPages.push({ ...uploaded, page: index + 1 });
      await upsertContentLink(client, row, {
        tenant_id: row.tenant_id || DEFAULT_TENANT_ID,
        content_history_id: row.id,
        run_id: row.run_id || "",
        platform: row.platform || "LinkedIn",
        platform_target: row.platform || "LinkedIn",
        link_type: index === 0 ? "poster" : `canva_export_page_${index + 1}`,
        label: index === 0 ? "Canva approval preview" : `Canva carousel page ${index + 1}`,
        url: uploaded.publicUrl,
        poster_url: index === 0 ? uploaded.publicUrl : null,
        publish_status: row.publish_status || "not_published",
        timezone: row.timezone || rowMetadata.timezone || "Asia/Kolkata",
        country: row.country || rowMetadata.country || "India",
        audit_references: Array.isArray(row.audit_references) ? row.audit_references : []
      });
    }

    const primaryUrl = uploadedPages[0]?.publicUrl || "";
    const canvaMetadata = {
      ok: true,
      provider: "canva",
      template_type: templateType,
      template_label: CMO_CANVA_TEMPLATE_TYPES[templateType]?.label || templateType,
      brand_template_id: brandTemplateId,
      design_id: designId,
      design_url: design.url || design.urls?.edit_url || design.urls?.view_url || "",
      autofill_job_id: autofillJobId,
      export_job_id: exportJobId,
      export_format: exportSpec.extension,
      export_width: config.export_width,
      export_height: config.export_height,
      page_count: uploadedPages.length,
      pages: uploadedPages,
      text_rendering: "canva",
      logo_asset_id: config.logo_asset_id,
      website: CMO_CANVA_BRAND.website,
      linkedin_page_name: CMO_CANVA_BRAND.linkedin_page_name,
      brand_colors: CMO_CANVA_BRAND.colors,
      autofill_summary: autofill.summary,
      at: nowIso()
    };
    const patch = {
      poster_url: primaryUrl,
      ...(normalizePlatform(row.platform) === "LinkedIn Personal" ? {} : { image_url: primaryUrl }),
      image_prompt: "",
      approval_status: row.approval_status === "needs_edit" ? "pending_approval" : row.approval_status || "pending_approval",
      publish_status: "not_published",
      metadata: {
        ...rowMetadata,
        canva_required: true,
        canva: canvaMetadata,
        canva_generation: canvaMetadata,
        approval_preview_url: primaryUrl,
        poster_url: primaryUrl,
        creative_source: "canva",
        no_ai_image_text: true,
        workflow_stage: "director_approval"
      }
    };
    const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    if (error) throw new Error(`content_history Canva update failed: ${error.message}`);
    await ensureCmoCanvaApprovalRow(client, data || { ...row, ...patch });
    await client.from("content_approvals").update({
      approval_status: "pending_approval",
      status: "Pending",
      rejected_at: null,
      rejected_at_utc: null,
      notes: "Canva-rendered CMO creative waiting for Director approval."
    }).eq("content_history_id", row.id);
    await writeCanvaAudit(client, data || { ...row, ...patch }, "cmo_canva_design_generated", "Canva rendered the CMO creative and queued it for Director approval.", { canva: canvaMetadata });
    return { ok: true, status: "rendered", content_history: data || { ...row, ...patch }, canva: canvaMetadata };
  } catch (error) {
    const status = error?.status || "canva_generation_failed";
    const message = error?.message || "Canva creative generation failed.";
    const failed = await failCanvaGeneration(client, row, status, message, { template_type: templateType, brand_template_id: brandTemplateId });
    return { ok: false, status, message, content_history: failed };
  }
}

export async function getCanvaConnectionStatus({ client = null, tenantId = DEFAULT_TENANT_ID, forceApiCheck = false } = {}) {
  const config = await getCmoCanvaConfig({ client, tenantId });
  const missing = missingCanvaConfiguration(config);
  const templateStatus = Object.fromEntries(Object.entries(CMO_CANVA_TEMPLATE_TYPES).map(([key, value]) => [
    key,
    {
      label: value.label,
      configured: Boolean(config.templates[key]),
      template_id: config.templates[key] || ""
    }
  ]));

  if (!config.token) {
    return {
      platform_key: "canva",
      platform_name: "Canva",
      status: "unconfigured",
      provider: "Canva Connect API",
      missing,
      templates: templateStatus,
      render_pipeline: { autofill: false, export: false, text_rendering: "canva_required" },
      error_message: "Missing Canva access token."
    };
  }

  if (!forceApiCheck) {
    return {
      platform_key: "canva",
      platform_name: "Canva",
      status: missing.length ? "partial" : "configured",
      provider: "Canva Connect API",
      missing,
      templates: templateStatus,
      render_pipeline: { autofill: missing.length === 0, export: missing.length === 0, text_rendering: "canva" },
      error_message: missing.length ? `Missing Canva config: ${missing.join(", ")}.` : null
    };
  }

  const started = Date.now();
  try {
    await listCanvaBrandTemplates({ token: config.token, dataset: "non_empty", limit: 1 });
    return {
      platform_key: "canva",
      platform_name: "Canva",
      status: missing.length ? "partial" : "live",
      provider: "Canva Connect API",
      latency_ms: Date.now() - started,
      missing,
      templates: templateStatus,
      render_pipeline: { autofill: missing.length === 0, export: missing.length === 0, text_rendering: "canva" },
      error_message: missing.length ? `Missing Canva config: ${missing.join(", ")}.` : null
    };
  } catch (error) {
    return {
      platform_key: "canva",
      platform_name: "Canva",
      status: "error",
      provider: "Canva Connect API",
      latency_ms: Date.now() - started,
      missing,
      templates: templateStatus,
      render_pipeline: { autofill: false, export: false, text_rendering: "canva_required" },
      error_message: error?.message || "Canva API check failed."
    };
  }
}
