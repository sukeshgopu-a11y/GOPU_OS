import { createClient } from "@supabase/supabase-js";
import { getCtoProviderSecret } from "./ctoProviderVault.mjs";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const PREMIUM_MODEL = process.env.OPENAI_CONTENT_PREMIUM_MODEL?.trim() || "gpt-5.5";
const FAST_MODEL = process.env.OPENAI_CONTENT_FAST_MODEL?.trim() || "gpt-5.5";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
const SCORE_KEYS = [
  "Hook Quality",
  "Founder Authority",
  "Engagement Potential",
  "Trust Level",
  "Clarity",
  "Platform Optimization"
];

function env(name) {
  return process.env[name]?.trim() || "";
}

function getSupabaseUrl() {
  return env("VITE_SUPABASE_URL") || env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
}

function getSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function clampScore(value, fallback = 72) {
  const score = Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function defaultScores() {
  return Object.fromEntries(SCORE_KEYS.map((key) => [key, 0]));
}

function safeJsonParse(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractText(body = {}) {
  if (typeof body.output_text === "string") return body.output_text;
  const outputText = body.output?.flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
  if (outputText) return outputText;
  return body.choices?.map((choice) => choice.message?.content || choice.text || "").join("").trim() || "";
}

function normalizeReview(parsed = {}, fallbackContent = "", improvementType = "quality_review") {
  const qualityScores = {
    "Hook Quality": clampScore(parsed.quality_scores?.["Hook Quality"] ?? parsed.quality_scores?.hook_quality),
    "Founder Authority": clampScore(parsed.quality_scores?.["Founder Authority"] ?? parsed.quality_scores?.founder_authority),
    "Engagement Potential": clampScore(parsed.quality_scores?.["Engagement Potential"] ?? parsed.quality_scores?.engagement_potential),
    "Trust Level": clampScore(parsed.quality_scores?.["Trust Level"] ?? parsed.quality_scores?.trust_level),
    "Clarity": clampScore(parsed.quality_scores?.Clarity ?? parsed.quality_scores?.clarity),
    "Platform Optimization": clampScore(parsed.quality_scores?.["Platform Optimization"] ?? parsed.quality_scores?.platform_optimization)
  };

  return {
    reviewed_content: parsed.reviewed_content || fallbackContent,
    improved_content: parsed.improved_content || fallbackContent,
    premium_rewrite: parsed.premium_rewrite || parsed.improved_content || fallbackContent,
    selected_final_version: parsed.selected_final_version || "improved",
    quality_scores: qualityScores,
    ai_suggestions: Array.isArray(parsed.ai_suggestions) ? parsed.ai_suggestions.slice(0, 8) : [],
    analysis: {
      hook_strength: parsed.analysis?.hook_strength || "Needs review",
      readability: parsed.analysis?.readability || "Needs review",
      founder_credibility: parsed.analysis?.founder_credibility || "Needs review",
      export_professionalism: parsed.analysis?.export_professionalism || "Needs review",
      engagement_potential: parsed.analysis?.engagement_potential || "Needs review",
      emotional_trust: parsed.analysis?.emotional_trust || "Needs review",
      platform_suitability: parsed.analysis?.platform_suitability || "Needs review",
      global_trade_authority_tone: parsed.analysis?.global_trade_authority_tone || "Needs review"
    },
    version_labels: ["Original", "Improved", "Premium Rewrite"],
    improvement_type: improvementType
  };
}

function systemPrompt() {
  return [
    "You are GOPU OS AI Creative Director + AI CMO for an Indian spice and agricultural export company.",
    "Products: chilli powder, turmeric, cumin, black pepper, coriander seeds. Export markets: UAE, USA, UK, Germany, Australia, Saudi Arabia, Malaysia.",
    "Your role: Review founder-led export content for maximum importer trust, global trade authority, buyer psychology, and platform-specific optimization.",
    "",
    "PLATFORM INTELLIGENCE:",
    "LinkedIn: B2B buyer audience (importers, traders, procurement heads). Best content: shipment milestone posts with port/container imagery, founder authority insights on Indian spice market, quality certification announcements (FSSAI, ISO, USDA Organic, Spice Board), price update posts with market context (mandi rates, monsoon crop season), trade fair participation (Gulfood, SIAL, FoodEx). Hook format: bold opening statement + data point + personal insight. Optimal: 150-300 words, 2-3 line breaks, 5-8 hashtags. Post 4-5x per week, Tue-Thu 8-10am IST. Use carousel banners with ship/port backgrounds for top-performing visual posts.",
    "Instagram: Visual-first, colour-rich spice photography. Best: overhead flat-lay shots of spice bowls in vibrant reds/yellows/browns, warehouse action shots, hand-holding spice product with clean white background, packing floor reels showing scale, FOB certificate close-ups. Reels outperform static 3x. Caption: 2-3 lines max + 20-25 hashtags in first comment. Post 5-7x per week.",
    "Facebook: B2B community engagement, buyer groups. Post in Indian Spice Exporters groups, AgriExport India communities. Best content: shipment completion photos, product arrival confirmation from buyers, new market entry announcements. Tag buyer countries. Post 3x per week.",
    "",
    "IMAGE DIRECTION: Preferred styles: (1) overhead spice bowl/plate on dark wood or slate background, (2) container loading at Mundra/JNPT port with GOPU branding, (3) certificate badge overlay on spice product shot, (4) split image showing Indian farm/field on left, buyer warehouse on right with connecting arrow, (5) founder in factory/warehouse with product inspection gloves.",
    "",
    "HASHTAG STRATEGY:",
    "LinkedIn core: #IndianSpiceExporter #SpiceExportIndia #ChilliExport #TurmericExporter #CuminExporter #BlackPepperExport #CorianderExport #IndianExports #GlobalSpiceTrade #B2BImporter #FoodIngredientsIndia #SpiceBoardIndia #APEDAExport #ExportFromIndia #MakeInIndia #GlobalTrade",
    "Instagram add: #SpicePhotography #SpicesOfInstagram #IndianSpices #NaturalSpices #OrganicSpices #PureSpices #SpiceLife #FoodPhotography #ColourfulSpices #SpiceLovers #IndianFlavours #SpiceMarket #BulkSpices #WholesaleSpices",
    "Export authority: #Exporter #IndiaExports #TradeFinance #LetterOfCredit #FOBIndia #QualityCertified #FSSAIApproved #ISOCertified #USDAOrganic #HACCPCertified",
    "",
    "CONTENT RULES: Never claim something was published. Founder approval required before any platform action. No guaranteed leads, no guaranteed sales. Reference real Indian export context: mandi rates, Kharif/Rabi seasons, APEDA registrations, Spice Board certificates, RoDTEP benefits, PCFC financing. Return strict JSON only."
  ].join(" ");
}

function userPrompt({ sourceContent, platform, improvementType }) {
  return JSON.stringify({
    task: "Review and improve this draft content before founder approval.",
    platform,
    improvement_type: improvementType,
    required_analysis: [
      "hook strength",
      "readability",
      "founder credibility",
      "export professionalism",
      "engagement potential",
      "emotional trust",
      "platform suitability",
      "global trade authority tone"
    ],
    required_scores: SCORE_KEYS,
    output_schema: {
      reviewed_content: "string",
      improved_content: "string",
      premium_rewrite: "string",
      selected_final_version: "improved | premium_rewrite",
      quality_scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, "0-100 integer"])),
      ai_suggestions: ["specific suggestion"],
      analysis: {
        hook_strength: "string",
        readability: "string",
        founder_credibility: "string",
        export_professionalism: "string",
        engagement_potential: "string",
        emotional_trust: "string",
        platform_suitability: "string",
        global_trade_authority_tone: "string"
      }
    },
    draft: sourceContent
  });
}

