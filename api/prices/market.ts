// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Reliable reference prices (INR/kg) — updated from public sources
// These are FALLBACKS only. CFO should override with actual purchase prices.
export const MARKET_PRICE_FALLBACKS: Record<string, { price: number; source: string; note: string }> = {
  chilli:    { price: 120,    source: "Guntur Mandi reference",     note: "S4 grade dry red chilli. Verify current rate before quoting." },
  turmeric:  { price: 148,    source: "Nizamabad Mandi reference",  note: "Finger turmeric 7% moisture. Verify current rate." },
  pepper:    { price: 680,    source: "NCDEX reference",            note: "MG1 black pepper. Highly volatile — always verify." },
  cardamom:  { price: 2200,   source: "ICEX reference",             note: "Green cardamom. Very volatile — verify before quoting." },
  cumin:     { price: 250,    source: "Unjha Mandi reference",      note: "Cumin/jeera. Verify current crop price." },
  coriander: { price: 90,     source: "Rajkot Mandi reference",     note: "Coriander seed. Verify current rate." },
  fenugreek: { price: 75,     source: "Rajkot Mandi reference",     note: "Fenugreek/methi seed." },
  clove:     { price: 820,    source: "Kochi market reference",     note: "Whole clove. Verify import parity." },
  cinnamon:  { price: 320,    source: "Kochi market reference",     note: "True cinnamon quills." },
  mustard:   { price: 65,     source: "Jaipur Mandi reference",     note: "Yellow/black mustard seed." },
  rice:      { price: 68,     source: "APEDA reference",            note: "Non-basmati export rice." },
  onion:     { price: 20,     source: "Lasalgaon Mandi reference",  note: "Verify season — highly volatile." },
  garlic:    { price: 32,     source: "Madhya Pradesh Mandi ref",   note: "Fresh garlic. Verify seasonal rate." },
  default:   { price: 110,    source: "Generic commodity estimate", note: "No specific price data — verify manually." },
};

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const client = getSupabase();

  // GET — return all commodity prices (live from DB, fallback to reference)
  if (req.method === "GET") {
    const { product } = req.query;
    let liveRows: any[] = [];

    if (client) {
      const q = client.from("commodity_prices")
        .select("*")
        .eq("tenant_id", "11111111-1111-1111-1111-111111111111")
        .order("updated_at", { ascending: false });
      if (product) q.ilike("product_key", `%${product}%`);
      const { data } = await q.limit(50);
      liveRows = data || [];
    }

    // Merge live DB prices with fallbacks
    const merged: Record<string, any> = {};
    for (const [key, fb] of Object.entries(MARKET_PRICE_FALLBACKS)) {
      merged[key] = {
        product_key: key,
        price_inr_per_kg: fb.price,
        source: fb.source,
        note: fb.note,
        is_fallback: true,
        days_old: null,
        stale: true,
        updated_at: null,
      };
    }
    for (const row of liveRows) {
      const daysOld = row.updated_at
        ? Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86400000)
        : null;
      merged[row.product_key] = {
        ...row,
        is_fallback: false,
        days_old: daysOld,
        stale: daysOld !== null ? daysOld > 7 : true,
      };
    }

    return res.status(200).json({ ok: true, prices: merged, count: Object.keys(merged).length });
  }

  // POST — CFO updates a market price
  if (req.method === "POST") {
    const { product_key, price_inr_per_kg, source, note, product_label } = req.body || {};
    if (!product_key || !price_inr_per_kg) {
      return res.status(400).json({ ok: false, message: "product_key and price_inr_per_kg are required" });
    }
    if (!client) {
      return res.status(503).json({ ok: false, message: "Supabase not configured" });
    }

    const { data, error } = await client.from("commodity_prices").upsert({
      tenant_id: "11111111-1111-1111-1111-111111111111",
      product_key: product_key.toLowerCase(),
      product_label: product_label || product_key,
      price_inr_per_kg: Number(price_inr_per_kg),
      source: source || "Manual entry by CFO",
      note: note || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,product_key" }).select("*").maybeSingle();

    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.status(200).json({ ok: true, data, message: `Price updated: ${product_key} = ₹${price_inr_per_kg}/kg` });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
