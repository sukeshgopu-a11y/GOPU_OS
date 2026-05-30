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
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  if (req.method === "GET") {
    const { data: alerts } = await supabase
      .from("cto_credit_alerts")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
      .catch(() => ({ data: [], error: null }));

    const rows = alerts || [];
    const summary = {
      open: rows.filter((a) => a.status === "open" || a.status === "Open").length,
      cfo_notified: rows.filter((a) => a.status === "CFO_Notified").length,
      paid: rows.filter((a) => a.status === "Paid").length,
    };

    return res.status(200).json({ ok: true, alerts: rows, summary });
  }

  if (req.method === "PUT") {
    const { id, status, payment_note } = req.body || {};
    if (!id || !status) return res.status(400).json({ ok: false, error: "id and status are required" });

    const updatePayload: any = { status };
    if (payment_note !== undefined) updatePayload.payment_note = payment_note;

    const { data: updated, error: updateError } = await supabase
      .from("cto_credit_alerts")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", TENANT_ID)
      .select()
      .single()
      .catch(() => ({ data: null, error: { message: "Update failed" } }));

    if (updateError || !updated) {
      return res.status(500).json({ ok: false, error: updateError?.message || "Update failed" });
    }

    await supabase
      .from("agent_decisions")
      .insert({
        tenant_id: TENANT_ID,
        agent: "CTO",
        action: `Updated credit alert ${id} status to ${status}`,
        reference_id: id,
        reference_table: "cto_credit_alerts",
        metadata: { status, payment_note },
        created_at: new Date().toISOString(),
      })
      .catch(() => ({ data: null, error: null }));

    return res.status(200).json({ ok: true, alert: updated });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