function generationPrompt({ platform, topic, tone }) {
  const platformGuide = {
    linkedin: {
      format: "150-300 words. Start with a bold 1-line hook (a surprising stat, a trade insight, or a founder confession). Then 2-3 short paragraphs with line breaks. End with a direct CTA for importers. Use 5-8 hashtags inline or at end.",
      example_hook: "We just shipped 40 MT of turmeric to Germany -- here's what buyers actually check before signing an LC.",
      image_style: "container loading at JNPT or Mundra port with GOPU branding overlay, or founder in factory with quality certificate, or split farm-to-buyer visual"
    },
    instagram: {
      format: "2-3 punchy lines. Emojis welcome. Call to action in bio link. Put 20-25 hashtags in the caption or first comment.",
      example_hook: "40 containers. 3 countries. 1 season. India's chilli harvest just shipped worldwide.",
      image_style: "overhead flat-lay of vibrant spice bowls on dark slate or wood, or hand holding spice product against white background, or warehouse action shot showing scale and operations"
    },
    facebook: {
      format: "3-4 sentences. Conversational buyer-friendly tone. Tag destination countries. Include shipment confirmation or product quality note.",
      example_hook: "Another successful shipment to UAE -- our buyers confirm quality on every container.",
      image_style: "product arrival confirmation photo or packing floor team shot or certificate badge overlay on product"
    }
  };

  const guide = platformGuide[platform?.toLowerCase()] || platformGuide.linkedin;

  return JSON.stringify({
    task: "Generate fresh founder-led Indian spice export content for GOPU OS CMO. Content must be realistic, specific, and ready for founder review.",
    platform,
    platform_format: guide.format,
    example_hook: guide.example_hook,
    topic: topic || "Indian spice export operations -- shipment milestone, buyer trust, quality certifications, or market intelligence on chilli/turmeric/cumin/black pepper/coriander",
    tone: tone || "premium, human, founder-led, global export authority, trust-building for international importers",
    brand_context: {
      company: "GOPU Exports (Indian spice and agri export company)",
      products: ["chilli powder", "turmeric", "cumin seeds", "black pepper", "coriander seeds"],
      certifications: ["FSSAI", "Spice Board of India", "APEDA registered", "ISO 22000"],
      markets: ["UAE", "USA", "Germany", "UK", "Australia", "Saudi Arabia", "Malaysia"],
      export_context: ["JNPT/Mundra port", "FOB pricing", "LC payment terms", "Kharif/Rabi crop seasons", "APEDA/Spice Board certified", "RoDTEP scheme"]
    },
    post_templates: {
      shipment_milestone: "Just loaded [X] MT of [product] for [country]. [Quality note]. [Certification reference]. DM for next season availability.",
      product_showcase: "[Product] from [region] -- [quality differentiator]. [Crop season context]. [Spec: moisture %, colour value, pungency]. Available FOB [port]. Inquiry: [CTA]",
      market_intelligence: "[Trend/insight about Indian spice market]. [Why it matters for importers]. [Our position/advantage]. [CTA for serious buyers]",
      founder_authority: "[Personal insight from X years in spice export]. [Lesson learned]. [What importers should know]. [Trust signal]"
    },
    constraints: [
      "Do not publish anything. Founder approval required.",
      "No guaranteed leads or sales claims.",
      "Reference real Indian export context: mandi rates, crop seasons, port names, certification bodies.",
      "Make it sound like a real founder who does this every day, not corporate marketing copy."
    ],
    output_schema: {
      caption: "primary platform caption ready for founder review",
      linkedin_version: "full LinkedIn authority version 150-300 words with hook + insight + CTA",
      instagram_version: "punchy 2-3 line Instagram caption with emoji, no hashtags in body",
      hashtags: ["platform-specific hashtag -- 15 to 20 relevant ones"],
      image_prompt: `Detailed gpt-image-1 prompt: ${guide.image_style}. Specify lighting, composition, style (photorealistic), and any text overlays. Make it visually match successful Indian spice export brand posts.`,
      content_topic: "topic label for content calendar",
      cta: "specific CTA text targeting UAE/EU/US importers"
    }
  });
}

