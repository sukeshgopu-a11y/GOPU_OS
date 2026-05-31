// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { runPricingEngine } from "../../src/services/pricingEngineService.js";
import { buildPricingSourceSummary, normalizePriceSource, PRICE_SOURCE_TYPES } from "../../lib/pricingSourceUtils.mjs";

const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function rowSource(row: any) {
  const payloadSummary = row.payload?.price_source_summary || row.payload?.pricing?.source_summary || null;
  return {
    pricing_request_id: row.id,
    lead_id: row.lead_id,
    lead_number: row.lead_number,
    product: row.product,
    buyer: row.buyer_name,
    destination: row.destination,
    created_at: row.created_at,
    stored_source: normalizePriceSource(row, PRICE_SOURCE_TYPES.CACHED),
    payload_source_summary: payloadSummary,
    line_sources: payloadSummary?.line_sources || row.payload?.pricing?.source_summary?.line_sources || [],
  };
}

export default async function handler(req: any, res: any) {
  const client = getClient();
  const query = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}) : req.query || {};
  const pricingRequestId = String(query.pricing_request_id || query.id || "").trim();
  const leadId = String(query.lead_id || "").trim();
  const product = String(query.product || "").trim();
  const rows: any[] = [];
  const issues: string[] = [];

  if (client) {
    let request = client.from("pricing_requests").select("*").eq("tenant_id", demoTenantId).order("created_at", { ascending: false }).limit(10);
    if (pricingRequestId) request = request.eq("id", pricingRequestId);
    else if (leadId) request = request.eq("lead_id", leadId);
    else if (product) request = request.ilike("product", `%${product}%`);
    const { data, error } = await request;
    if (error) issues.push(error.message);
    else rows.push(...(data || []));
  } else {
    issues.push("Supabase server env is missing; returning computed source classification only.");
  }

  const computedPricing = product ? runPricingEngine({
    product,
    quantity: Number(query.quantity || 1),
    unit_of_measure: query.unit || "mt",
    destination_country: query.destination || query.market_location || "",
    incoterm: query.incoterm || "FOB",
    currency: query.currency || "USD",
  }) : null;

  return res.status(200).json({
    ok: issues.length === 0,
    status: issues.length ? "partial" : "ok",
    filters: { pricing_request_id: pricingRequestId || null, lead_id: leadId || null, product: product || null },
    live_rules: ["source_name", "source_url or source_reference", "fetched_at", "product", "grade/quality", "location/market", "unit", "currency"],
    pricing_requests: rows.map(rowSource),
    computed_current_estimate: computedPricing ? buildPricingSourceSummary(computedPricing) : null,
    issues,
  });
}
