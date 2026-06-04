import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { LINKEDIN_WEBSITE_FOOTER, isLinkedInPlatform as isLinkedInContentPlatform, linkedinImagePrompt } from "./cmoLinkedInRules.mjs";
import { ensureCmoCanvaDesignForApproval, isCmoCanvaRequired } from "./cmoChatGPTImageWorkflow.mjs";
import { cleanSlackText } from "./slackTextClean.js";
import { getCtoProviderSecret } from "./ctoProviderVault.mjs";

const demoTenantId = "11111111-1111-1111-1111-111111111111";
const defaultStorageBucket = "cmo-generated-assets";

function env(name) {
  return process.env[name]?.trim() || "";
}

function nowIso() {
  return new Date().toISOString();
}

function supabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getClient(provided) {
  if (provided) return provided;
  const url = supabaseUrl();
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server env.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getOptionalClient(provided) {
  if (provided) return provided;
  try {
    return getClient();
  } catch {
    return null;
  }
}

function text(value, fallback = "") {
  return String(value || fallback).trim();
}

function metadata(row) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
}

function truncate(value, max = 2800) {
  const clean = text(value);
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function selectedCaption(row = {}) {
  return text(row.final_text || row.final_approved_content || row.caption || row.generated_text);
}

function isLinkedInPersonal(row = {}) {
  const platform = text(row.platform).toLowerCase();
  return platform === "linkedin personal" || platform === "linkedin_personal" || platform === "linkedin-personal";
}

function hasLinkedInBranding(row = {}) {
  const generation = metadata(row).approval_image_generation || {};
  return generation.logo_stamp === "GOPU EXPORTS" && generation.website_footer === LINKEDIN_WEBSITE_FOOTER;
}

function storageBucket() {
  return env("SUPABASE_STORAGE_BUCKET") || defaultStorageBucket;
}

function resolveImagePrompt(row = {}, options = {}) {
  const overridePrompt = text(options.promptOverride || options.imagePrompt);
  if (overridePrompt) return { prompt: overridePrompt, source: "override" };

  const rowMetadata = metadata(row);
  const storedPrompt = text(
    row.image_prompt
    || rowMetadata.image_prompt
    || rowMetadata.generated_content?.image_prompt
    || rowMetadata.creative?.image_prompt
    || rowMetadata.approval_image_prompt
  );
  if (storedPrompt) return { prompt: storedPrompt, source: "stored" };

  const caption = selectedCaption(row);
  const platform = row.platform || "LinkedIn";
  const topic = row.topic || row.campaign_name || rowMetadata.topic || "GOPU OS export operating system";
  if (isLinkedInContentPlatform(platform)) {
    return {
      source: "fallback_linkedin_knowledge_template",
      prompt: linkedinImagePrompt(`${topic}\n${caption}`),
    };
  }
  return {
    source: "fallback",
    prompt: [
      `Create a professional ${platform} approval-preview image for GOPU Exports.`,
      `Topic: ${topic}.`,
      caption ? `Post context: ${caption.slice(0, 700)}` : "",
      "Style: premium Indian export technology brand, clean operations command center, global trade routes, shipping documents, subtle spice export cues, founder approval workflow feel.",
      "Use a polished business visual suitable for a LinkedIn founder post. No fake logos, no public platform branding, no watermarks, no pricing claims, no buyer names, no text that says the post is already published."
    ].filter(Boolean).join(" ")
  };
}

function existingImageUrl(row = {}) {
  const rowMetadata = metadata(row);
  return text(row.poster_url || row.image_url || rowMetadata.poster_url || rowMetadata.image_url || rowMetadata.approval_preview_url);
}

function safeStorageSlug(value = "") {
  return text(value, String(Date.now())).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140) || String(Date.now());
}

function extractOpenAIText(body = {}) {
  if (typeof body.output_text === "string") return body.output_text;
  const outputText = body.output?.flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
  if (outputText) return outputText;
  return body.choices?.map((choice) => choice.message?.content || choice.text || "").join("").trim() || "";
}

function safeJsonParse(value = "") {
  try {
    return JSON.parse(value);
  } catch {
    const match = String(value || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeBoolean(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function xmlEscape(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function callOpenAIModificationRevision(row = {}, notes = "") {
  const providerSecret = getCtoProviderSecret("openai");
  const apiKey = providerSecret.ok ? providerSecret.secret : env("OPENAI_API_KEY");
  if (!apiKey) return { ok: false, status: "missing_openai", message: "OpenAI key is not configured." };

  const currentCopy = selectedCaption(row);
  const currentImagePrompt = resolveImagePrompt(row).prompt;
  const hashtags = normalizeHashtags(row.hashtags || metadata(row).hashtags);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env("OPENAI_CONTENT_FAST_MODEL") || env("OPENAI_SUMMARY_MODEL") || "gpt-5.5",
      input: [
        {
          role: "system",
          content: [
            "You are GOPU OS AI CMO revision interpreter.",
            "Read the founder's Modify note and convert it into a concrete revised approval version.",
            "Never approve or publish. Keep claims proof-safe for GOPU Exports.",
            "If the note asks for image/font/language changes, produce an image prompt that avoids bad text. Default to no visible text unless the founder explicitly asks for exact English words.",
            "If the note asks to add the company logo or GOPU EXPORTS, mark image_change_required true and say the exact GOPU EXPORTS logo should be stamped after generation.",
            "Return strict JSON only."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Interpret founder modification and create revised copy/image prompt for re-approval.",
            platform: row.platform || "LinkedIn",
            run_id: row.run_id || "",
            current_post_copy: currentCopy,
            current_hashtags: hashtags,
            current_image_prompt: currentImagePrompt,
            founder_modify_note: notes,
            output_schema: {
              summary: "one sentence explaining the interpreted change",
              copy_change_required: "boolean",
              image_change_required: "boolean",
              manual_review_required: "boolean, true only if request needs human evidence/legal/commercial confirmation before even re-approval",
              revised_post_copy: "updated post copy if copy_change_required, otherwise original copy",
              revised_image_prompt: "updated image prompt if image_change_required, otherwise original prompt",
              risk_notes: ["short safety notes"]
            }
          })
        }
      ],
      text: { format: { type: "json_object" } }
    }),
    signal: AbortSignal.timeout(Number(env("OPENAI_MODIFY_TIMEOUT_MS") || 60000))
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: "openai_modify_failed", message: body?.error?.message || `OpenAI modify interpretation failed with HTTP ${response.status}.` };
  }

  const parsed = safeJsonParse(extractOpenAIText(body));
  if (!parsed) return { ok: false, status: "invalid_openai_json", message: "OpenAI modify interpretation did not return valid JSON." };

  const copyChangeRequired = normalizeBoolean(parsed.copy_change_required);
  const imageChangeRequired = normalizeBoolean(parsed.image_change_required);
  return {
    ok: true,
    status: "interpreted",
    summary: text(parsed.summary, "Modification interpreted by OpenAI."),
    copy_change_required: copyChangeRequired,
    image_change_required: imageChangeRequired,
    manual_review_required: normalizeBoolean(parsed.manual_review_required),
    revised_post_copy: text(parsed.revised_post_copy, currentCopy),
    revised_image_prompt: text(parsed.revised_image_prompt, currentImagePrompt),
    risk_notes: Array.isArray(parsed.risk_notes) ? parsed.risk_notes.map(String).filter(Boolean).slice(0, 6) : [],
    raw: parsed
  };
}