async function callOpenAI({ model, sourceContent, platform, improvementType }) {
  const providerSecret = getCtoProviderSecret("openai");
  if (!providerSecret.ok) {
    return { ok: false, status: "missing_openai", message: "OpenAI key missing in CTO provider vault." };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSecret.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt({ sourceContent, platform, improvementType }) }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 404 ? "model_unavailable" : "openai_failed",
      message: body?.error?.message || "OpenAI content quality review failed."
    };
  }

  const text = extractText(body);
  const parsed = safeJsonParse(text);
  if (!parsed) return { ok: false, status: "invalid_ai_json", message: "AI review response could not be parsed." };
  return { ok: true, review: normalizeReview(parsed, sourceContent, improvementType), raw: parsed };
}

async function callOpenAIGeneration({ model, platform, topic, tone }) {
  const providerSecret = getCtoProviderSecret("openai");
  if (!providerSecret.ok) {
    return { ok: false, status: "missing_openai", message: "OpenAI key missing in CTO provider vault." };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSecret.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You are GOPU OS AI CMO for an Indian spice export company (products: chilli, turmeric, cumin, black pepper, coriander; markets: UAE, USA, Germany, UK, Australia). Generate premium founder-led export authority content that builds importer trust. Reference real Indian export context: Spice Board of India, APEDA, mandi pricing, Kharif/Rabi seasons, JNPT/Mundra port, FSSAI, RoDTEP, LC payment terms. Write like a real Indian spice founder who ships globally every day. Return strict JSON only." },
        { role: "user", content: generationPrompt({ platform, topic, tone }) }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 404 ? "model_unavailable" : "openai_failed",
      message: body?.error?.message || "OpenAI content generation failed."
    };
  }

  const parsed = safeJsonParse(extractText(body));
  if (!parsed) return { ok: false, status: "invalid_ai_json", message: "AI generation response could not be parsed." };
  return {
    ok: true,
    content: {
      caption: parsed.caption || "",
      linkedin_version: parsed.linkedin_version || parsed.caption || "",
      instagram_version: parsed.instagram_version || parsed.caption || "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 16) : [],
      image_prompt: parsed.image_prompt || "",
      content_topic: parsed.content_topic || topic || "Export authority content",
      cta: parsed.cta || ""
    },
    raw: parsed
  };
}

