export const LINKEDIN_CORE_HASHTAG = "#GOPUExports";
export const LINKEDIN_PERSONAL_FOLLOW_TEXT = "Follow Gopu Exports for export insights and global trade updates.";
export const LINKEDIN_COMPANY_TAG = "@GOPU Exports";
export const LINKEDIN_WEBSITE_FOOTER = "www.gopuexports.com";

export const LINKEDIN_TOPIC_HASHTAGS = [
  "#ExportBusiness",
  "#InternationalTrade",
  "#ImportExport",
  "#GlobalTrade",
  "#SupplyChain",
  "#Logistics",
  "#ExportTips"
];

export const LINKEDIN_CONTENT_TOPICS = [
  "Educational export insights",
  "Buyer education",
  "Export compliance",
  "Logistics",
  "International trade",
  "Spice industry knowledge",
  "Import/export business tips"
];

export const LINKEDIN_REFERENCE_STYLE_GUIDE = [
  "LinkedIn-only knowledge-post creative style based on the founder-uploaded reference screenshots.",
  "Use a professional corporate infographic layout: clear headline, short intro, 4-6 clean sections, compact information tiles, and a premium footer.",
  "Design quality should match international trading companies, commodity trading groups, logistics companies, export consultants, and trade finance firms.",
  "Use navy blue #0B1F3A, white, and gold #D4A437. Keep branding subtle and premium.",
  "GOPU EXPORTS logo must appear top-left, small and professional, never oversized.",
  "Footer must include GOPU EXPORTS, Global Trade - Spices - Rice - Agricultural Products, www.gopuexports.com, LinkedIn: GOPU Exports, Instagram: @gopuexports, Facebook: GOPU Exports.",
  "Use only deterministic rendered text with HTML/CSS/SVG fonts such as Montserrat, Poppins, Inter, or fallback sans-serif. Never rely on AI image rendering for text.",
  "Do not create cartoons, anime, comic style, mascots, funny illustrations, memes, AI-generated people, childish designs, or hand-drawn artwork.",
  "Use export industry visuals: container ships, ports, terminals, warehouses, export products, trade documents, supply chain visuals, professional business icons, process diagrams, timelines, comparison tables, country maps, and trade routes."
].join("\n");

export const LINKEDIN_IMAGE_PROMPT_REQUIREMENTS = [
  "LinkedIn-only style guide: professional B2B corporate infographic for GOPU EXPORTS.",
  "Canvas: 1080x1080 square LinkedIn creative, navy blue #0B1F3A, white, and gold #D4A437.",
  "Use 4-6 clean sections with professional icons, short headings, and maximum two lines of supporting text.",
  "Use flowcharts, process diagrams, timelines, comparison tables, country maps, trade routes, container ships, ports, terminals, warehouses, export products, trade documents, and supply chain visuals.",
  "No cartoons, anime, comic style, mascots, funny illustrations, meme graphics, AI-generated people, childish designs, or hand-drawn artwork.",
  "All final text must be rendered deterministically using HTML/CSS/SVG fonts, never generated as part of an AI image.",
  "Footer must include GOPU EXPORTS, Global Trade - Spices - Rice - Agricultural Products, www.gopuexports.com, LinkedIn: GOPU Exports, Instagram: @gopuexports, Facebook: GOPU Exports."
].join(" ");

export const LINKEDIN_KNOWLEDGE_HUB_ENTRY = {
  role: "CMO",
  platform: "LinkedIn",
  category: "LinkedIn Knowledge Hub",
  topic_cluster: "LinkedIn educational export knowledge-post template",
  knowledge_key: "linkedin_default_knowledge_post_template_v1",
  knowledge_value: [
    LINKEDIN_REFERENCE_STYLE_GUIDE,
    "",
    "Default LinkedIn posting rule:",
    "1. Use this style only for LinkedIn content and LinkedIn creatives.",
    "2. Do not modify Instagram or Facebook content styles.",
    "3. Every LinkedIn creative must include the GOPU EXPORTS logo top-left and professional footer branding.",
    "4. Every LinkedIn post must include #GOPUExports.",
    "5. Add export hashtags: #ExportBusiness #InternationalTrade #ImportExport #GlobalTrade #SupplyChain #Logistics #ExportTips.",
    "6. Include/tag @GOPU Exports.",
    "7. LinkedIn Personal posts should also include: Follow Gopu Exports for export insights and global trade updates.",
    "8. Do not publish LinkedIn content unless #GOPUExports is present.",
    "9. Continue Slack Founder/Director approval before any publishing."
  ].join("\n"),
  hashtags: [LINKEDIN_CORE_HASHTAG, ...LINKEDIN_TOPIC_HASHTAGS],
  learning_notes: [
    "Uploaded LinkedIn reference screenshots show educational B2B knowledge posts with concise explanatory copy plus infographic/card visuals.",
    "The default creative should be a knowledge card, checklist, comparison table, document guide, logistics vocabulary, payment terms, compliance, or spice export education asset.",
    "Branding should be subtle, not a promotional banner."
  ],
  avoid_rules: [
    "Do not apply this template to Instagram.",
    "Do not apply this template to Facebook.",
    "Do not create large promotional banners.",
    "Do not publish before Slack Founder/Director approval."
  ],
  confidence_score: 0.99,
  source_metadata: {
    source: "founder_uploaded_linkedin_reference_images",
    applied_scope: "linkedin_only",
    permanent_default: true
  }
};