async function generateApprovalImageBuffer(imagePrompt) {
  const providerSecret = getCtoProviderSecret("openai");
  const apiKey = providerSecret.ok ? providerSecret.secret : env("OPENAI_API_KEY");
  if (!apiKey) return { ok: false, status: "missing_openai", message: "OpenAI image key is not configured." };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env("OPENAI_IMAGE_MODEL") || "gpt-image-1",
      prompt: imagePrompt,
      size: env("CMO_IMAGE_SIZE") || "1024x1536",
      quality: env("CMO_IMAGE_QUALITY") || "high",
      n: 1
    }),
    signal: AbortSignal.timeout(Number(env("OPENAI_IMAGE_TIMEOUT_MS") || 60000))
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: "openai_image_failed", message: body?.error?.message || `OpenAI image generation failed with HTTP ${response.status}.` };
  }

  const base64 = body?.data?.[0]?.b64_json;
  if (base64) return { ok: true, buffer: Buffer.from(base64, "base64"), model: body.model || env("OPENAI_IMAGE_MODEL") || "gpt-image-1" };

  const remoteUrl = body?.data?.[0]?.url;
  if (remoteUrl) {
    const imageResponse = await fetch(remoteUrl, { signal: AbortSignal.timeout(30000) });
    if (!imageResponse.ok) return { ok: false, status: "openai_image_download_failed", message: `Generated image download failed with HTTP ${imageResponse.status}.` };
    return { ok: true, buffer: Buffer.from(await imageResponse.arrayBuffer()), model: body.model || env("OPENAI_IMAGE_MODEL") || "image-url" };
  }

  return { ok: false, status: "missing_image_data", message: "OpenAI image generation did not return image data." };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gopuLogoAssetPath() {
  const candidates = [
    path.join(process.cwd(), "public", "assets", "logos", "gopu_exports_wordmark_stacked.png"),
    path.join(process.cwd(), "dist", "assets", "logos", "gopu_exports_wordmark_stacked.png")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function fallbackLogoSvg(width, height) {
  const main = xmlEscape("GOPU");
  const sub = xmlEscape("EXPORTS");
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="22" fill="#fffaf0" fill-opacity="0.94"/>
      <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="20" fill="none" stroke="#d9b464" stroke-opacity="0.75" stroke-width="3"/>
      <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.22)}" font-weight="800" fill="#1f2a20">${main}</text>
      <line x="${width * 0.23}" y="${height * 0.54}" x2="${width * 0.77}" y2="${height * 0.54}" stroke="#e3a61b" stroke-width="${Math.max(5, Math.round(width * 0.025))}" stroke-linecap="round"/>
      <text x="${width / 2}" y="${height * 0.77}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.12)}" font-weight="800" fill="#05613c" letter-spacing="7">${sub}</text>
    </svg>
  `);
}

async function createGopuLogoStamp(width, height) {
  const panelWidth = clampNumber(Math.round(width * 0.22), 200, 260);
  const panelHeight = clampNumber(Math.round(panelWidth * 0.62), 124, 162);
  const panelSvg = Buffer.from(`
    <svg width="${panelWidth}" height="${panelHeight}" viewBox="0 0 ${panelWidth} ${panelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${panelWidth}" height="${panelHeight}" rx="16" fill="#ffffff" fill-opacity="0.97"/>
      <rect x="1.5" y="1.5" width="${panelWidth - 3}" height="${panelHeight - 3}" rx="14" fill="none" stroke="#D4A437" stroke-opacity="0.82" stroke-width="3"/>
    </svg>
  `);
  const assetPath = gopuLogoAssetPath();
  if (!assetPath) return fallbackLogoSvg(panelWidth, panelHeight);

  try {
    const logo = await sharp(assetPath)
      .trim()
      .resize({
        width: Math.round(panelWidth * 0.7),
        height: Math.round(panelHeight * 0.72),
        fit: "inside",
        withoutEnlargement: true
      })
      .png()
      .toBuffer();
    const logoMeta = await sharp(logo).metadata();
    return await sharp(panelSvg)
      .composite([{
        input: logo,
        left: Math.round((panelWidth - (logoMeta.width || 0)) / 2),
        top: Math.round((panelHeight - (logoMeta.height || 0)) / 2)
      }])
      .png()
      .toBuffer();
  } catch {
    return fallbackLogoSvg(panelWidth, panelHeight);
  }
}

function createWebsiteFooterStamp(width, height) {
  const footerWidth = clampNumber(Math.round(width * 0.88), 820, 960);
  const footerHeight = clampNumber(Math.round(height * 0.105), 92, 116);
  const titleSize = clampNumber(Math.round(footerHeight * 0.18), 17, 21);
  const bodySize = clampNumber(Math.round(footerHeight * 0.13), 12, 15);
  return Buffer.from(`
    <svg width="${footerWidth}" height="${footerHeight}" viewBox="0 0 ${footerWidth} ${footerHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${footerWidth}" height="${footerHeight}" rx="18" fill="#0B1F3A" fill-opacity="0.97"/>
      <rect x="2" y="2" width="${footerWidth - 4}" height="${footerHeight - 4}" rx="16" fill="none" stroke="#D4A437" stroke-opacity="0.78" stroke-width="2"/>
      <text x="30" y="${Math.round(footerHeight * 0.32)}" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="800" fill="#ffffff">GOPU EXPORTS</text>
      <text x="30" y="${Math.round(footerHeight * 0.57)}" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="600" fill="#D4A437">Global Trade - Spices - Rice - Agricultural Products</text>
      <text x="30" y="${Math.round(footerHeight * 0.8)}" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="600" fill="#ffffff">${xmlEscape(LINKEDIN_WEBSITE_FOOTER)}</text>
      <text x="${footerWidth - 30}" y="${Math.round(footerHeight * 0.42)}" text-anchor="end" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="600" fill="#ffffff">LinkedIn: GOPU Exports</text>
      <text x="${footerWidth - 30}" y="${Math.round(footerHeight * 0.63)}" text-anchor="end" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="600" fill="#ffffff">Instagram: @gopuexports</text>
      <text x="${footerWidth - 30}" y="${Math.round(footerHeight * 0.84)}" text-anchor="end" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="600" fill="#ffffff">Facebook: GOPU Exports</text>
    </svg>
  `);
}

async function stampGopuExportsLogo(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const stamp = await createGopuLogoStamp(width, height);
  const footer = createWebsiteFooterStamp(width, height);
  const footerMeta = await sharp(footer).metadata();
  return await sharp(imageBuffer)
    .composite([
      {
        input: stamp,
        left: Math.round(width * 0.035),
        top: Math.round(height * 0.035)
      },
      {
        input: footer,
        left: Math.round((width - (footerMeta.width || 0)) / 2),
        top: height - Math.round(height * 0.035) - (footerMeta.height || 0)
      }
    ])
    .png()
    .toBuffer();
}

function splitWords(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function wrapText(value = "", maxChars = 42, maxLines = 3) {
  const words = splitWords(value);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?-]*$/, "")}...`;
  }
  return lines;
}

