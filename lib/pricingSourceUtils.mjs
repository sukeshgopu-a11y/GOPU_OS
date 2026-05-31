export const PRICE_SOURCE_TYPES = {
  LIVE: "Verified Live Source",
  INTERNAL: "Internal Estimate",
  MANUAL: "Manual Entry",
  CACHED: "Cached Estimate",
  AI: "AI Estimate",
  FALLBACK: "Fallback Estimate",
};

const REQUIRED_LIVE_FIELDS = [
  "source_name",
  "source_reference",
  "fetched_at",
  "product",
  "product_grade",
  "market_location",
  "unit",
  "currency",
];

export function hasVerifiedLivePriceSource(source = {}) {
  const normalized = {
    ...source,
    source_name: source.source_name || source.price_source_name || source.source,
    source_reference: source.source_reference || source.price_source_reference || source.source_url,
    fetched_at: source.fetched_at || source.price_fetched_at || source.updated_at,
    product: source.product || source.product_key || source.product_label,
    product_grade: source.product_grade || source.grade || source.quality,
    market_location: source.market_location || source.location || source.market,
    unit: source.unit || "kg",
    currency: source.currency || "INR",
  };
  return REQUIRED_LIVE_FIELDS.every((field) => String(normalized[field] || "").trim());
}

export function normalizePriceSource(source = {}, fallbackType = PRICE_SOURCE_TYPES.INTERNAL) {
  const requestedType = source.price_source_type || source.source_type || source.type || fallbackType;
  const verified = hasVerifiedLivePriceSource(source);
  const sourceText = String(source.source || source.price_source_name || source.source_name || "").toLowerCase();
  const manual = sourceText.includes("manual") || sourceText.includes("cfo");
  const fallback = source.is_fallback || source.stale || sourceText.includes("reference") || sourceText.includes("fallback");
  const type = verified
    ? PRICE_SOURCE_TYPES.LIVE
    : manual
      ? PRICE_SOURCE_TYPES.MANUAL
      : fallback
        ? PRICE_SOURCE_TYPES.FALLBACK
        : requestedType === PRICE_SOURCE_TYPES.LIVE
          ? fallbackType
          : requestedType;
  return {
    price_source_type: type || PRICE_SOURCE_TYPES.INTERNAL,
    price_source_name: source.price_source_name || source.source_name || source.source || "",
    price_source_reference: source.price_source_reference || source.source_reference || source.source_url || "",
    price_fetched_at: source.price_fetched_at || source.fetched_at || source.updated_at || null,
    price_basis: source.price_basis || source.basis || source.note || "",
    product_grade: source.product_grade || source.grade || source.quality || "",
    market_location: source.market_location || source.location || source.market || "",
    source_confidence: verified ? "Verified" : manual ? "Manual" : "Estimate",
    verified_live: verified,
  };
}

export function aiPriceSource(extra = {}) {
  return normalizePriceSource({
    price_source_type: PRICE_SOURCE_TYPES.AI,
    price_source_name: "GOPU AI pricing engine",
    price_source_reference: "AI calculation from available internal inputs",
    price_basis: "AI calculation; verified external live source metadata not attached",
    source_confidence: "Estimate",
    ...extra,
  }, PRICE_SOURCE_TYPES.AI);
}

export function fallbackPriceSource(extra = {}) {
  return normalizePriceSource({
    price_source_type: PRICE_SOURCE_TYPES.FALLBACK,
    price_source_name: "GOPU reference fallback",
    price_source_reference: "Internal fallback/reference table",
    price_basis: "Reference fallback used for estimate only",
    source_confidence: "Estimate",
    is_fallback: true,
    ...extra,
  }, PRICE_SOURCE_TYPES.FALLBACK);
}

export function buildPricingSourceSummary(pricing = {}) {
  const source = normalizePriceSource(pricing.price_source || pricing.priceSource || pricing, PRICE_SOURCE_TYPES.INTERNAL);
  const lineSources = Array.isArray(pricing.lines)
    ? pricing.lines.map((line) => ({
        key: line.key,
        label: line.label,
        amount: line.amount,
        basis: line.basis,
        line_total: line.lineTotal ?? line.line_total,
        source: normalizePriceSource(line.price_source || line.priceSource || pricing.price_source || pricing.priceSource || {}, PRICE_SOURCE_TYPES.INTERNAL),
      }))
    : [];
  const verifiedCount = lineSources.filter((line) => line.source.verified_live).length;
  const confidenceScore = source.verified_live ? 100 : source.price_source_type === PRICE_SOURCE_TYPES.MANUAL ? 70 : 60;
  const manualReviewRequired = confidenceScore < 70 || source.price_source_type === PRICE_SOURCE_TYPES.FALLBACK;
  return {
    ...source,
    pricing_confidence: confidenceScore >= 70 ? source.source_confidence : "Manual Review",
    source_confidence_score: confidenceScore,
    manual_review_required: manualReviewRequired,
    verified_line_count: verifiedCount,
    estimated_line_count: Math.max(0, lineSources.length - verifiedCount),
    estimate_vs_verified: source.verified_live
      ? "Verified external source metadata was captured during this run."
      : "Estimate only: verified external live source metadata was not captured during this run.",
    line_sources: lineSources,
  };
}