async function latestContentHistory(client, tenantId = DEMO_TENANT_ID) {
  const result = await client
    .from("content_history")
    .select("id,tenant_id,run_id,platform,content_type,topic,generated_text,caption,final_text,metadata,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) return null;
  return result.data || null;
}

async function ensureContentHistory(client, { tenantId, sourceContent, platform, contentHistoryId }) {
  if (contentHistoryId) {
    const existing = await client.from("content_history").select("id,tenant_id,run_id,platform").eq("id", contentHistoryId).maybeSingle();
    if (!existing.error && existing.data) return existing.data;
  }

  const latest = await latestContentHistory(client, tenantId);
  if (latest && !sourceContent) return latest;
  if (latest && sourceContent && [latest.generated_text, latest.caption, latest.final_text].filter(Boolean).includes(sourceContent)) return latest;

  const runId = `quality-${Date.now()}`;
  const insert = await client.from("content_history").insert({
    tenant_id: tenantId,
    run_id: runId,
    platform,
    content_type: "Post",
    topic: "AI quality review draft",
    caption: sourceContent,
    generated_text: sourceContent,
    approval_status: "pending_approval",
    publish_status: "not_published",
    metadata: { source: "step_2_quality_engine", founder_approval_required: true }
  }).select("id,tenant_id,run_id,platform").maybeSingle();
  if (insert.error) throw new Error(insert.error.message);
  return insert.data;
}

async function persistReview({ client, tenantId, contentHistory, sourceContent, review, model, mode }) {
  const storage = { content_versions: false, content_quality_reviews: false, ai_content_scores: false, ai_rewrite_history: false, errors: [] };
  const runId = contentHistory.run_id || `quality-${Date.now()}`;
  const versionRows = [
    { version_number: 1, version_type: "original", draft_text: sourceContent, notes: "Original generation before AI quality review." },
    { version_number: 2, version_type: "improved", draft_text: review.improved_content, notes: `Improved via ${review.improvement_type}.` },
    { version_number: 3, version_type: "premium_rewrite", draft_text: review.premium_rewrite, notes: "Premium rewrite for founder review." }
  ].map((row) => ({
    tenant_id: tenantId,
    content_history_id: contentHistory.id,
    run_id: runId,
    hashtags: [],
    approval_status: "pending_approval",
    ...row
  }));

  const versionResult = await client.from("content_versions").insert(versionRows);
  if (versionResult.error) storage.errors.push(`content_versions: ${versionResult.error.message}`);
  else storage.content_versions = true;

  const reviewResult = await client.from("content_quality_reviews").insert({
    tenant_id: tenantId,
    content_history_id: contentHistory.id,
    run_id: runId,
    model,
    mode,
    improvement_type: review.improvement_type,
    reviewed_content: review.reviewed_content,
    improved_content: review.improved_content,
    premium_rewrite: review.premium_rewrite,
    selected_final_version: review.selected_final_version,
    ai_suggestions: review.ai_suggestions,
    analysis: review.analysis,
    founder_approval_required: true
  }).select("id").maybeSingle();
  if (reviewResult.error) storage.errors.push(`content_quality_reviews: ${reviewResult.error.message}`);
  else storage.content_quality_reviews = true;

  const scoreRows = Object.entries(review.quality_scores).map(([score_name, score_value]) => ({
    tenant_id: tenantId,
    content_history_id: contentHistory.id,
    run_id: runId,
    review_id: reviewResult.data?.id || null,
    score_name,
    score_value,
    model
  }));
  const scoreResult = await client.from("ai_content_scores").insert(scoreRows);
  if (scoreResult.error) storage.errors.push(`ai_content_scores: ${scoreResult.error.message}`);
  else storage.ai_content_scores = true;

  const rewriteResult = await client.from("ai_rewrite_history").insert({
    tenant_id: tenantId,
    content_history_id: contentHistory.id,
    run_id: runId,
    review_id: reviewResult.data?.id || null,
    rewrite_type: review.improvement_type,
    original_text: sourceContent,
    rewritten_text: review.improved_content,
    premium_text: review.premium_rewrite,
    model,
    founder_approval_required: true
  });
  if (rewriteResult.error) storage.errors.push(`ai_rewrite_history: ${rewriteResult.error.message}`);
  else storage.ai_rewrite_history = true;

  return storage;
}

async function persistGeneratedContent({ client, tenantId, platform, generated, model, mode }) {
  const storage = { content_history: false, audit_logs: false, errors: [] };
  const runId = `manual-step-2-${Date.now()}`;
  const generatedText = generated.linkedin_version || generated.caption || generated.instagram_version || "";
  let contentHistory = null;

  const contentResult = await client.from("content_history").insert({
    tenant_id: tenantId,
    run_id: runId,
    platform,
    content_type: "Post",
    topic: generated.content_topic || "Manual AI CMO content",
    caption: generated.caption,
    generated_text: generatedText,
    approval_status: "pending_approval",
    publish_status: "not_published",
    metadata: {
      source: "manual_cmo_step_2_run",
      model,
      mode,
      founder_approval_required: true,
      image_prompt: generated.image_prompt,
      hashtags: generated.hashtags,
      cta: generated.cta
    }
  }).select("id,tenant_id,run_id,platform").maybeSingle();
  if (contentResult.error) storage.errors.push(`content_history: ${contentResult.error.message}`);
  else {
    storage.content_history = true;
    contentHistory = contentResult.data;
  }

  const auditPayload = {
    action_type: "CMO Step 2 manual content generated",
    module: "AI CMO Workflow",
    related_table: "content_history",
    related_record_id: contentHistory?.id || null,
    actor: "Founder OS",
    description: "Manual Step 2 content generation completed. Founder approval still required before publishing.",
    risk_level: "Medium",
    new_value: {
      platform,
      run_id: runId,
      model,
      publish_status: "not_published",
      founder_approval_required: true
    }
  };
  const auditResult = await client.from("audit_logs").insert(auditPayload);
  if (auditResult.error) storage.errors.push(`audit_logs: ${auditResult.error.message}`);
  else storage.audit_logs = true;

  return { storage, contentHistory, runId };
}

export async function getLatestContentQualityState({ tenantId = DEMO_TENANT_ID } = {}) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      status: "not_configured",
      message: "Supabase server env is missing.",
      models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL }
    };
  }

  const latest = await latestContentHistory(client, tenantId);
  if (!latest) {
    return {
      ok: true,
      status: "empty",
      message: "No content generation history connected yet.",
      models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
      quality_scores: defaultScores(),
      ai_suggestions: [],
      versions: { Original: "", Improved: "", "Premium Rewrite": "" },
      founder_approval_required: true
    };
  }

  const reviews = await client
    .from("content_quality_reviews")
    .select("*")
    .eq("content_history_id", latest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sourceContent = latest.final_text || latest.generated_text || latest.caption || "";
  const review = reviews.data ? normalizeReview({
    reviewed_content: reviews.data.reviewed_content,
    improved_content: reviews.data.improved_content,
    premium_rewrite: reviews.data.premium_rewrite,
    selected_final_version: reviews.data.selected_final_version,
    quality_scores: {},
    ai_suggestions: reviews.data.ai_suggestions || [],
    analysis: reviews.data.analysis || {}
  }, sourceContent, reviews.data.improvement_type) : null;

  return {
    ok: true,
    status: review ? "reviewed" : "needs_review",
    content_history_id: latest.id,
    platform: latest.platform,
    source_content: sourceContent,
    models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
    ...(review || {
      quality_scores: defaultScores(),
      ai_suggestions: ["Generate or paste content, then run AI quality review before founder approval."],
      analysis: {},
      versions: { Original: sourceContent, Improved: "", "Premium Rewrite": "" }
    }),
    founder_approval_required: true,
    schema_warning: reviews.error?.message || ""
  };
}

