// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { PRICE_SOURCE_TYPES, normalizePriceSource } from "../../lib/pricingSourceUtils.mjs";
import { apedaScheduledProductCategories, marketPriceFallbacks, marketPriceProducts, productSlug, spiceBoardProducts } from "../../lib/exportProductCatalog.mjs";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const MARKET_PRICE_FALLBACKS = marketPriceFallbacks;

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const client = getSupabase();

  // GET - return all commodity prices (live from DB, fallback to reference)
  if (req.method === "GET") {
    const { product } = req.query;
    let liveRows: any[] = [];
    const productFilter = product ? productSlug(product) : "";

    if (client) {
      const q = client.from("commodity_prices")
        .select("*")
        .eq("tenant_id", "11111111-1111-1111-1111-111111111111")
        .order("updated_at", { ascending: false });
      if (productFilter) q.or(`product_key.ilike.%${productFilter}%,product_label.ilike.%${String(product).replace(/[%(),]/g, "")}%`);
      const { data } = await q.limit(300);
      liveRows = data || [];
    }

    const merged: Record<string, any> = {};
    for (const [key, fb] of Object.entries(MARKET_PRICE_FALLBACKS)) {
      const productLabel = fb.product_label || fb.label || key;
      if (productFilter && !key.includes(productFilter) && !productSlug(productLabel).includes(productFilter)) continue;
      merged[key] = {
        product_key: key,
        product_label: productLabel,
        price_inr_per_kg: fb.price,
        source: fb.source,
        note: fb.note,
        is_fallback: true,
        price_source_type: PRICE_SOURCE_TYPES.FALLBACK,
        price_source_name: fb.source,
        price_source_reference: fb.price_source_reference || "MARKET_PRICE_FALLBACKS",
        price_basis: fb.note,
        product_grade: fb.product_grade || "Commercial export grade",
        market_location: fb.market_location || fb.source,
        unit: fb.unit || "kg",
        currency: "INR",
        hs: fb.hs || "",
        days_old: null,
        stale: true,
        updated_at: null,
      };
    }

    for (const row of liveRows) {
      const daysOld = row.updated_at
        ? Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86400000)
        : null;
      const normalizedSource = normalizePriceSource(row, PRICE_SOURCE_TYPES.CACHED);
      const isFallbackRow = normalizedSource.price_source_type === PRICE_SOURCE_TYPES.FALLBACK
        || row.price_source_type === PRICE_SOURCE_TYPES.FALLBACK;
      merged[row.product_key] = {
        ...row,
        ...normalizedSource,
        is_fallback: isFallbackRow,
        days_old: daysOld,
        stale: daysOld !== null ? daysOld > 7 : true,
      };
    }

    const liveMapped = marketPriceProducts.filter((item: any) => Boolean(item.agmarknet)).length;
    return res.status(200).json({
      ok: true,
      prices: merged,
      count: Object.keys(merged).length,
      catalog: {
        total_products: marketPriceProducts.length,
        spice_board_products: spiceBoardProducts.length,
        apeda_scheduled_categories: apedaScheduledProductCategories.length,
        live_agmarknet_mapped: liveMapped,
        reference_or_manual_required: marketPriceProducts.length - liveMapped
      }
    });
  }

  // POST - CFO updates a market price
  if (req.method === "POST") {
    const { product_key, price_inr_per_kg, source, note, product_label, source_reference, source_url, product_grade, market_location, unit, currency } = req.body || {};
    if (!product_key || !price_inr_per_kg) {
      return res.status(400).json({ ok: false, message: "product_key and price_inr_per_kg are required" });
    }
    if (!client) {
      return res.status(503).json({ ok: false, message: "Supabase not configured" });
    }

    const normalizedProductKey = productSlug(product_key);
    const { data, error } = await client.from("commodity_prices").upsert({
      tenant_id: "11111111-1111-1111-1111-111111111111",
      product_key: normalizedProductKey,
      product_label: product_label || product_key,
      price_inr_per_kg: Number(price_inr_per_kg),
      source: source || "Manual entry by CFO",
      price_source_type: PRICE_SOURCE_TYPES.MANUAL,
      price_source_name: source || "Manual entry by CFO",
      price_source_reference: source_reference || source_url || "CFO Market Prices",
      product_grade: product_grade || "Commercial export grade",
      market_location: market_location || "Manual market entry",
      unit: unit || "kg",
      currency: currency || "INR",
      note: note || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,product_key" }).select("*").maybeSingle();

    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.status(200).json({ ok: true, data, message: `Price updated: ${normalizedProductKey} = INR ${price_inr_per_kg}/kg` });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