export function normalizeLinkedInPlatform(value = "") {
  const platform = String(value || "").trim().toLowerCase();
  if (["linkedin personal", "linkedin_personal", "linkedin-personal"].includes(platform)) return "LinkedIn Personal";
  if (platform === "linkedin" || platform === "linked in") return "LinkedIn";
  return String(value || "").trim();
}

export function isLinkedInPlatform(value = "") {
  const normalized = normalizeLinkedInPlatform(value);
  return normalized === "LinkedIn" || normalized === "LinkedIn Personal";
}

export function isLinkedInPersonalPlatform(value = "") {
  return normalizeLinkedInPlatform(value) === "LinkedIn Personal";
}

export function normalizeHashtag(tag = "") {
  const clean = String(tag || "").trim().replace(/^#+/, "");
  if (!clean) return "";
  return `#${clean.replace(/[^\p{L}\p{N}_]/gu, "")}`;
}

export function hasGopuHashtag(text = "") {
  return /(^|\s)#GopuExports\b/i.test(String(text || ""));
}

export function stripNonLinkedInSocialHandles(text = "") {
  return String(text || "")
    .replace(/(?:^|\n)[^\n]*(?:instagram|facebook|fb\.com|ig:|insta:)[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function existingHashtagSet(text = "", hashtags = []) {
  const fromText = String(text || "").match(/#[A-Za-z][A-Za-z0-9_]*/g) || [];
  const fromArray = Array.isArray(hashtags) ? hashtags : String(hashtags || "").split(/[,\s]+/);
  return new Set([...fromText, ...fromArray].map(normalizeHashtag).filter(Boolean).map((tag) => tag.toLowerCase()));
}

export function selectLinkedInTopicHashtags(topicText = "") {
  return ["#ExportBusiness", "#InternationalTrade", "#ImportExport", "#GlobalTrade", "#SupplyChain", "#Logistics", "#ExportTips"];
}

export function ensureLinkedInHashtags({ text = "", topic = "", hashtags = [] } = {}) {
  const ordered = [LINKEDIN_CORE_HASHTAG, ...selectLinkedInTopicHashtags(`${topic}\n${text}`), ...LINKEDIN_TOPIC_HASHTAGS];
  const result = [];
  for (const tag of ordered.map(normalizeHashtag).filter(Boolean)) {
    const key = tag.toLowerCase();
    if (!result.map((item) => item.toLowerCase()).includes(key)) result.push(tag);
  }
  return result.slice(0, 8);
}

export function ensureLinkedInPostRules(text = "", options = {}) {
  const platform = normalizeLinkedInPlatform(options.platform || "LinkedIn");
  if (!isLinkedInPlatform(platform)) return { text: String(text || "").trim(), hashtags: Array.isArray(options.hashtags) ? options.hashtags : [] };

  const topic = options.topic || "";
  let clean = stripNonLinkedInSocialHandles(text);
  clean = clean
    .replace(/#[A-Za-z][A-Za-z0-9_]*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!clean.includes(LINKEDIN_COMPANY_TAG)) {
    clean = `${clean}\n\n${LINKEDIN_COMPANY_TAG}`.trim();
  }
  if (isLinkedInPersonalPlatform(platform) && !clean.includes(LINKEDIN_PERSONAL_FOLLOW_TEXT)) {
    clean = `${clean}\n\n${LINKEDIN_PERSONAL_FOLLOW_TEXT}`.trim();
  }

  const requiredHashtags = ensureLinkedInHashtags({ text: clean, topic, hashtags: options.hashtags });
  clean = `${clean}\n\n${requiredHashtags.join(" ")}`.trim();

  return {
    text: clean,
    hashtags: requiredHashtags
  };
}

export function validateLinkedInPublishText(text = "") {
  if (!hasGopuHashtag(text)) {
    return { ok: false, status: "missing_gopu_hashtag", error: "LinkedIn publishing blocked: #GOPUExports is required." };
  }
  return { ok: true, status: "valid" };
}

export function linkedinImagePrompt(topic = "") {
  return [
    LINKEDIN_IMAGE_PROMPT_REQUIREMENTS,
    topic ? `Topic: ${String(topic).slice(0, 500)}` : ""
  ].filter(Boolean).join(" ");
}