function svgText(lines = [], { x, y, size = 24, weight = 500, fill = "#1f2933", lineHeight = 1.25, anchor = "start", family = "Arial, Helvetica, sans-serif" } = {}) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + Math.round(index * size * lineHeight)}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${xmlEscape(line)}</text>`
  )).join("");
}

function cleanLinkedInCreativeText(row = {}) {
  return selectedCaption(row)
    .replace(/Follow Gopu Exports for export insights and global trade updates\./gi, "")
    .replace(/#[A-Za-z][A-Za-z0-9_]*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLinkedInKnowledgeItems(row = {}) {
  const clean = cleanLinkedInCreativeText(row);
  const lines = clean.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (!match) continue;
    const description = lines[index + 1] && !/^\d{1,2}[.)]\s+/.test(lines[index + 1]) ? lines[index + 1] : "";
    items.push({
      number: match[1],
      title: match[2],
      description
    });
  }
  if (items.length) return items.slice(0, 8);

  return lines
    .filter((line) => line.length > 18 && !/^founder note:?$/i.test(line))
    .slice(1, 7)
    .map((line, index) => ({ number: String(index + 1), title: line, description: "" }));
}

function linkedInKnowledgeTitle(row = {}) {
  const rowMetadata = metadata(row);
  const topic = text(row.topic || row.campaign_name || rowMetadata.topic);
  if (topic) return topic.replace(/\s+--\s+/g, ": ");
  const firstLine = cleanLinkedInCreativeText(row).split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return firstLine || "Export Knowledge Guide";
}

function linkedInKnowledgeIntro(row = {}) {
  const lines = cleanLinkedInCreativeText(row).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const intro = lines.find((line, index) => index > 0 && line.length > 30 && !/^\d{1,2}[.)]\s+/.test(line));
  return intro || "A practical buyer education card from GOPU Exports for safer import/export decisions.";
}

async function renderLinkedInKnowledgeCardBuffer(row = {}) {
  const width = 1080;
  const height = 1080;
  const titleLines = wrapText(linkedInKnowledgeTitle(row), 30, 3);
  const introLines = wrapText(linkedInKnowledgeIntro(row), 62, 2);
  const items = extractLinkedInKnowledgeItems(row);
  const cardWidth = 450;
  const cardHeight = 112;
  const leftX = 70;
  const rightX = 560;
  const startY = 314;
  const gapY = 18;
  const visibleItems = items.slice(0, 6);
  const itemCards = visibleItems.map((item, index) => {
    const col = index % 2;
    const rowIndex = Math.floor(index / 2);
    const x = col === 0 ? leftX : rightX;
    const y = startY + rowIndex * (cardHeight + gapY);
    const title = wrapText(item.title, 27, 2);
    const description = wrapText(item.description, 44, 2);
    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="#ffffff" stroke="#d6dce5" stroke-width="2"/>
        <rect x="${x + 18}" y="${y + 18}" width="42" height="42" rx="10" fill="#0B1F3A"/>
        <text x="${x + 39}" y="${y + 47}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#ffffff">${xmlEscape(item.number)}</text>
        <circle cx="${x + cardWidth - 34}" cy="${y + 34}" r="16" fill="#F7F2E3" stroke="#D4A437" stroke-width="2"/>
        <path d="M${x + cardWidth - 42} ${y + 34} L${x + cardWidth - 35} ${y + 41} L${x + cardWidth - 25} ${y + 27}" fill="none" stroke="#D4A437" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        ${svgText(title, { x: x + 76, y: y + 35, size: 21, weight: 800, fill: "#0B1F3A", lineHeight: 1.12, family: "Montserrat, Poppins, Inter, Arial, sans-serif" })}
        ${svgText(description, { x: x + 76, y: y + 78, size: 15, weight: 500, fill: "#334155", lineHeight: 1.24, family: "Inter, Arial, sans-serif" })}
      </g>
    `;
  }).join("");

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#F4F6F8"/>
      <rect x="0" y="0" width="${width}" height="270" fill="#0B1F3A"/>
      <rect x="0" y="270" width="${width}" height="8" fill="#D4A437"/>
      <circle cx="956" cy="98" r="76" fill="#153153"/>
      <circle cx="1008" cy="162" r="42" fill="#233F63"/>
      <path d="M718 170 C790 108, 874 104, 976 152" fill="none" stroke="#D4A437" stroke-opacity="0.46" stroke-width="6" stroke-linecap="round"/>
      <path d="M736 200 C826 158, 906 168, 1010 226" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="5" stroke-linecap="round"/>
      <rect x="318" y="48" width="3" height="170" fill="#D4A437"/>
      ${svgText(titleLines, { x: 344, y: 76, size: titleLines.length > 2 ? 34 : 39, weight: 900, fill: "#ffffff", lineHeight: 1.08, family: "Montserrat, Poppins, Inter, Arial, sans-serif" })}
      ${svgText(introLines, { x: 344, y: 204, size: 18, weight: 500, fill: "#DDE6F2", lineHeight: 1.32, family: "Inter, Arial, sans-serif" })}
      <text x="70" y="304" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#0B1F3A">EXPORT INDUSTRY INSIGHT</text>
      <text x="1010" y="304" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#D4A437">LINKEDIN KNOWLEDGE CARD</text>
      ${itemCards}
      <rect x="70" y="724" width="940" height="98" rx="18" fill="#ffffff" stroke="#d6dce5" stroke-width="2"/>
      <text x="100" y="760" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="20" font-weight="900" fill="#0B1F3A">FINAL CHECK BEFORE SHIPMENT</text>
      <text x="100" y="792" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" fill="#334155">Confirm payment terms, documents, port, quality specs, and shipment timeline before production.</text>
      <text x="986" y="878" text-anchor="end" font-family="Montserrat, Poppins, Inter, Arial, sans-serif" font-size="58" font-weight="900" fill="#0B1F3A" opacity="0.08">GOPU EXPORTS</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function downloadImageBuffer(imageUrl) {
  const cleanUrl = text(imageUrl);
  if (!cleanUrl) return { ok: false, status: "missing_image_url", message: "No image URL available for logo stamping." };
  const dataMatch = cleanUrl.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (dataMatch) return { ok: true, buffer: Buffer.from(dataMatch[1], "base64") };

  const response = await fetch(cleanUrl, { signal: AbortSignal.timeout(Number(env("CMO_IMAGE_DOWNLOAD_TIMEOUT_MS") || 30000)) });
  if (!response.ok) return { ok: false, status: "image_download_failed", message: `Image download failed with HTTP ${response.status}.` };
  return { ok: true, buffer: Buffer.from(await response.arrayBuffer()) };
}

async function uploadApprovalImage(client, row, imageBuffer, options = {}) {
  const bucket = storageBucket();
  const suffix = text(options.revisionSuffix);
  const filename = [safeStorageSlug(row.run_id || row.id), suffix].filter(Boolean).join("-");
  const storagePath = `cmo/approval-assets/${new Date().toISOString().slice(0, 10)}/${filename}.png`;
  const upload = await client.storage.from(bucket).upload(storagePath, imageBuffer, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600"
  });
  if (upload.error) return { ok: false, status: "storage_upload_failed", message: upload.error.message, bucket, storagePath };
  const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) return { ok: false, status: "storage_public_url_missing", message: "Supabase Storage did not return a public URL.", bucket, storagePath };
  return { ok: true, publicUrl, bucket, storagePath };
}

