import { createClient } from "@supabase/supabase-js";
import { getCtoProviderSecret } from "./ctoProviderVault.mjs";
import {
  LINKEDIN_CONTENT_TOPICS,
  LINKEDIN_KNOWLEDGE_HUB_ENTRY,
  LINKEDIN_REFERENCE_STYLE_GUIDE,
  ensureLinkedInPostRules,
  isLinkedInPlatform,
  normalizeLinkedInPlatform
} from "./cmoLinkedInRules.mjs";
import { ensureCmoCanvaApprovalRow, ensureCmoCanvaDesignForApproval } from "./cmoChatGPTImageWorkflow.mjs";

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

function normalizeReferenceLines(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeReferenceLines(item))
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeReferenceInput(payload = {}) {
  return {
    links: normalizeReferenceLines(payload.reference_links || payload.referenceLinks || payload.links),
    sample: String(payload.reference_post || payload.referencePost || payload.sample_post || payload.samplePost || payload.sample || "").trim().slice(0, 5000),
    recommendations: String(payload.reference_recommendations || payload.referenceRecommendations || payload.recommendations || payload.notes || "").trim().slice(0, 3000),
    referenceType: String(payload.reference_type || payload.referenceType || payload.content_type || payload.contentType || "").trim().slice(0, 120),
    imageDirection: String(payload.image_direction || payload.imageDirection || payload.visual_direction || payload.visualDirection || "").trim().slice(0, 1200)
  };
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
  return `You are GOPU OS AI Creative Director + AI CMO for an Indian spice and agricultural export company (GOPU Exports).

COMPANY PROFILE:
Products: Guntur chilli powder (S4/S10), Erode/Alleppey turmeric, Rajasthan cumin seeds, Malabar black pepper, coriander powder.
Certifications: FSSAI, APEDA registered, Spice Board of India, ISO 22000, HACCP, HALAL, KOSHER.
Export markets: UAE, Saudi Arabia, Germany, UK, USA, Australia, Malaysia.
Ports: JNPT (Nhava Sheva), Mundra. Payment terms: LC, TT advance. Seasons: Kharif (Oct-Nov harvest), Rabi (Feb-Mar).

PLATFORM INTELLIGENCE (research-verified 2025):
LinkedIn (B2B importers/procurement heads):
- Carousel/document posts get 6.60% engagement -- highest of any format. Best: "5 things to verify before buying Indian chilli powder" educational carousel (6-10 slides, 1080x1080px, max 40 words/slide, bold numbers prominent).
- Founder narrative posts outperform corporate announcements 3-5x. Hook must fit before "See more" cutoff.
- Post formula: 1-line hook + blank line + 3-6 short paragraphs (1-2 sentences each) + CTA + 2-3 hashtags ONLY (2025 algorithm penalises stuffing).
- Timing: Tue-Thu, 8:30-10:00 AM IST (catches UAE morning 6:30 AM GST), 12:00-1:00 PM IST (catches EU 8:30 AM CET).
- Frequency: 3-4 posts/week. Mix: 2 carousels + 1 founder post + 1 trade update.
- Tag @APEDAIndia @SpicesBoardIndia in shipment posts for reshare potential.

LINKEDIN KNOWLEDGE HUB DEFAULT (founder-uploaded reference style, LinkedIn only):
${LINKEDIN_REFERENCE_STYLE_GUIDE}
LinkedIn copy must always include #GOPUExports and @GOPU Exports. LinkedIn Personal copy should include: Follow Gopu Exports for export insights and global trade updates.
LinkedIn company page copy should include @Gopu Exports when company page posting is available.
Do not apply this LinkedIn creative style to Instagram or Facebook.

IMAGE GENERATION RULE:
For every CMO social post, AI generates the headline, slide content, caption, and hashtags. ChatGPT image generation (gpt-image-1) renders the final branded graphic using brand colors (navy #0D2A4A, gold #D4AF37) and the post topic. AI will generate the image directly — include a clear topic/headline that can guide the image prompt.

Instagram (discovery, diaspora, brand awareness):
- Reels (15-30 seconds) are #1 discovery format 2025. Best reel: raw chilli -> cleaned -> dried -> ground -> packed -> shipped time-lapse. Color pour shots of turmeric are highly shareable.
- Static: overhead flat-lay of vibrant spice bowl on dark charcoal/slate, hessian/jute burlap flat lay, macro texture close-up of ground spice.
- Farm+product diptych: chilli field left, export powder right. Port background with branded carton.
- Hashtags: 8-15 in caption or first comment (2025 best practice, not 25+).
- Frequency: 3-4 Reels/week + 2-3 static + daily Stories (polls, BTS, product).

Facebook (trade communities, bulk enquiry, diaspora retail):
- Native video gets highest organic reach. Post in groups: "Indian Spice Exporters & Importers", "Agro Commodity Traders India", "FMCG Import Export UAE", "Indian Grocery Wholesale UK", "Halal Food Importers".
- Photo album posts for shipments: 5-8 photos (loading, weighing, lab cert, container, documents).
- Festival posts (Eid, Diwali, Christmas) with product imagery perform well for Eastern/Gulf diaspora buyers.
- Frequency: 4-5 page posts/week + 2-3 group posts/week.

IMAGE DESIGN SYSTEM:
Colors: Saffron/turmeric yellow #E8A020, Cardinal red #C8102E, Earthy brown #8B4513, Gold #D4AF37 (premium feel), Black #0A0A0A or dark charcoal for backgrounds.
5 proven templates:
(1) Spec Card: 60% product photo left + 40% dark background with product name/specs/certs/brand right -- LinkedIn/Facebook trade post.
(2) Port Announcement: container ship at golden hour (soft-focus) + bold text overlay "SHIPPED: 20 MT Turmeric -> Germany" + cert badge row at bottom.
(3) Farm to Fork: vertical split -- chilli field left / export pack right -- thin brand-color divider line.
(4) Cert Badge Wall: product image 60% background + row of FSSAI/APEDA/ISO/HALAL/KOSHER shields + headline "Every batch. Every time."
(5) Color Pop: single spice dramatic overhead lighting on contrasting surface -- no text overlay, all copy in caption.

COMPETITIVE INTELLIGENCE:
- Everest Spices (90K Instagram): color-rich product shots, recipe content, festival posts.
- Eastern Condiments (705K Facebook likes): diaspora community, cooking videos.
- MDH/eastern: weak B2B export-facing LinkedIn -- open lane for technical spec carousels and buyer-education content.
- APEDA LinkedIn pattern: "APEDA facilitated first export consignment of Fresh #Turmeric from #Varanasi to #UAE" -- mirror this format, tag official bodies.

CONTENT PILLARS: (1) Quality Proof -- lab certs, COA, ASTA color, curcumin %, moisture %; (2) Origin Story -- Guntur/Erode/Alleppey/Rajasthan provenance; (3) Shipment Milestones -- container departures, new markets; (4) Market Education -- buyer guides, spec reading; (5) Founder/People -- trust and relationships.

RULES: Never claim something was published. Founder approval required. No guaranteed leads/sales. Sound like a real Indian founder who ships daily, not corporate marketing copy. Return strict JSON only.`;
}

