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
    // total_revenue: sum of amount where status != 'Cancelled'
    let total_revenue = 0;
    try {
      const { data: revData, error: revErr } = await sb
        .from("export_orders")
        .select("amount")
        .eq("tenant_id", TENANT_ID)
        .neq("status", "Cancelled");
      if (!revErr && revData) {
        total_revenue = revData.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
      }
    } catch (_) {}

    // pending_receivables: sum of amount where payment_status = 'Pending'
    let pending_receivables = 0;
    try {
      const { data: pendData, error: pendErr } = await sb
        .from("export_orders")
        .select("amount")
        .eq("tenant_id", TENANT_ID)
        .eq("payment_status", "Pending");
      if (!pendErr && pendData) {
        pending_receivables = pendData.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
      }
    } catch (_) {}

    // overdue_count: count where payment_due_date < now and payment_status = 'Pending'
    let overdue_count = 0;
    try {
      const { count, error: ovErr } = await sb
        .from("export_orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("payment_status", "Pending")
        .lt("payment_due_date", new Date().toISOString());
      if (!ovErr) overdue_count = count || 0;
    } catch (_) {}

    // monthly_revenue: last 6 months
    let monthly_revenue: any[] = [];
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: monthData, error: monthErr } = await sb
        .from("export_orders")
        .select("amount, created_at")
        .eq("tenant_id", TENANT_ID)
        .neq("status", "Cancelled")
        .gte("created_at", sixMonthsAgo.toISOString());
      if (!monthErr && monthData) {
        const monthMap: Record<string, number> = {};
        for (const row of monthData) {
          const d = new Date(row.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[key] = (monthMap[key] || 0) + (parseFloat(row.amount) || 0);
        }
        monthly_revenue = Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, revenue]) => ({ month, revenue }));
      }
    } catch (_) {}

    // top_products: group by product, sum amount, top 5
    let top_products: any[] = [];
    try {
      const { data: prodData, error: prodErr } = await sb
        .from("export_orders")
        .select("product, amount")
        .eq("tenant_id", TENANT_ID)
        .neq("status", "Cancelled");
      if (!prodErr && prodData) {
        const prodMap: Record<string, number> = {};
        for (const row of prodData) {
          const p = row.product || "Unknown";
          prodMap[p] = (prodMap[p] || 0) + (parseFloat(row.amount) || 0);
        }
        top_products = Object.entries(prodMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([product, total_amount]) => ({ product, total_amount }));
      }
    } catch (_) {}

    // recent_transactions: last 10
    let recent_transactions: any[] = [];
    try {
      const { data: recData, error: recErr } = await sb
        .from("export_orders")
        .select("id, buyer_name, amount, currency, status, created_at")
        .eq("tenant_id", TENANT_ID)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!recErr && recData) recent_transactions = recData;
    } catch (_) {}

    return res.status(200).json({
      ok: true,
      dashboard: {
        total_revenue,
        pending_receivables,
        overdue_count,
        monthly_revenue,
        top_products,
        recent_transactions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
  }
}
