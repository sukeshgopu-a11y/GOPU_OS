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
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { data: receivables, error } = await sb
        .from("export_orders")
        .select("*")
        .eq("tenant_id", TENANT_ID)
        .in("payment_status", ["Pending", "Overdue"])
        .order("payment_due_date", { ascending: true });

      if (error) throw error;

      const rows = receivables || [];
      const total_pending = rows.filter((r: any) => r.payment_status === "Pending").length;
      const overdue_count = rows.filter((r: any) => r.payment_status === "Overdue").length;
      const total_amount = rows.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);

      return res.status(200).json({
        ok: true,
        receivables: rows,
        summary: { total_pending, overdue_count, total_amount },
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { order_id, payment_status, payment_received_at, amount_received } = req.body || {};
      if (!order_id) return res.status(400).json({ ok: false, error: "order_id is required" });

      // Update export_order
      const updatePayload: any = {};
      if (payment_status !== undefined) updatePayload.payment_status = payment_status;
      if (payment_received_at !== undefined) updatePayload.payment_received_at = payment_received_at;
      if (amount_received !== undefined) updatePayload.amount_received = amount_received;

      const { data: updated, error: updateErr } = await sb
        .from("export_orders")
        .update(updatePayload)
        .eq("id", order_id)
        .eq("tenant_id", TENANT_ID)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Log to agent_decisions
      try {
        await sb.from("agent_decisions").insert({
          tenant_id: TENANT_ID,
          agent: "CFO",
          action: "update_receivable",
          reference_id: order_id,
          details: { payment_status, payment_received_at, amount_received },
          created_at: new Date().toISOString(),
        });
      } catch (_) {}

      return res.status(200).json({ ok: true, order: updated });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
