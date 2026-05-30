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
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: "Supabase not configured" });
  }

  try {
    // Run all independent queries in parallel
    const [
      totalResult,
      aTierResult,
      bTierResult,
      cTierResult,
      withEmailResult,
      recentBuyersResult,
      allBuyersForCountries,
      coldEmailResult,
    ] = await Promise.all([
      // total_buyers
      supabase
        .from("cio_buyer_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID),

      // a_tier
      supabase
        .from("cio_buyer_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("tier", "A"),

      // b_tier
      supabase
        .from("cio_buyer_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("tier", "B"),

      // c_tier
      supabase
        .from("cio_buyer_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("tier", "C"),

      // with_email
      supabase
        .from("cio_buyer_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .not("email", "is", null),

      // recent_buyers: last 5
      supabase
        .from("cio_buyer_intelligence")
        .select("id, company_name, buyer_name, country, tier, email, confidence_score, created_at")
        .eq("tenant_id", TENANT_ID)
        .order("created_at", { ascending: false })
        .limit(5),

      // all buyers for country grouping
      supabase
        .from("cio_buyer_intelligence")
        .select("country")
        .eq("tenant_id", TENANT_ID),

      // cold_email_sequences stats
      supabase
        .from("cold_email_sequences")
        .select("status")
        .eq("tenant_id", TENANT_ID),
    ]);

    // Build top_countries from raw data (Supabase JS v2 doesn't support group-by natively)
    const countryCounts: Record<string, number> = {};
    for (const row of allBuyersForCountries.data || []) {
      if (row.country) {
        countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
      }
    }
    const top_countries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Build cold_email_stats
    const emailRows = coldEmailResult.data || [];
    const cold_email_stats = {
      total: emailRows.length,
      sent: emailRows.filter((r) => r.status === "sent" || r.status === "opened" || r.status === "replied").length,
      opened: emailRows.filter((r) => r.status === "opened" || r.status === "replied").length,
      cold: emailRows.filter((r) => r.status === "cold" || r.status === "pending" || !r.status).length,
    };

    const summary = {
      total_buyers: totalResult.count ?? 0,
      a_tier: aTierResult.count ?? 0,
      b_tier: bTierResult.count ?? 0,
      c_tier: cTierResult.count ?? 0,
      with_email: withEmailResult.count ?? 0,
      recent_buyers: recentBuyersResult.data || [],
      top_countries,
      cold_email_stats,
    };

    return res.status(200).json({ ok: true, summary });
  } catch (err: any) {
    console.error("CIO summary error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
