/**
 * Test: ChatGPT image generation + Slack send
 *
 * Usage:
 *   node scripts/test-cmo-chatgpt-image.mjs
 *   node scripts/test-cmo-chatgpt-image.mjs --type shipment_announcement
 *   node scripts/test-cmo-chatgpt-image.mjs --type market_update
 *   node scripts/test-cmo-chatgpt-image.mjs --type product_spotlight
 *   node scripts/test-cmo-chatgpt-image.mjs --type buyer_education
 *
 * Required env vars:
 *   OPENAI_API_KEY
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (for image storage)
 *   SLACK_WEBHOOK_URL  OR  SLACK_BOT_TOKEN + SLACK_CHANNEL_ID
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  ensureCmoChatGPTImageForApproval,
  selectCmoImageContentType
} from "../lib/cmoChatGPTImageWorkflow.mjs";

// ── env loader ─────────────────────────────────────────────────────────────────
const root = process.cwd();
function loadLocalEnv() {
  for (const file of [".env.local", ".env.development", ".env"]) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) continue;
    for (const line of fs.readFileSync(target, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
    break;
  }
}
loadLocalEnv();

function env(name) {
  return process.env[name]?.trim() || "";
}

// ── args ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const typeArg = (() => {
  const i = args.indexOf("--type");
  return i !== -1 ? args[i + 1] : null;
})();

const CONTENT_TYPE_TOPICS = {
  knowledge_carousel: {
    topic: "FOB vs CIF: What Every Spice Importer Must Know",
    caption: [
      "FOB vs CIF is not just a pricing choice — it is a risk decision.",
      "",
      "1. Price Responsibility",
      "FOB: seller delivers to Indian port. CIF: seller covers freight and insurance.",
      "",
      "2. Risk Transfer",
      "Risk moves when cargo loads on vessel.",
      "",
      "3. Document Match",
      "Invoice, packing list, B/L, COA, and insurance must match buyer specs exactly.",
      "",
      "#GOPUExports #ExportBusiness #InternationalTrade #ImportExport"
    ].join("\n")
  },
  shipment_announcement: {
    topic: "Shipment Milestone: 20 MT Premium Guntur Chilli to Germany",
    caption: [
      "Loaded and sailing. 20 MT of Guntur S4 chilli, FSSAI certified, bound for Hamburg.",
      "",
      "Moisture: 10%. ASTA Color: 120+. Pungency: 80,000 SHU.",
      "",
      "#GOPUExports #GunturChilli #ExportBusiness #SpiceExporter"
    ].join("\n")
  },
  market_update: {
    topic: "Turmeric Market Update: Erode Prices Rise 12% This Season",
    caption: [
      "Erode turmeric prices have risen 12% this Kharif season.",
      "",
      "Curcumin demand from EU pharma buyers is driving early procurement.",
      "",
      "Buyers should lock in Q4 orders now before the peak season.",
      "",
      "#Turmeric #SpiceMarket #GOPUExports #InternationalTrade"
    ].join("\n")
  },
  product_spotlight: {
    topic: "Product Spotlight: Alleppey Turmeric — 4.5% Curcumin, FSSAI Certified",
    caption: [
      "Alleppey turmeric from Kerala — 4.5% curcumin, low moisture, vibrant colour.",
      "",
      "FSSAI | Spice Board | APEDA certified. Available in 25 KG and 50 KG bags.",
      "",
      "#AlleppeyTurmeric #IndianSpices #GOPUExports #SpiceExporter"
    ].join("\n")
  },
  buyer_education: {
    topic: "Buyer's Checklist: 7 Documents Every Importer Must Verify",
    caption: [
      "A shipment can be perfect — and still face customs delay if one document is wrong.",
      "",
      "7 documents every importer should verify before the container moves:",
      "1. Commercial Invoice",
      "2. Packing List",
      "3. Bill of Lading",
      "4. Certificate of Origin",
      "5. Phytosanitary Certificate",
      "6. COA (Certificate of Analysis)",
      "7. Insurance Certificate",
      "",
      "#ExportBusiness #ImportExport #GOPUExports #TradeCompliance"
    ].join("\n")
  }
};

const selectedType = typeArg || "knowledge_carousel";
const sample = CONTENT_TYPE_TOPICS[selectedType] || CONTENT_TYPE_TOPICS.knowledge_carousel;

const testRow = {
  id: `test-chatgpt-image-${Date.now()}`,
  run_id: `chatgpt-image-test-${Date.now()}`,
  tenant_id: "11111111-1111-1111-1111-111111111111",
  platform: "LinkedIn",
  topic: sample.topic,
  caption: sample.caption,
  generated_text: sample.caption,
  final_text: sample.caption,
  approval_status: "pending_approval",
  publish_status: "not_published",
  hashtags: [],
  metadata: {
    canva_template_type: selectedType,
    chatgpt_image_required: true
  }
};

// ── supabase client ─────────────────────────────────────────────────────────────
function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── slack send ─────────────────────────────────────────────────────────────────
async function sendSlackImagePreview({ imageUrl, topic, contentType, model, size, quality, elapsed }) {
  const webhookUrl = env("SLACK_WEBHOOK_URL") || env("SLACK_APPROVAL_WEBHOOK_URL");
  const botToken = env("SLACK_BOT_TOKEN");
  const channelId = env("SLACK_CHANNEL_ID");

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "GOPU OS — ChatGPT Image Generation Test"
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Topic*\n${topic}` },
        { type: "mrkdwn", text: `*Content Type*\n${contentType}` },
        { type: "mrkdwn", text: `*Model*\n${model}` },
        { type: "mrkdwn", text: `*Size / Quality*\n${size} · ${quality}` },
        { type: "mrkdwn", text: `*Generation Time*\n${elapsed}s` },
        { type: "mrkdwn", text: `*Status*\n✅ Generated & uploaded` }
      ]
    },
    {
      type: "image",
      title: { type: "plain_text", text: topic.slice(0, 80) },
      image_url: imageUrl,
      alt_text: `GOPU Exports CMO test image — ${contentType}`
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${imageUrl}|View full image> · GOPU OS CMO · ChatGPT image generator test · ${new Date().toISOString()}`
        }
      ]
    }
  ];

  // Prefer bot token (supports image blocks) then fall back to webhook
  if (botToken && channelId) {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channelId, blocks, text: `CMO test image generated: ${topic}` })
    });
    const body = await response.json().catch(() => ({}));
    if (!body.ok) throw new Error(`Slack bot API error: ${body.error || "unknown"}`);
    return { ok: true, method: "bot_api", ts: body.ts, channel: body.channel };
  }

  if (webhookUrl && /^https:\/\/hooks\.slack(?:-gov)?\.com\/services\//i.test(webhookUrl)) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, text: `CMO test image generated: ${topic}` })
    });
    const responseText = await response.text().catch(() => "");
    if (!response.ok || responseText.trim() !== "ok") {
      throw new Error(`Slack webhook failed: HTTP ${response.status} — ${responseText}`);
    }
    return { ok: true, method: "webhook" };
  }

  return { ok: false, status: "not_configured", message: "No Slack credentials found. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID." };
}

// ── run ────────────────────────────────────────────────────────────────────────
async function run() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  GOPU OS — ChatGPT Image Generation Test");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── preflight ────────────────────────────────────────────────────────────────
  const openaiKey = env("OPENAI_API_KEY");
  const supabaseUrl = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const slackConfigured = !!(env("SLACK_WEBHOOK_URL") || env("SLACK_APPROVAL_WEBHOOK_URL") || (env("SLACK_BOT_TOKEN") && env("SLACK_CHANNEL_ID")));

  console.log("Preflight checks:");
  console.log(`  OPENAI_API_KEY         ${openaiKey ? "✅ set" : "❌ MISSING"}`);
  console.log(`  SUPABASE_URL           ${supabaseUrl ? "✅ set" : "⚠️  not set (image won't be stored)"}`);
  console.log(`  SUPABASE_SERVICE_ROLE  ${supabaseKey ? "✅ set" : "⚠️  not set (image won't be stored)"}`);
  console.log(`  Slack credentials      ${slackConfigured ? "✅ set" : "⚠️  not set (Slack step will be skipped)"}`);
  console.log(`  Content type           ${selectedType}`);
  console.log(`  Model                  ${env("OPENAI_IMAGE_MODEL") || "gpt-image-1"}`);
  console.log(`  Image size             ${env("CMO_IMAGE_SIZE") || "1024x1536"}`);
  console.log(`  Image quality          ${env("CMO_IMAGE_QUALITY") || "high"}`);
  console.log("");

  if (!openaiKey) {
    console.error("❌ OPENAI_API_KEY is required. Aborting.");
    process.exit(1);
  }

  // ── detect content type from row ─────────────────────────────────────────────
  const detectedType = selectCmoImageContentType(testRow);
  console.log(`Content type detection: ${detectedType}`);
  console.log(`Topic: ${testRow.topic}\n`);

  // ── generate image ──────────────────────────────────────────────────────────
  const client = getClient();
  if (!client) {
    console.warn("⚠️  No Supabase client — image will be generated but not stored in Supabase.");
    console.warn("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable storage.\n");
  }

  console.log("Generating ChatGPT image...");
  const startedAt = Date.now();

  const result = await ensureCmoChatGPTImageForApproval(testRow, { client });
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("");
  if (!result.ok) {
    console.error(`❌ Image generation failed`);
    console.error(`   Status:  ${result.status}`);
    console.error(`   Message: ${result.message}`);
    if (result.missing) console.error(`   Missing: ${result.missing.join(", ")}`);
    process.exit(1);
  }

  const imageUrl = result.chatgpt_image?.public_url || result.content_history?.poster_url || result.content_history?.image_url || "";
  const model = result.chatgpt_image?.model || env("OPENAI_IMAGE_MODEL") || "gpt-image-1";
  const size = result.chatgpt_image?.image_size || env("CMO_IMAGE_SIZE") || "1024x1536";
  const quality = result.chatgpt_image?.image_quality || env("CMO_IMAGE_QUALITY") || "high";

  console.log(`✅ Image generated in ${elapsed}s`);
  console.log(`   Model:    ${model}`);
  console.log(`   Size:     ${size}`);
  console.log(`   Quality:  ${quality}`);
  console.log(`   URL:      ${imageUrl || "(no URL — Supabase storage not configured)"}`);
  if (result.chatgpt_image?.revised_prompt) {
    console.log(`   Revised prompt preview: ${result.chatgpt_image.revised_prompt.slice(0, 120)}...`);
  }
  console.log("");

  if (!imageUrl) {
    console.warn("⚠️  No public image URL. Configure Supabase to store and serve the image, then Slack send will work.");
    process.exit(0);
  }

  // ── send to slack ────────────────────────────────────────────────────────────
  if (!slackConfigured) {
    console.warn("⚠️  Slack not configured. Skipping Slack send.");
    console.warn("   Set SLACK_WEBHOOK_URL  OR  SLACK_BOT_TOKEN + SLACK_CHANNEL_ID to enable.");
    console.log("\nImage URL for manual review:", imageUrl);
    process.exit(0);
  }

  console.log("Sending to Slack...");
  const slack = await sendSlackImagePreview({
    imageUrl,
    topic: testRow.topic,
    contentType: detectedType,
    model,
    size,
    quality,
    elapsed
  });

  if (!slack.ok) {
    console.error(`❌ Slack send failed: ${slack.message || slack.status}`);
    console.log("\nImage URL (send manually):", imageUrl);
    process.exit(1);
  }

  console.log(`✅ Sent to Slack via ${slack.method}`);
  if (slack.ts) console.log(`   Message timestamp: ${slack.ts}`);
  if (slack.channel) console.log(`   Channel: ${slack.channel}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TEST PASSED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log(JSON.stringify({
    ok: true,
    status: "passed",
    content_type: detectedType,
    model,
    size,
    quality,
    elapsed_seconds: Number(elapsed),
    image_url: imageUrl,
    slack: slack
  }, null, 2));
}

run().catch((error) => {
  console.error("\n❌ Unhandled error:", error?.message || error);
  process.exit(1);
});
