// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
function env(k: string) { return process.env[k]?.trim() || ""; }
function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  try {
    // Fetch all orders with margin data
    const { data: orders, error } = await sb
      .from("export_orders")
      .select("id, product, destination_country, margin_percent, amount, buyer_name, status, created_at")
      .eq("tenant_id", TENANT_ID);

    if (error) throw error;

    const rows = orders || [];

    // avg_margin_percent
    let avg_margin_percent = 0;
    const withMargin = rows.filter((r: any) => r.margin_percent != null);
    if (withMargin.length > 0) {
      avg_margin_percent =
        withMargin.reduce((sum: number, r: any) => sum + (parseFloat(r.margin_percent) || 0), 0) /
        withMargin.length;
    }

    // by_product: group by product, avg margin
    let by_product: any[] = [];
    try {
      const prodMap: Record<string, { sum: number; count: number }> = {};
      for (const r of withMargin) {
        const p = r.product || "Unknown";
        if (!prodMap[p]) prodMap[p] = { sum: 0, count: 0 };
        prodMap[p].sum += parseFloat(r.margin_percent) || 0;
        prodMap[p].count += 1;
      }
      by_product = Object.entries(prodMap)
        .map(([product, { sum, count }]) => ({ product, avg_margin: sum / count }))
        .sort((a, b) => b.avg_margin - a.avg_margin);
    } catch (_) {}

    // by_country: group by destination_country, avg margin
    let by_country: any[] = [];
    try {
      const countryMap: Record<string, { sum: number; count: number }> = {};
      for (const r of withMargin) {
        const c = r.destination_country || "Unknown";
        if (!countryMap[c]) countryMap[c] = { sum: 0, count: 0 };
        countryMap[c].sum += parseFloat(r.margin_percent) || 0;
        countryMap[c].count += 1;
      }
      by_country = Object.entries(countryMap)
        .map(([country, { sum, count }]) => ({ country, avg_margin: sum / count }))
        .sort((a, b) => b.avg_margin - a.avg_margin);
    } catch (_) {}

    // high_margin_orders: margin_percent > 25, last 20 by created_at
    let high_margin_orders: any[] = [];
    try {
      const { data: highData, error: highErr } = await sb
        .from("export_orders")
        .select("id, buyer_name, product, destination_country, amount, margin_percent, status, created_at")
        .eq("tenant_id", TENANT_ID)
        .gt("margin_percent", 25)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!highErr && highData) high_margin_orders = highData;
    } catch (_) {}

    return res.status(200).json({
      ok: true,
      analytics: {
        avg_margin_percent,
        by_product,
        by_country,
        high_margin_orders,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
  }
}