async function upsertPosterLink(client, row, publicUrl) {
  if (!row?.id || !publicUrl) return;
  const payload = {
    tenant_id: row.tenant_id || demoTenantId,
    content_history_id: row.id,
    run_id: row.run_id || "",
    platform: row.platform || "LinkedIn",
    platform_target: row.platform || "LinkedIn",
    link_type: "poster",
    label: "Slack approval preview image",
    url: publicUrl,
    poster_url: publicUrl,
    publish_status: row.publish_status || "not_published",
    timezone: row.timezone || metadata(row).timezone || "Asia/Kolkata",
    country: row.country || metadata(row).country || "India",
    audit_references: Array.isArray(row.audit_references) ? row.audit_references : []
  };
  const existing = await client
    .from("content_links")
    .select("id")
    .eq("content_history_id", row.id)
    .eq("link_type", "poster")
    .limit(1)
    .maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") return;
  if (existing.data?.id) {
    await client.from("content_links").update(payload).eq("id", existing.data.id);
  } else {
    await client.from("content_links").insert(payload);
  }
}

export async function ensureCmoSlackApprovalCreative(row, options = {}) {
  const imagePrompt = resolveImagePrompt(row, options);
  const imageUrl = existingImageUrl(row);
  const rowMetadata = metadata(row);
  const client = row?.id ? getOptionalClient(options.client) : null;
  if (isCmoCanvaRequired(row)) {
    const canva = await ensureCmoCanvaDesignForApproval(row, { client, force: options.force === true });
    return canva.content_history || { ...row, image_prompt: "" };
  }
  const linkedinBrandingRequired = isLinkedInContentPlatform(row.platform) || options.logoStamp === true;
  const approvalGeneration = rowMetadata.approval_image_generation || {};
  const linkedinKnowledgeCardCurrent = approvalGeneration.provider === "sharp" && approvalGeneration.model === "linkedin-knowledge-card";

  if (!options.force && (imageUrl || env("CMO_DISABLE_APPROVAL_IMAGE_GENERATION") === "true")) {
    if (client && row?.id && imageUrl && isLinkedInContentPlatform(row.platform) && !linkedinKnowledgeCardCurrent) {
      try {
        const renderedBuffer = await renderLinkedInKnowledgeCardBuffer(row);
        const stampedBuffer = await stampGopuExportsLogo(renderedBuffer);
        const uploaded = await uploadApprovalImage(client, row, stampedBuffer, {
          revisionSuffix: options.revisionSuffix || `linkedin-card-${Date.now()}`
        });
        if (uploaded.ok) {
          await upsertPosterLink(client, row, uploaded.publicUrl);
          const patch = {
            image_prompt: imagePrompt.prompt,
            poster_url: uploaded.publicUrl,
            ...(isLinkedInPersonal(row) ? {} : { image_url: uploaded.publicUrl }),
            metadata: {
              ...rowMetadata,
              image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
              poster_url: uploaded.publicUrl,
              approval_preview_url: uploaded.publicUrl,
              approval_image_prompt_source: imagePrompt.source,
              approval_image_generation: {
                ok: true,
                provider: "sharp",
                model: "linkedin-knowledge-card",
                bucket: uploaded.bucket,
                storage_path: uploaded.storagePath,
                logo_stamp: "GOPU EXPORTS",
                website_footer: LINKEDIN_WEBSITE_FOOTER,
                at: nowIso()
              }
            }
          };
          const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
          if (!error) return data || { ...row, ...patch };
        }
      } catch {
        // Fall through to the normal existing-image path if deterministic rendering fails.
      }
    }
    if (client && row?.id && imageUrl && linkedinBrandingRequired && !hasLinkedInBranding(row)) {
      const downloaded = await downloadImageBuffer(imageUrl).catch((error) => ({
        ok: false,
        status: "image_download_exception",
        message: error instanceof Error ? error.message : String(error || "Image download failed.")
      }));
      if (downloaded.ok) {
        try {
          const stampedBuffer = await stampGopuExportsLogo(downloaded.buffer);
          const uploaded = await uploadApprovalImage(client, row, stampedBuffer, {
            revisionSuffix: options.revisionSuffix || `linkedin-brand-${Date.now()}`
          });
          if (uploaded.ok) {
            await upsertPosterLink(client, row, uploaded.publicUrl);
            const patch = {
              image_prompt: imagePrompt.prompt,
              poster_url: uploaded.publicUrl,
              ...(isLinkedInPersonal(row) ? {} : { image_url: uploaded.publicUrl }),
              metadata: {
                ...rowMetadata,
                image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
                poster_url: uploaded.publicUrl,
                approval_preview_url: uploaded.publicUrl,
                approval_image_prompt_source: imagePrompt.source,
                approval_image_generation: {
                  ok: true,
                  provider: "sharp",
                  model: "linkedin-brand-stamp-existing-image",
                  source_image_url: imageUrl,
                  bucket: uploaded.bucket,
                  storage_path: uploaded.storagePath,
                  logo_stamp: "GOPU EXPORTS",
                  website_footer: LINKEDIN_WEBSITE_FOOTER,
                  at: nowIso()
                }
              }
            };
            const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
            if (!error) return data || { ...row, ...patch };
          }
        } catch {
          // Fall through to the normal no-force return path below.
        }
      }
    }
    if (client && row?.id && !row.image_prompt && imagePrompt.prompt) {
      const patch = {
        image_prompt: imagePrompt.prompt,
        metadata: {
          ...rowMetadata,
          image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
          approval_image_prompt_source: imagePrompt.source
        }
      };
      const { data } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
      return data || { ...row, ...patch };
    }
    return { ...row, image_prompt: row.image_prompt || imagePrompt.prompt };
  }

  if (!client) return { ...row, image_prompt: imagePrompt.prompt };

  if (isLinkedInContentPlatform(row.platform)) {
    try {
      const renderedBuffer = await renderLinkedInKnowledgeCardBuffer(row);
      const stampedBuffer = await stampGopuExportsLogo(renderedBuffer);
      const uploaded = await uploadApprovalImage(client, row, stampedBuffer, {
        revisionSuffix: options.revisionSuffix || (options.force ? `linkedin-card-${Date.now()}` : "")
      });
      if (uploaded.ok) {
        await upsertPosterLink(client, row, uploaded.publicUrl);
        const patch = {
          image_prompt: imagePrompt.prompt,
          poster_url: uploaded.publicUrl,
          ...(isLinkedInPersonal(row) ? {} : { image_url: uploaded.publicUrl }),
          metadata: {
            ...rowMetadata,
            image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
            poster_url: uploaded.publicUrl,
            approval_preview_url: uploaded.publicUrl,
            approval_image_prompt_source: imagePrompt.source,
            approval_image_generation: {
              ok: true,
              provider: "sharp",
              model: "linkedin-knowledge-card",
              bucket: uploaded.bucket,
              storage_path: uploaded.storagePath,
              logo_stamp: "GOPU EXPORTS",
              website_footer: LINKEDIN_WEBSITE_FOOTER,
              at: nowIso()
            }
          }
        };
        const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
        if (!error) return data || { ...row, ...patch };
      }
    } catch {
      // Fall back to the image model below if deterministic rendering fails.
    }
  }

  if (linkedinBrandingRequired && options.stampExistingImage && imageUrl) {
    const downloaded = await downloadImageBuffer(imageUrl).catch((error) => ({
      ok: false,
      status: "image_download_exception",
      message: error instanceof Error ? error.message : String(error || "Image download failed.")
    }));
    if (downloaded.ok) {
      try {
        const stampedBuffer = await stampGopuExportsLogo(downloaded.buffer);
        const uploaded = await uploadApprovalImage(client, row, stampedBuffer, {
          revisionSuffix: options.revisionSuffix || `logo-${Date.now()}`
        });
        if (uploaded.ok) {
          await upsertPosterLink(client, row, uploaded.publicUrl);
          const patch = {
            image_prompt: imagePrompt.prompt,
            poster_url: uploaded.publicUrl,
            ...(isLinkedInPersonal(row) ? {} : { image_url: uploaded.publicUrl }),
            metadata: {
              ...rowMetadata,
              image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
              poster_url: uploaded.publicUrl,
              approval_preview_url: uploaded.publicUrl,
              approval_image_prompt_source: imagePrompt.source,
              approval_image_generation: {
                ok: true,
                provider: "sharp",
                model: "logo-stamp-existing-image",
                source_image_url: imageUrl,
                bucket: uploaded.bucket,
                storage_path: uploaded.storagePath,
                logo_stamp: "GOPU EXPORTS",
                website_footer: LINKEDIN_WEBSITE_FOOTER,
                at: nowIso()
              }
            }
          };
          const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
          if (!error) return data || { ...row, ...patch };
        }
      } catch {
        // Fall back to regenerating the base creative below.
      }
    }
  }

  const generated = await generateApprovalImageBuffer(imagePrompt.prompt);
  if (!generated.ok) {
    const patch = {
      image_prompt: imagePrompt.prompt,
      metadata: {
        ...rowMetadata,
        image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
        approval_image_generation: { ok: false, status: generated.status, message: generated.message, at: nowIso() },
        approval_image_prompt_source: imagePrompt.source
      }
    };
    const { data } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    return data || { ...row, ...patch };
  }

  let finalImageBuffer = generated.buffer;
  let logoStampStatus = "";
  let websiteFooterStatus = "";
  if (linkedinBrandingRequired) {
    try {
      finalImageBuffer = await stampGopuExportsLogo(generated.buffer);
      logoStampStatus = "GOPU EXPORTS";
      websiteFooterStatus = LINKEDIN_WEBSITE_FOOTER;
    } catch (error) {
      logoStampStatus = `failed: ${error instanceof Error ? error.message : String(error || "logo stamp failed")}`;
    }
  }
  const uploaded = await uploadApprovalImage(client, row, finalImageBuffer, {
    revisionSuffix: options.revisionSuffix || (options.force ? `rev-${Date.now()}` : "")
  });
  if (!uploaded.ok) {
    const patch = {
      image_prompt: imagePrompt.prompt,
      metadata: {
        ...rowMetadata,
        image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
        approval_image_generation: { ok: false, status: uploaded.status, message: uploaded.message, at: nowIso() },
        approval_image_prompt_source: imagePrompt.source
      }
    };
    const { data } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    return data || { ...row, ...patch };
  }

  await upsertPosterLink(client, row, uploaded.publicUrl);
  const patch = {
    image_prompt: imagePrompt.prompt,
    poster_url: uploaded.publicUrl,
    ...(isLinkedInPersonal(row) ? {} : { image_url: uploaded.publicUrl }),
    metadata: {
      ...rowMetadata,
      image_prompt: rowMetadata.image_prompt || imagePrompt.prompt,
      poster_url: uploaded.publicUrl,
      approval_preview_url: uploaded.publicUrl,
      approval_image_prompt_source: imagePrompt.source,
      approval_image_generation: {
        ok: true,
        provider: "openai",
        model: generated.model,
        bucket: uploaded.bucket,
        storage_path: uploaded.storagePath,
        logo_stamp: logoStampStatus,
        website_footer: websiteFooterStatus,
        at: nowIso()
      }
    }
  };
  const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
  if (error) return { ...row, ...patch };
  return data || { ...row, ...patch };
}