export function getCmoContentSystemPrompt() {
  return systemPrompt();
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

function generationPrompt({ platform, topic, tone, references = {} }) {
  const platformGuide = {
    youtube: {
      format: "YouTube title, description, thumbnail direction, and founder-led script plan. For long-form: 8-12 minute authority video with hook, 5-7 chapters, buyer CTA, and pinned comment. For Shorts: 30-45 seconds with opening line, 3 proof points, and one CTA. Keep trade claims proof-safe.",
      example_posts: [
        "Title: Why serious importers ask for ASTA value before buying Indian chilli powder\n\nDescription: In this video, we explain how ASTA colour, moisture percentage, and lab documentation change the buyer's risk when sourcing Guntur chilli powder from India.\n\nChapters: Hook, what ASTA means, why moisture matters, buyer documentation checklist, how GOPU prepares export batches, CTA for importers.",
        "Title: From Indian mandi to UAE warehouse: how a spice export batch is prepared\n\nDescription: A founder-led walkthrough of sourcing, cleaning, grinding, lab testing, packing, documentation, and port dispatch for export-grade spice shipments."
      ],
      image_style: "OPTION A -- YouTube Thumbnail: 16:9 thumbnail, deep trade green background (#10251A), photorealistic Indian spice export bags and bowls of turmeric/chilli/cumin in foreground, port container texture in background, bold white headline with 3-5 words max, small gold GOPU Exports mark bottom-right. OPTION B -- Founder Authority Thumbnail: 16:9 editorial thumbnail, spice samples and COA/lab report documents on a dark desk, Indian port map subtle in background, headline in white and saffron, professional B2B export look, no exaggerated expressions, no misleading claims."
    },
    linkedin: {
      format: "150-300 words. Hook must fit before LinkedIn 'See more' cutoff (1-2 sentences max). Then blank line. Then 3-6 short paragraphs (1-2 sentences each) with arrows (-->) or checkmarks (checkmark) for scanability. End with direct CTA for importers. Use 2-3 hashtags ONLY at the end (2025 algorithm). Carousel/doc posts get 6.60% engagement -- suggest a carousel version if topic suits education.",
      example_posts: [
        "20 MT of Guntur chilli powder just sailed for Hamburg.\n\nThis wasn't a quick deal. It took 3 months of sample approvals, lab testing, and moisture spec negotiations.\n\nGerman buyers don't want the cheapest. They want documentation they can show their own auditors.\n\n-> ASTA 80+ color value\n-> Moisture below 12%\n-> NABL-accredited COA on every batch\n-> FSSAI + HACCP + EU pesticide residue report\n\nIf you're importing Indian chilli powder to Europe -- DM us.\n\n#IndianSpices #SpiceExporter #FoodExport",
        "I started with one 20-foot container to UAE in 2018. The buyer paid 30 days late. We barely broke even.\n\nBut they reordered in 45 days.\n\nThat reorder changed everything -- not because of revenue, but because I learned: once you earn an international buyer's trust, you keep it IF you keep quality consistent.\n\nSince then: 11 countries. Same ASTA spec. Same moisture level. Same lab report format they can hand to their QA team.\n\nNew importers: I'm happy to talk. No minimum order lecture. Real specs, real prices.\n\n#ExportBusiness #IndianSpices #AgriExport"
      ],
      image_style: "OPTION A — B2B Shipment Graphic (most credible for LinkedIn): Square graphic, deep maroon background (#3D0B0B). Center: studio flat-lay top-down photo of five small white ceramic bowls each with a different spice — golden turmeric powder, dark red chilli powder, green coriander powder, brown cumin seeds, black pepper — arranged on dark weathered wood. Bold white serif headline above: 'Premium Export Quality Spices'. Below bowls: row of small certification badge icons — APEDA, Spices Board India, ISO 22000, FSSAI — in white/gold. Company logo bottom-right in saffron/gold text. Thin saffron horizontal rule at very bottom. Warm authoritative feel, no clutter, professional. OPTION B — Port Announcement Graphic: Rectangle 1200x627px. Left 55%: real photo of India Pavilion booth at Gulfood Dubai — branded display, product samples on counter, exporters in formal attire talking to buyers. Right 45%: deep forest green (#1A3C2A) panel. Bold white headline: 'Shipped: 20 MT Guntur Chilli to Germany'. Three white bullet lines below: product type, certification, lead time. Bottom strip: company logo white + stand number text. Looks like a real professional trade event post from Suhana/Pravin Masalewale style."
    },
    instagram: {
      format: "2-4 punchy lines. Emojis for flag/product context. CTA to DM or bio link. 8-15 hashtags in caption or first comment (not 25+ -- 2025 best practice). For Reels: 15-30 seconds max, subtitles, music.",
      example_posts: [
        "This red isn't from a filter.\n\nGuntur S4 chilli powder -- ASTA 80+, moisture below 12%, zero additives.\n\nExporting to UAE, Germany, UK, USA, Saudi Arabia.\n\n📦 MOQ: 500 kg | 25 kg PP bags or vacuum packs\n📩 DM for samples\n\n#IndianSpices #ChilliPowder #SpiceExporter #GunturChilli #OrganicSpices #FoodExport #MadeInIndia #SpiceLovers #BulkSpices #FSSAIApproved",
        "From Erode farm to your warehouse. 7 steps.\n\nFarm selection -> cleaning -> drying -> cold grinding -> NABL lab test -> APEDA inspection -> vacuum seal\n\nCurcumin content: 3.5%+ guaranteed. Shipping to 11 countries.\n\n📩 DM for spec sheet\n\n#TurmericPowder #AlleppeyTurmeric #SpiceExporter #FarmToFork #HACCPCertified #APEDAIndia"
      ],
      image_style: "OPTION A — Color Pop (highest Instagram scroll-stop rate): Square photograph, professional food photography. A branded kraft paper retail pouch placed at angle on dark slate surface, surrounded by scattered whole spices — cardamom pods, cinnamon sticks, star anise, black peppercorns, whole red chillies. Soft directional studio light from upper-left, gentle shadows. NO text overlay on image — all copy in caption. Shallow depth of field, foreground spices slightly blurred. Warm magazine-quality look. Style: Badshah Masala / Everest Spices recipe photography standard. OPTION B — Flat Lay Grid: Top-down overhead shot. 5 copper or white ceramic bowls with different spices arranged symmetrically on hessian/jute burlap fabric. Each bowl labelled with small kraft paper tag (handwritten style). Natural light from window, soft shadows. Rich saturated spice colors against neutral burlap. Instagram food photography style. No graphic overlays — authentic and shareable."
    },
    facebook: {
      format: "3-5 sentences or structured spec card with bullet points. Conversational trade-friendly tone. Include full product specs, certifications, MOQ, and contact. Post in groups: 'Indian Spice Exporters & Importers', 'Agro Commodity Traders India', 'FMCG Import Export UAE', 'Indian Grocery Wholesale UK'. Tag destination countries with flags.",
      example_posts: [
        "CHILLI POWDER -- AVAILABLE FOR EXPORT | New Season Stock\n\nProduct: Guntur Sannam S4 Chilli Powder\nOrigin: Andhra Pradesh, India\nASTA Color: 80+ | Moisture: <12%\nPackaging: 25 kg PP bags / 1 MT jumbo bags\nCertifications: FSSAI | APEDA | ISO 22000 | HALAL\n\nExporting to: UAE, Saudi Arabia, Germany, UK, USA\nLead time: 15-20 days from order confirmation\nMOQ: 1 MT\n\n#ChilliPowder #SpiceExporter #IndianSpices #HalalCertified",
        "Rajasthan Cumin Harvest Update -- New Crop Available\n\nThe 2025 harvest is underway. Early reports: clean bold seeds, high volatile oil content, good colour from favourable weather.\n\nBookings open for Q2 shipments. MOQ 500 kg. FSSAI | APEDA | ISO | KOSHER | HALAL.\n\nMarkets: UAE | Saudi | UK | Germany | USA\n\nDM or comment with your requirement."
      ],
      image_style: "OPTION A — Cert Badge Wall (best for trade group credibility): Square graphic. Background: gradient deep charcoal (#1C1C1C) to very dark brown (#2A1A0A). Center: high-resolution photo of a white PP woven export bag with printed label 'Turmeric Powder | 25 KG NET | Origin: India' in red-green-white label design. Visible on bag: APEDA and Spices Board India certification stickers. Around bag: subtle turmeric powder sprinkle and a few whole turmeric fingers on dark surface. Top text (bold white): 'Export-Grade Turmeric | Farm to Destination'. Bottom row: small certification badge icons — FSSAI, HACCP, ISO 22000, HALAL, KOSHER — in white. Company logo bottom-right in gold text. Communicates compliance and B2B reliability without clutter. OPTION B — Festival Trade Post: Warm saffron-orange background. Center: arranged product pouches/bags of spice range (chilli, turmeric, cumin, pepper) fanned out slightly. Top text in decorative gold font: 'Eid Mubarak' or 'Happy Diwali'. Small text below: 'Wishing our partners across the Gulf a blessed season. New crop available — contact us for Q4 pricing.' Company logo bottom-right. Style: Eastern Condiments festival post."
    }
  };

  const platformKey = isLinkedInPlatform(platform) ? "linkedin" : String(platform || "").toLowerCase();
  let guide = platformGuide[platformKey] || platformGuide.linkedin;
  if (isLinkedInPlatform(platform)) {
    guide = {
      ...guide,
      format: [
        "LinkedIn-only educational export knowledge post.",
        "Hook must fit before LinkedIn See More cutoff. Then blank line.",
        "Use concise paragraphs and practical buyer education: compliance, documents, logistics, payment terms, spice industry knowledge, or import/export tips.",
        "Use scan-friendly bullets, numbered lists, or checklist sections like the uploaded LinkedIn references.",
        "Always include #GOPUExports #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips and tag @GOPU Exports.",
        "If platform is LinkedIn Personal, include exactly: Follow Gopu Exports for export insights and global trade updates.",
        "The LinkedIn creative footer must include LinkedIn: GOPU Exports, Instagram: @gopuexports, and Facebook: GOPU Exports."
      ].join(" "),
      image_style: "ChatGPT gpt-image-1 generated 1024x1536 professional branded graphic using GOPU navy/gold brand colors. Image prompt is derived from the post topic and headline.",
      example_posts: [
        "In international trade, documentation is not paperwork. It is shipment control.\n\nA buyer can have the right product and still face delays if one document is wrong.\n\nKey documents every importer should verify:\n1. Commercial Invoice\n2. Packing List\n3. Bill of Lading\n4. Certificate of Origin\n5. Letter of Credit or payment proof\n6. Insurance Certificate\n7. Customs and export declarations\n\nA strong supplier does not only ship goods. They help the buyer reduce compliance risk before the container moves.\n\nFollow Gopu Exports for export insights and global trade updates.\n\n@GOPU Exports\n\n#GOPUExports #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips",
        "Choosing the right payment term is a trade risk decision.\n\nAdvance payment, LC, DP, DA, and open account all shift risk between buyer and exporter.\n\nFor new importers, the safer question is not just price. It is whether the document flow, bank process, and shipment timeline match the payment term.\n\nPractical tip: align payment terms before production, not after dispatch.\n\nFollow Gopu Exports for export insights and global trade updates.\n\n@GOPU Exports\n\n#GOPUExports #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips"
      ]
    };
  }
  const referenceInput = normalizeReferenceInput(references);

  return JSON.stringify({
    task: "Generate fresh founder-led Indian spice export content for GOPU OS CMO. Content must be realistic, specific, and ready for founder review.",
    platform,
    platform_format: guide.format,
    example_hook: guide.example_hook,
    topic: topic || "Indian spice export operations -- shipment milestone, buyer trust, quality certifications, or market intelligence on chilli/turmeric/cumin/black pepper/coriander",
    tone: tone || "premium, human, founder-led, global export authority, trust-building for international importers",
    reference_learning: {
      platform_reference_links: referenceInput.links,
      reference_type: referenceInput.referenceType || "Reference post / competitor post / preferred content style",
      sample_post_or_script: referenceInput.sample,
      founder_recommendations: referenceInput.recommendations,
      preferred_image_direction: referenceInput.imageDirection,
      learning_rules: [
        "Use reference links and sample text only as style/structure guidance.",
        "Do not copy the reference post word-for-word.",
        "Extract hook style, pacing, CTA style, visual direction, proof style, hashtag pattern, and platform format.",
        "Keep every claim proof-safe for GOPU Exports and route sensitive wording to founder approval."
      ]
    },
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
      headline: "short image-ready headline, maximum 12 words",
      slides: [
        {
          heading: "short slide or section heading",
          body: "1-2 lines of concise slide content, no long paragraphs"
        }
      ],
      caption: "primary platform caption ready for founder review",
      youtube_version: "YouTube package with title, description, chapter outline or Shorts script, thumbnail direction, pinned comment CTA, and 5-8 hashtags",
      linkedin_version: isLinkedInPlatform(platform)
        ? "LinkedIn educational knowledge post in the premium corporate infographic reference style. Use buyer education/export compliance/logistics/trade/spice knowledge. Include #GOPUExports #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips and tag @GOPU Exports. For LinkedIn Personal include: Follow Gopu Exports for export insights and global trade updates."
        : "full LinkedIn authority version 150-300 words. Hook before See-More cutoff. Blank line after hook. 3-6 short paragraphs. Arrow (-->) or checkmark bullets for specs/certs. Close with direct importer CTA.",
      instagram_version: "punchy 2-4 line Instagram caption with emojis and flag emojis for markets. No hashtags in body text. End with DM/bio CTA.",
      facebook_version: "structured trade post with product specs, certifications, MOQ, and contact info. Tag destination countries with flag emoji. Suitable for group posting.",
      hashtags: isLinkedInPlatform(platform)
        ? ["LinkedIn-only hashtags. Always include #GOPUExports #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips and tag @GOPU Exports."]
        : ["8 to 15 platform-specific hashtags -- mix of product (#GunturChilli #AlleppeyTurmeric #MalabarPepper), trade (#SpiceExporter #APEDAIndia #FSSAIApproved #HACCPCertified), and discovery (#IndianSpices #SpicesOfIndia #FoodExport #MadeInIndia)"],
      canva_template_type: "knowledge_carousel | shipment_announcement | market_update | product_spotlight | buyer_education",
      image_generation_note: "ChatGPT gpt-image-1 will generate the branded image using the headline and topic. Return the most fitting content type so the image prompt is well-targeted.",
      content_topic: "topic label for content calendar (e.g. 'Shipment Milestone -- Germany', 'Product Showcase -- Guntur Chilli', 'Crop Season Update -- Kharif 2025')",
      cta: "specific CTA text for UAE/EU/US importers (e.g. 'DM us your spec sheet', 'WhatsApp for sample request', 'Email for FOB pricing')",
      posting_timing: "optimal posting time in IST for this platform and target market"
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

async function callOpenAIGeneration({ model, platform, topic, tone, references }) {
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
        { role: "user", content: generationPrompt({ platform, topic, tone, references }) }
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
  const generatedContent = normalizeGeneratedContentForPlatform(platform, {
    headline: parsed.headline || parsed.title || "",
    slides: Array.isArray(parsed.slides) ? parsed.slides.slice(0, 10) : [],
    caption: parsed.caption || "",
    youtube_version: parsed.youtube_version || parsed.caption || "",
    linkedin_version: parsed.linkedin_version || parsed.caption || "",
    instagram_version: parsed.instagram_version || parsed.caption || "",
    facebook_version: parsed.facebook_version || parsed.caption || "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 20) : [],
    image_prompt: "",
    canva_template_type: parsed.canva_template_type || "",
    content_topic: parsed.content_topic || topic || "Export authority content",
    cta: parsed.cta || "",
    posting_timing: parsed.posting_timing || "",
    reference_learning: references || {}
  }, topic);
  return {
    ok: true,
    content: generatedContent,
    raw: parsed
  };
}

function getGeneratedTextForPlatform(platform = "", generated = {}) {
  const key = String(platform || "").toLowerCase();
  if (key.includes("youtube")) return generated.youtube_version || generated.caption || generated.linkedin_version || "";
  if (key.includes("instagram")) return generated.instagram_version || generated.caption || "";
  if (key.includes("facebook")) return generated.facebook_version || generated.caption || "";
  if (key.includes("linkedin")) return generated.linkedin_version || generated.caption || "";
  return generated.caption || generated.linkedin_version || generated.instagram_version || generated.facebook_version || generated.youtube_version || "";
}

function normalizeGeneratedContentForPlatform(platform = "", generated = {}, topic = "") {
  if (!isLinkedInPlatform(platform)) {
    return {
      ...generated,
      image_prompt: "",
      reference_learning: {
        ...(generated.reference_learning || {}),
        chatgpt_image_required: true
      }
    };
  }

  const normalizedPlatform = normalizeLinkedInPlatform(platform);
  const currentLinkedInText = generated.linkedin_version || generated.caption || "";
  const enforced = ensureLinkedInPostRules(currentLinkedInText, {
    platform: normalizedPlatform,
    topic: `${topic}\n${generated.content_topic || ""}`,
    hashtags: generated.hashtags || [],
    companyPageAvailable: normalizedPlatform === "LinkedIn" && Boolean(env("LINKEDIN_ORGANIZATION_ID"))
  });

  return {
    ...generated,
    caption: enforced.text,
    linkedin_version: enforced.text,
    hashtags: enforced.hashtags,
    image_prompt: "",
    reference_learning: {
      ...(generated.reference_learning || {}),
      linkedin_knowledge_hub_template: LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_key,
      linkedin_content_topics: LINKEDIN_CONTENT_TOPICS,
      linkedin_style_scope: "linkedin_only",
      chatgpt_image_required: true
    }
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
  const generatedText = getGeneratedTextForPlatform(platform, generated);
  let contentHistory = null;

  const contentResult = await client.from("content_history").insert({
    tenant_id: tenantId,
    run_id: runId,
    platform,
    content_type: "Post",
    topic: generated.content_topic || "Manual AI CMO content",
    caption: generated.caption,
    generated_text: generatedText,
    image_prompt: generated.image_prompt,
    hashtags: generated.hashtags,
    approval_status: "pending_approval",
    publish_status: "not_published",
    metadata: {
      source: "manual_cmo_step_2_run",
      model,
      mode,
      founder_approval_required: true,
      director_approval_required: true,
      chatgpt_image_required: true,
      image_content: {
        headline: generated.headline || generated.content_topic || "GOPU Exports",
        slides: Array.isArray(generated.slides) ? generated.slides : [],
        caption: generatedText,
        hashtags: generated.hashtags || [],
        content_type: generated.canva_template_type || ""
      },
      image_prompt: "",
      hashtags: generated.hashtags,
      cta: generated.cta,
      reference_learning: generated.reference_learning || null,
      linkedin_knowledge_hub_template: isLinkedInPlatform(platform) ? LINKEDIN_KNOWLEDGE_HUB_ENTRY.knowledge_key : null,
      linkedin_style_scope: isLinkedInPlatform(platform) ? "linkedin_only" : null
    }
  }).select("*").maybeSingle();
  if (contentResult.error) storage.errors.push(`content_history: ${contentResult.error.message}`);
  else {
    storage.content_history = true;
    contentHistory = contentResult.data;
    const approval = await ensureCmoCanvaApprovalRow(client, contentHistory);
    if (approval.ok) storage.content_approvals = true;
    else storage.errors.push(`content_approvals: ${approval.message || approval.status}`);
    const imageResult = await ensureCmoCanvaDesignForApproval(contentHistory, { client });
    if (imageResult.ok) {
      storage.chatgpt_image = true;
      contentHistory = imageResult.content_history || contentHistory;
    } else {
      storage.chatgpt_image = false;
      storage.errors.push(`chatgpt_image: ${imageResult.message || imageResult.status}`);
      contentHistory = imageResult.content_history || contentHistory;
    }
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
  const references = normalizeReferenceInput(payload);

  const aiResult = await callOpenAIGeneration({ model, platform, topic, tone, references });
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
    source_content: getGeneratedTextForPlatform(platform, aiResult.content),
    versions: {
      Original: getGeneratedTextForPlatform(platform, aiResult.content),
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
  if (isLinkedInPlatform(platform)) {
    const improved = ensureLinkedInPostRules(aiResult.review.improved_content, { platform, topic: sourceContent });
    const premium = ensureLinkedInPostRules(aiResult.review.premium_rewrite, { platform, topic: sourceContent });
    aiResult.review.improved_content = improved.text;
    aiResult.review.premium_rewrite = premium.text;
    aiResult.review.reviewed_content = ensureLinkedInPostRules(aiResult.review.reviewed_content, { platform, topic: sourceContent }).text;
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