export async function generateManualContent(payload = {}) {
  const tenantId = payload.tenant_id || DEMO_TENANT_ID;
  const platform = payload.platform || "LinkedIn";
  const mode = payload.mode === "fast" ? "fast" : "premium";
  const model = mode === "fast" ? FAST_MODEL : PREMIUM_MODEL;
  const topic = String(payload.topic || "").trim();
  const tone = String(payload.tone || "").trim();

  const aiResult = await callOpenAIGeneration({ model, platform, topic, tone });
  if (!aiResult.ok) {
    return {
      ...aiResult,
      models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
      founder_approval_required: true,
      publish_status: "not_published"
    };
  }

  const client = getSupabaseClient();
  let persistence = { storage: { skipped: true, errors: [] }, contentHistory: null, runId: null };
  if (client) {
    try {
      persistence = await persistGeneratedContent({ client, tenantId, platform, generated: aiResult.content, model, mode });
    } catch (error) {
      persistence = {
        storage: { skipped: false, errors: [error.message || "Generated content persistence failed."] },
        contentHistory: null,
        runId: null
      };
    }
  }

  return {
    ok: true,
    status: "generated",
    message: persistence.storage.audit_logs === false
      ? "Content generated. Server audit persistence needs Supabase service-role repair; publishing was not started."
      : "Content generated and audit recorded. Founder approval required before publishing.",
    model,
    mode,
    models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
    platform,
    content_history_id: persistence.contentHistory?.id || null,
    run_id: persistence.runId,
    generated_content: aiResult.content,
    source_content: aiResult.content.linkedin_version || aiResult.content.caption || "",
    versions: {
      Original: aiResult.content.linkedin_version || aiResult.content.caption || "",
      Improved: "",
      "Premium Rewrite": ""
    },
    quality_scores: defaultScores(),
    ai_suggestions: ["Run AI quality improvement before sending this draft for founder approval."],
    analysis: {},
    storage: persistence.storage,
    founder_approval_required: true,
    publish_status: "not_published"
  };
}

