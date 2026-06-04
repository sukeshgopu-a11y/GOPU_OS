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
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   SLACK_BOT_TOKEN + SLACK_CHANNEL_ID  OR  SLACK_WEBHOOK_URL
 */

import { createClient } from "@supabase/supabase-js";
import {
  ensureCmoChatGPTImageForApproval,
  selectCmoImageContentType
} from "../lib/cmoChatGPTImageWorkflow.mjs";
import { sendCmoSlackApprovalMessage } from "../lib/cmoSlackApproval.mjs";

function env(name) {
  return process.env[name]?.trim() || "";
}

// ── args ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const typeArg = (() => {
  const i = args.indexOf("--type");
  return i !== -1 ? args[i + 1] : null;
})();

const SAMPLES = {
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
      "7 documents every importer must verify before the container moves:",
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
const sample = SAMPLES[selectedType] || SAMPLES.knowledge_carousel;

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
    chatgpt_image_required: true,
    topic: sample.topic
  }
};

function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function run() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  GOPU OS — ChatGPT Image Generation + Slack Test");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log(`Content type : ${selectedType}`);
  console.log(`Topic        : ${testRow.topic}`);
  console.log(`Model        : ${env("OPENAI_IMAGE_MODEL") || "gpt-image-1"}`);
  console.log(`Size         : ${env("CMO_IMAGE_SIZE") || "1024x1536"}`);
  console.log(`Quality      : ${env("CMO_IMAGE_QUALITY") || "high"}`);
  console.log("");

  const client = getClient();

  // ── step 1: generate image ────────────────────────────────────────────────
  console.log("Step 1: Generating ChatGPT image...");
  const startedAt = Date.now();
  const imageResult = await ensureCmoChatGPTImageForApproval(testRow, { client });
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (!imageResult.ok) {
    console.error(`\n❌ Image generation failed (${elapsed}s)`);
    console.error(`   Status  : ${imageResult.status}`);
    console.error(`   Message : ${imageResult.message}`);
    if (imageResult.missing) console.error(`   Missing : ${imageResult.missing.join(", ")}`);
    process.exit(1);
  }

  const imageUrl = imageResult.chatgpt_image?.public_url
    || imageResult.content_history?.poster_url
    || imageResult.content_history?.image_url
    || "";

  console.log(`✅ Image generated in ${elapsed}s`);
  console.log(`   URL : ${imageUrl}`);
  console.log("");

  // ── step 2: send slack approval message ──────────────────────────────────
  console.log("Step 2: Sending Slack approval message...");
  const rowWithImage = imageResult.content_history || { ...testRow, poster_url: imageUrl, image_url: imageUrl };
  const slack = await sendCmoSlackApprovalMessage(rowWithImage, { client, skipCreative: true });

  if (!slack.ok) {
    console.error(`\n❌ Slack send failed: ${slack.status}`);
    console.error(`   Image URL for manual review: ${imageUrl}`);
    process.exit(1);
  }

  console.log(`✅ Sent to Slack`);
  if (slack.channel) console.log(`   Channel : ${slack.channel}`);
  if (slack.ts) console.log(`   Message : ${slack.ts}`);
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TEST PASSED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

run().catch((error) => {
  console.error("\n❌ Unhandled error:", error?.message || error);
  process.exit(1);
});
