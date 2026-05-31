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

async function safeQuery(query: any, fallback: any) {
  try {
    const result = await query;
    return result?.error ? fallback : result;
  } catch (_) {
    return fallback;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: "Supabase not configured" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    activeLeadsResult,
    pendingTasksResult,
    exportOrdersResult,
    leadsTodayResult,
    recentLeadsResult,
    blockedTasksResult,
  ] = await Promise.all([
    safeQuery(
      supabase
        .from("lead_intake")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .not("status", "in", '("Closed","Lost")'),
      { count: 0, error: null }
    ),

    safeQuery(
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("status", "Pending"),
      { count: 0, error: null }
    ),

    safeQuery(
      supabase
        .from("export_orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("status", "Active"),
      { count: 0, error: null }
    ),

    safeQuery(
      supabase
        .from("lead_intake")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .gte("created_at", todayISO),
      { count: 0, error: null }
    ),

    safeQuery(
      supabase
        .from("lead_intake")
        .select("id, buyer_name, company_name, product, quantity, country, status, created_at")
        .eq("tenant_id", TENANT_ID)
        .order("created_at", { ascending: false })
        .limit(5),
      { data: [], error: null }
    ),

    safeQuery(
      supabase
        .from("tasks")
        .select("id, title, status, priority, department, workflow_source, blocking_reason, next_action, created_at")
        .eq("tenant_id", TENANT_ID)
        .eq("status", "Blocked")
        .order("created_at", { ascending: false })
        .limit(5),
      { data: [], error: null }
    ),
  ]);

  const summary = {
    active_leads: activeLeadsResult.count ?? 0,
    pending_tasks: pendingTasksResult.count ?? 0,
    export_orders: exportOrdersResult.count ?? 0,
    leads_today: leadsTodayResult.count ?? 0,
    recent_leads: recentLeadsResult.data ?? [],
    blocked_tasks: blockedTasksResult.data ?? [],
  };

  return res.status(200).json({ ok: true, summary });
}