export async function reviewContentQuality(payload = {}) {
  const tenantId = payload.tenant_id || DEMO_TENANT_ID;
  const platform = payload.platform || "LinkedIn";
  const mode = payload.mode === "fast" ? "fast" : "premium";
  const model = mode === "fast" ? FAST_MODEL : PREMIUM_MODEL;
  const improvementType = payload.improvement_type || payload.action || "quality_review";
  const sourceContent = String(payload.source_content || payload.content || "").trim();
  if (!sourceContent) {
    return {
      ok: false,
      status: "no_content",
      message: "No generated content is available for AI quality review.",
      models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL }
    };
  }

  const aiResult = await callOpenAI({ model, sourceContent, platform, improvementType });
  if (!aiResult.ok) {
    return {
      ...aiResult,
      models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
      founder_approval_required: true
    };
  }

  const client = getSupabaseClient();
  let storage = { skipped: true, errors: [] };
  let contentHistory = null;
  if (client) {
    try {
      contentHistory = await ensureContentHistory(client, {
        tenantId,
        sourceContent,
        platform,
        contentHistoryId: payload.content_history_id || null
      });
      storage = await persistReview({ client, tenantId, contentHistory, sourceContent, review: aiResult.review, model, mode });
    } catch (error) {
      storage = { skipped: false, errors: [error.message || "Quality review persistence failed."] };
    }
  }

  return {
    ok: true,
    status: "reviewed",
    content_history_id: contentHistory?.id || payload.content_history_id || null,
    platform,
    model,
    mode,
    models: { premium: PREMIUM_MODEL, fast: FAST_MODEL, image: IMAGE_MODEL },
    source_content: sourceContent,
    versions: {
      Original: sourceContent,
      Improved: aiResult.review.improved_content,
      "Premium Rewrite": aiResult.review.premium_rewrite
    },
    ...aiResult.review,
    storage,
    founder_approval_required: true,
    publish_status: "not_published"
  };
}