function normalizeHashtags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean).map((tag) => tag.startsWith("#") ? tag : `#${tag}`);
  return [];
}

export function cmoSlackActionValue(row, action) {
  return JSON.stringify({
    action,
    run_id: row.run_id,
    content_history_id: row.id,
    tenant_id: row.tenant_id || demoTenantId,
    module: "CMO",
    related_table: "content_history",
    related_record_id: row.id
  });
}

function approvalUrl(row) {
  const base = env("GOPU_OS_BASE_URL") || env("APP_BASE_URL") || env("VERCEL_URL") || "http://127.0.0.1:5173";
  const normalizedBase = base.startsWith("http") ? base : `https://${base}`;
  return `${normalizedBase.replace(/\/$/, "")}/cmo/approvals?run_id=${encodeURIComponent(row.run_id || "")}`;
}

export function buildCmoSlackApprovalBlocks(row, options = {}) {
  const interactive = options.interactive === true;
  const hashtags = normalizeHashtags(row.hashtags || metadata(row).hashtags);
  const caption = selectedCaption(row) || "No caption available.";
  const imageUrl = existingImageUrl(row);
  const canvaGeneration = metadata(row).canva_generation || metadata(row).canva || {};
  const scheduledTime = row.scheduled_for || row.scheduled_at || metadata(row).scheduled_time || metadata(row).scheduled_for || "Not scheduled";
  const status = row.approval_status || "waiting";
  const channelDisplay = env("SLACK_CHANNEL_NAME_FOR_DISPLAY") || "#all-gopu-os";

  const blocks = [
    { type: "header", text: { type: "plain_text", text: "GOPU OS - CMO Director approval needed" } },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Action needed*\nReview this ${row.platform || "social"} Canva-rendered content. Approve, reject, or request a modification before anything can publish.` }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Run ID*\n${row.run_id || "Unknown"}` },
        { type: "mrkdwn", text: `*Platform*\n${row.platform || "LinkedIn"}` },
        { type: "mrkdwn", text: `*Scheduled time*\n${scheduledTime}` },
        { type: "mrkdwn", text: `*Approval status*\n${status}` },
        { type: "mrkdwn", text: `*Slack channel display*\n${channelDisplay}` }
      ]
    },
    { type: "section", text: { type: "mrkdwn", text: `*Post copy*\n${cleanSlackText(truncate(caption))}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Hashtags*\n${hashtags.length ? hashtags.join(" ") : "No hashtags provided."}` } }
  ];

  if (imageUrl) {
    blocks.push({
      type: "image",
      image_url: imageUrl,
      alt_text: "GOPU OS CMO Canva-rendered creative preview"
    });
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Canva creative status*\n${cleanSlackText(truncate(canvaGeneration.message || canvaGeneration.status || "Canva rendering is required before this can publish.", 1200))}`
      }
    });
  }

  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: "Safety: No public publishing will happen until Founder/Director approval is recorded." }] });

  if (interactive) {
    blocks.push({
      type: "actions",
      block_id: `cmo_approval_${row.run_id || row.id}`.slice(0, 255),
      elements: [
        { type: "button", text: { type: "plain_text", text: "Approve" }, style: "primary", action_id: "cmo_approve", value: cmoSlackActionValue(row, "approve") },
        { type: "button", text: { type: "plain_text", text: "Reject" }, style: "danger", action_id: "cmo_reject", value: cmoSlackActionValue(row, "reject") },
        { type: "button", text: { type: "plain_text", text: "Modify" }, action_id: "cmo_modify", value: cmoSlackActionValue(row, "modify") }
      ]
    });
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "Modify requires Slack bot interactivity. Use GOPU OS UI or CLI fallback." }
    });
    blocks.push({
      type: "actions",
      block_id: `cmo_approval_fallback_${row.run_id || row.id}`.slice(0, 255),
      elements: [
        { type: "button", text: { type: "plain_text", text: "Open GOPU OS approval" }, url: approvalUrl(row) }
      ]
    });
  }

  return blocks;
}

function fallbackText(row) {
  const hashtags = normalizeHashtags(row.hashtags || metadata(row).hashtags).join(" ");
  const caption = selectedCaption(row) || "No caption available.";
  const imageUrl = existingImageUrl(row);
  const imagePrompt = resolveImagePrompt(row).prompt;
  return cleanSlackText([
    "*GOPU OS - CMO Director approval needed*",
    "",
    "*Action needed*",
    "Review this content and approve, reject, or request modification.",
    "",
    "*Details*",
    `Run ID: ${row.run_id || "Unknown"}`,
    `Platform: ${row.platform || "LinkedIn"}`,
    `Post copy: ${truncate(caption, 900)}`,
    `Hashtags: ${hashtags || "None"}`,
    imageUrl ? `Image preview: ${imageUrl}` : `Image prompt: ${truncate(imagePrompt, 300) || "Not recorded"}`,
    "",
    "*Safety*",
    "No public publishing will happen until founder approval is recorded."
  ].join("\n"));
}

async function slackApi(method, body, token = env("SLACK_BOT_TOKEN")) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data?.ok === true, httpStatus: response.status, data };
}

async function recordSlackMessageReference(client, row, details = {}) {
  if (!client || !row?.id) return;
  const rowMetadata = metadata(row);
  const previousReference = row.slack_message_reference && typeof row.slack_message_reference === "object" ? row.slack_message_reference : {};
  const nextReference = {
    ...previousReference,
    approval_id: previousReference.approval_id || `cmo-${row.run_id || row.id}`,
    requested_at: nowIso(),
    slack_message_ts: details.ts || previousReference.slack_message_ts || "",
    slack_channel_id: details.channel || previousReference.slack_channel_id || "",
    status: details.status || previousReference.status || "sent",
    interactive: details.interactive === true,
    image_prompt_present: Boolean(row.image_prompt || rowMetadata.image_prompt),
    poster_url: existingImageUrl(row)
  };
  await client
    .from("content_history")
    .update({
      slack_message_reference: nextReference,
      metadata: {
        ...rowMetadata,
        slack_approval_sent_at: nextReference.requested_at,
        slack_approval_status: nextReference.status
      }
    })
    .eq("id", row.id);
}

export async function sendCmoSlackApprovalMessage(row, options = {}) {
  const botToken = env("SLACK_BOT_TOKEN");
  const channelId = env("SLACK_CHANNEL_ID");
  const webhookUrl = env("SLACK_WEBHOOK_URL") || env("SLACK_APPROVAL_WEBHOOK_URL");
  const interactive = Boolean(botToken && channelId && env("SLACK_SIGNING_SECRET"));
  const client = row?.id ? getOptionalClient(options.client) : null;
  const creativeRow = options.skipCreative === true ? row : await ensureCmoSlackApprovalCreative(row, { client });
  const blocks = buildCmoSlackApprovalBlocks(creativeRow, { interactive });

  if (botToken && channelId) {
    const result = await slackApi("chat.postMessage", {
      channel: channelId,
      text: fallbackText(creativeRow),
      blocks
    }, botToken);
    if (result.ok) {
      await recordSlackMessageReference(client, creativeRow, { status: "sent_bot", interactive, channel: channelId, ts: result.data?.ts || "" });
      return { ok: true, status: "sent_bot", interactive, channel: channelId, ts: result.data?.ts || "", blocks, content_history: creativeRow };
    }
    if (!webhookUrl) return { ok: false, status: result.data?.error || "bot_send_failed", interactive, required_scopes: ["chat:write"], blocks };
  }

  if (!webhookUrl) return { ok: false, status: "not_configured", interactive: false, blocks };
  if (!/^https:\/\/hooks\.slack(?:-gov)?\.com\/services\//i.test(webhookUrl)) return { ok: false, status: "invalid_webhook", interactive: false, blocks };
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: fallbackText(creativeRow), blocks })
  });
  const responseText = await response.text().catch(() => "");
  const ok = response.ok && responseText.trim() === "ok";
  if (ok) await recordSlackMessageReference(client, creativeRow, { status: "sent_webhook", interactive: false });
  return { ok, status: response.ok ? "sent_webhook" : "webhook_failed", interactive: false, httpStatus: response.status, blocks, content_history: creativeRow };
}

export function verifySlackSignature(headers = {}, rawBody = "") {
  const signingSecret = env("SLACK_SIGNING_SECRET");
  if (!signingSecret) return { ok: false, status: "missing_signing_secret" };
  const signature = String(headers["x-slack-signature"] || headers["X-Slack-Signature"] || "");
  const timestamp = String(headers["x-slack-request-timestamp"] || headers["X-Slack-Request-Timestamp"] || "");
  const requestTime = Number(timestamp);
  if (!signature || !timestamp || !Number.isFinite(requestTime)) return { ok: false, status: "missing_signature_headers" };
  if (Math.abs(Math.floor(Date.now() / 1000) - requestTime) > 300) return { ok: false, status: "stale_signature" };
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return { ok: false, status: "invalid_signature" };
  return { ok: true, status: "verified" };
}

async function writeAudit(client, row, actionType, description, extra = {}) {
  const { error } = await client.from("audit_logs").insert({
    tenant_id: row.tenant_id || demoTenantId,
    action_type: actionType,
    action: actionType,
    module: "CMO Slack Approval",
    related_table: "content_history",
    related_record_id: row.id,
    record_type: "content_history",
    record_id: row.id,
    actor: "Slack Founder Action",
    actor_role: "Founder",
    description,
    notes: description,
    risk_level: extra.risk_level || "Medium",
    metadata: {
      run_id: row.run_id,
      test_mode: metadata(row).test_mode === true,
      no_public_publish: metadata(row).test_mode === true,
      ...extra.metadata
    }
  });
  if (error) throw new Error(`audit_logs insert failed: ${error.message}`);
}

async function readHistory(client, runId, contentHistoryId) {
  let query = client.from("content_history").select("*");
  if (contentHistoryId) query = query.eq("id", contentHistoryId);
  else query = query.eq("run_id", runId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`content_history read failed: ${error.message}`);
  if (!data?.id) throw new Error("Content package not found.");
  return data;
}

async function updateApprovalRows(client, row, patch) {
  const { error } = await client.from("content_approvals").update(patch).eq("content_history_id", row.id);
  if (error) throw new Error(`content_approvals update failed: ${error.message}`);
}

async function sendConfirmation(row, message) {
  const webhookUrl = env("SLACK_WEBHOOK_URL") || env("SLACK_APPROVAL_WEBHOOK_URL");
  if (!webhookUrl || !/^https:\/\/hooks\.slack(?:-gov)?\.com\/services\//i.test(webhookUrl)) return { ok: false, status: "not_configured" };
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cleanSlackText(`*GOPU OS - CMO approval update*\nRun ID: ${row.run_id || "Unknown"}\nStatus: ${message}`) })
  });
  const body = await response.text().catch(() => "");
  return { ok: response.ok && body.trim() === "ok", status: response.ok ? "sent" : "failed" };
}

function productionSlackActionsBlocked(row) {
  if (metadata(row).test_mode === true) return false;
  if (env("CMO_BLOCK_PRODUCTION_SLACK_APPROVAL") === "true") return true;
  if (env("CMO_ALLOW_PRODUCTION_SLACK_APPROVAL") === "false") return true;
  return false;
}

function shouldAutoApplyCreativeModification(notes = "") {
  return /\b(image|poster|visual|creative|font|text|letter|typography|language|script|english|character|gibberish|logo|brand|wordmark|company)\b/i.test(notes);
}

function shouldStampGopuLogo(notes = "", aiRevision = {}) {
  const haystack = [
    notes,
    aiRevision.summary,
    aiRevision.revised_image_prompt,
    ...(Array.isArray(aiRevision.risk_notes) ? aiRevision.risk_notes : [])
  ].filter(Boolean).join(" ");
  return /\b(gopu\s+exports|company\s+logo|brand\s+logo|logo|wordmark)\b/i.test(haystack);
}

function isLogoOnlyModification(notes = "") {
  if (!shouldStampGopuLogo(notes)) return false;
  const normalized = text(notes).toLowerCase();
  return !/\b(regenerate|redesign|new\s+image|change\s+(the\s+)?background|replace\s+(the\s+)?image|remove|font|language|script|laptop|dashboard|document|label|signage|colour|color|style)\b/i.test(normalized);
}

function buildModifiedApprovalImagePrompt(row = {}, notes = "") {
  const caption = selectedCaption(row);
  const logoRequested = isLinkedInContentPlatform(row.platform) && shouldStampGopuLogo(notes);
  return [
    `Create a revised approval-preview image for ${row.platform || "LinkedIn"} content for GOPU Exports.`,
    caption ? `Post context: ${caption.slice(0, 700)}` : "",
    notes ? `Founder modification request: ${notes.slice(0, 600)}` : "",
    logoRequested
      ? "The company logo will be added separately after generation. Leave clean empty space in the top-left for a GOPU EXPORTS logo stamp."
      : "Critical visual rule: do not include any visible text, letters, numbers, logos, UI labels, signage, captions, typography, watermark, or language characters in the image.",
    "Avoid all non-English scripts and avoid fake/gibberish writing. Do not show laptop screens, dashboard screens, documents, labels, seals with writing, forms, or any surface that might contain writing.",
    "Make it a clean visual-only business image using only unlabeled shipping cartons, a simple approval shield motif, spice bowls, and abstract world map silhouettes without labels.",
    "Professional LinkedIn founder post style, realistic studio lighting, polished business composition, no claims that anything is already published."
  ].filter(Boolean).join(" ");
}

export async function processCmoSlackApprovalAction({ client: providedClient, action, runId, contentHistoryId, notes = "", slackUserId = "", triggerId = "", responseUrl = "" } = {}) {
  const client = getClient(providedClient);
  const row = await readHistory(client, runId, contentHistoryId);
  if (productionSlackActionsBlocked(row)) {
    throw new Error("Production Slack approval processing is disabled by CMO_BLOCK_PRODUCTION_SLACK_APPROVAL.");
  }
  const decidedAt = nowIso();
  const baseMetadata = metadata(row);

  if (action === "approve") {
    const patch = {
      approval_status: "approved",
      publish_status: "queued",
      approved_at: decidedAt,
      approved_at_utc: decidedAt,
      metadata: { ...baseMetadata, current_step: 7, workflow_stage: "publishing", slack_approved_at: decidedAt, slack_user_id: slackUserId, no_public_publish: baseMetadata.test_mode === true }
    };
    const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    if (error) throw new Error(`content_history approve failed: ${error.message}`);
    await updateApprovalRows(client, data, { approval_status: "approved", status: "Approved", approved_at: decidedAt, approved_at_utc: decidedAt, notes: notes || "Approved from Slack." });
    await writeAudit(client, data, "cmo_slack_approval_approved", "Approved from Slack. Publishing queue unlocked.", { metadata: { slack_user_id: slackUserId } });
    await sendConfirmation(data, "Approved. Publishing queue unlocked.");
    return { ok: true, status: "approved", content_history: data };
  }

  if (action === "reject") {
    const patch = {
      approval_status: "rejected",
      publish_status: "rejected",
      rejected_at: decidedAt,
      rejected_at_utc: decidedAt,
      metadata: { ...baseMetadata, workflow_stage: "rejected", slack_rejected_at: decidedAt, slack_user_id: slackUserId, rejection_reason: notes || "" }
    };
    const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
    if (error) throw new Error(`content_history reject failed: ${error.message}`);
    await updateApprovalRows(client, data, { approval_status: "rejected", status: "Rejected", rejected_at: decidedAt, rejected_at_utc: decidedAt, notes: notes || "Rejected from Slack." });
    await writeAudit(client, data, "cmo_slack_approval_rejected", "Rejected from Slack. Returned to edit queue.", { metadata: { slack_user_id: slackUserId, notes } });
    await sendConfirmation(data, "Rejected. Returned to edit queue.");
    return { ok: true, status: "rejected", content_history: data };
  }

  if (action === "modify") {
    if (triggerId && env("SLACK_BOT_TOKEN")) {
      const view = {
        type: "modal",
        callback_id: "cmo_modify_submit",
        private_metadata: JSON.stringify({ run_id: row.run_id, content_history_id: row.id }),
        title: { type: "plain_text", text: "CMO Modify Request" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [{
          type: "input",
          block_id: "modify_notes",
          label: { type: "plain_text", text: "Tell OpenAI what version you want" },
          element: {
            type: "plain_text_input",
            action_id: "notes",
            multiline: true,
            placeholder: { type: "plain_text", text: "Example: change the image, remove non-English text, make the copy more founder-led." }
          }
        }]
      };
      const modal = await slackApi("views.open", { trigger_id: triggerId, view });
      if (modal.ok) return { ok: true, status: "modal_opened", modal_supported: true };
      return { ok: false, status: modal.data?.error || "modal_failed", modal_supported: true, required_scopes: ["chat:write", "commands/interactivity"] };
    }

    return await processCmoModifyRequest({ client, runId: row.run_id, contentHistoryId: row.id, notes: notes || "Modify requested from Slack fallback.", slackUserId, responseUrl });
  }

  throw new Error(`Unsupported CMO Slack action: ${action}`);
}

export async function processCmoModifyRequest({ client: providedClient, runId, contentHistoryId, notes = "", slackUserId = "" } = {}) {
  const client = getClient(providedClient);
  const row = await readHistory(client, runId, contentHistoryId);
  const decidedAt = nowIso();
  const modificationNotes = text(notes, "Modify requested.");
  const aiRevision = await callOpenAIModificationRevision(row, modificationNotes).catch((error) => ({
    ok: false,
    status: "openai_modify_exception",
    message: error instanceof Error ? error.message : String(error || "OpenAI modify interpretation failed.")
  }));
  const autoApplyCreative = shouldAutoApplyCreativeModification(modificationNotes);
  const copyChangeRequired = Boolean(aiRevision.ok && aiRevision.copy_change_required && aiRevision.revised_post_copy);
  const imageChangeRequired = Boolean(autoApplyCreative || (aiRevision.ok && aiRevision.image_change_required && aiRevision.revised_image_prompt));
  const manualReviewRequired = Boolean(aiRevision.ok && aiRevision.manual_review_required);
  const autoApplyRevision = (copyChangeRequired || imageChangeRequired) && !manualReviewRequired;
  const revisedPostCopy = copyChangeRequired ? text(aiRevision.revised_post_copy) : "";
  const logoStampRequested = isLinkedInContentPlatform(row.platform) && shouldStampGopuLogo(modificationNotes, aiRevision.ok ? aiRevision : {});
  const aiRevisionMetadata = aiRevision.ok
    ? {
        ok: true,
        status: aiRevision.status,
        summary: aiRevision.summary,
        copy_change_required: aiRevision.copy_change_required,
        image_change_required: aiRevision.image_change_required,
        manual_review_required: aiRevision.manual_review_required,
        logo_stamp_requested: logoStampRequested,
        risk_notes: aiRevision.risk_notes
      }
    : { ok: false, status: aiRevision.status, message: aiRevision.message, logo_stamp_requested: logoStampRequested };
  const patch = {
    ...(copyChangeRequired ? { final_text: revisedPostCopy } : {}),
    approval_status: autoApplyRevision ? "pending_approval" : "needs_edit",
    publish_status: autoApplyRevision ? "not_published" : "needs_edit",
    rejected_at: autoApplyRevision ? null : decidedAt,
    rejected_at_utc: autoApplyRevision ? null : decidedAt,
    metadata: {
      ...metadata(row),
      workflow_stage: autoApplyRevision ? "founder_approval" : "modify_requested",
      modification_request: modificationNotes,
      modification_requested_at: decidedAt,
      modification_auto_applied: autoApplyRevision,
      modification_ai_revision: aiRevisionMetadata,
      slack_user_id: slackUserId
    }
  };
  const { data, error } = await client.from("content_history").update(patch).eq("id", row.id).select("*").maybeSingle();
  if (error) throw new Error(`content_history modify failed: ${error.message}`);

  if (!autoApplyRevision) {
    await updateApprovalRows(client, data, { approval_status: "needs_edit", status: "Needs Edit", rejected_at: decidedAt, rejected_at_utc: decidedAt, notes: modificationNotes });
    await writeAudit(client, data, "cmo_slack_approval_modify_requested", "Modify request received. OpenAI interpretation recorded for editor follow-up.", {
      metadata: { slack_user_id: slackUserId, modification_request: modificationNotes, ai_revision: aiRevisionMetadata }
    });
    await sendConfirmation(data, aiRevision.ok ? "Modify request received. OpenAI marked this for editor follow-up." : "Modify request received.");
    return { ok: true, status: "needs_edit", content_history: data, ai_revision: aiRevisionMetadata };
  }

  const revisedImagePrompt = text(aiRevision.ok ? aiRevision.revised_image_prompt : "");
  const logoInstruction = logoStampRequested
    ? "Company logo handling: do not render any logo or text inside the generated scene. Leave clean empty space in the top-left; GOPU OS will stamp the exact GOPU EXPORTS logo separately after image generation."
    : "";
  const promptOverride = revisedImagePrompt
    ? [
        revisedImagePrompt,
        logoInstruction,
        "Safety: unless exact English words were explicitly requested, do not include visible text, letters, numbers, non-English script, fake writing, watermarks, labels, dashboards, laptop screens, documents, forms, or signage. Prefer only unlabeled cartons, approval shield, spice bowls, and abstract world map shapes."
      ].filter(Boolean).join(" ")
    : buildModifiedApprovalImagePrompt(data, modificationNotes);
  const modified = imageChangeRequired
    ? await ensureCmoSlackApprovalCreative(data, {
        client,
        force: true,
        promptOverride,
        logoStamp: logoStampRequested,
        stampExistingImage: logoStampRequested && isLogoOnlyModification(modificationNotes),
        revisionSuffix: `modified-${Date.now()}`
      })
    : data;
  await updateApprovalRows(client, modified, {
    approval_status: "pending_approval",
    status: "Pending",
    rejected_at: null,
    rejected_at_utc: null,
    notes: `OpenAI modification applied: ${aiRevision.ok ? aiRevision.summary : modificationNotes}`
  });
  await writeAudit(client, modified, "cmo_slack_approval_modify_applied", "OpenAI interpreted and auto-applied the modify request, then resent approval.", {
    metadata: {
      slack_user_id: slackUserId,
      modification_request: modificationNotes,
      ai_revision: aiRevisionMetadata,
      copy_change_required: copyChangeRequired,
      image_change_required: imageChangeRequired,
      poster_url: existingImageUrl(modified)
    }
  });
  const slack = await sendCmoSlackApprovalMessage(modified, { client, skipCreative: true });
  await sendConfirmation(modified, slack.ok ? "OpenAI modification applied. Updated approval card sent." : "OpenAI modification applied. Updated approval card could not be sent.");
  return { ok: true, status: "modified_resubmitted", content_history: modified, slack, ai_revision: aiRevisionMetadata };
}

export function parseSlackActionPayload(payload = {}) {
  if (payload.type === "view_submission") {
    const privateMeta = JSON.parse(payload.view?.private_metadata || "{}");
    const notes = payload.view?.state?.values?.modify_notes?.notes?.value || "";
    return { action: "modify_submit", runId: privateMeta.run_id, contentHistoryId: privateMeta.content_history_id, notes, slackUserId: payload.user?.id || "" };
  }
  const action = payload.actions?.[0] || {};
  const value = JSON.parse(action.value || "{}");
  const actionId = action.action_id || "";
  const normalized = actionId === "cmo_approve" ? "approve" : actionId === "cmo_reject" ? "reject" : actionId === "cmo_modify" ? "modify" : value.action;
  return { action: normalized, runId: value.run_id, contentHistoryId: value.content_history_id, slackUserId: payload.user?.id || "", triggerId: payload.trigger_id || "", responseUrl: payload.response_url || "" };
}
