// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(k: string) {
  return process.env[k]?.trim() || "";
}

function getSupabase() {
  const url =
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL") ||
    env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: "Supabase not configured" });
  }

  // GET — list founder approvals
  if (req.method === "GET") {
    const { status } = req.query || {};

    let query = supabase
      .from("founder_approvals")
      .select("id, tenant_id, lead_id, approval_type, request_type, title, summary, quotation_amount, buyer_name, buyer_email, product, quantity, amount, status, approval_status, risk_level, priority, source_module, metadata, created_at, updated_at")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(250);

    if (status) {
      query = query.or(`status.eq.${status},approval_status.eq.${status}`);
    }

    let approvals: any[] = [];
    let error: any = null;
    try {
      const result = await query;
      approvals = result.data ?? [];
      error = result.error;
    } catch (_) {
      approvals = [];
      error = null;
    }

    if (error) approvals = [];

    const list = approvals ?? [];
    const isPending = (a: any) => ["Pending", "Pending Approval"].includes(a.status) || ["Pending", "Pending Approval"].includes(a.approval_status);
    const isApproved = (a: any) => ["Approved"].includes(a.status) || ["Approved"].includes(a.approval_status);
    const isRejected = (a: any) => ["Rejected"].includes(a.status) || ["Rejected"].includes(a.approval_status);
    const summary = {
      pending: list.filter(isPending).length,
      approved: list.filter(isApproved).length,
      rejected: list.filter(isRejected).length,
    };

    return res.status(200).json({ ok: true, approvals: list, summary });
  }

  // POST — create approval request
  if (req.method === "POST") {
    const {
      lead_id,
      approval_type,
      summary,
      quotation_amount,
      buyer_name,
      buyer_email,
      product,
      quantity,
    } = req.body || {};

    if (!approval_type) {
      return res
        .status(400)
        .json({ ok: false, error: "approval_type is required" });
    }

    let approval: any = null;
    let insertError: any = null;
    try {
      const result = await supabase
        .from("founder_approvals")
        .insert({
          tenant_id: TENANT_ID,
          lead_id: lead_id ?? null,
          approval_type,
          summary: summary ?? null,
          quotation_amount: quotation_amount ?? null,
          buyer_name: buyer_name ?? null,
          buyer_email: buyer_email ?? null,
          product: product ?? null,
          quantity: quantity ?? null,
          status: "Pending",
          created_at: new Date().toISOString(),
        })
        .select("id, approval_type, request_type, buyer_name, status, approval_status, created_at")
        .single();
      approval = result.data;
      insertError = result.error;
    } catch (_) {
      insertError = { message: "Insert failed" };
    }

    if (insertError) {
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    // Log COO agent decision
    try {
      await supabase
        .from("agent_decisions")
        .insert({
          tenant_id: TENANT_ID,
          agent: "COO",
          action: "request_founder_approval",
          reference_id: approval?.id ?? null,
          notes: `Approval request submitted: ${approval_type}${buyer_name ? ` for ${buyer_name}` : ""}`,
          created_at: new Date().toISOString(),
        });
    } catch (_) {}

    return res.status(201).json({ ok: true, approval });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
