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
    supabase
      .from("lead_intake")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID)
      .not("status", "in", '("Closed","Lost")')
      .catch(() => ({ count: 0, error: null })),

    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID)
      .eq("status", "Pending")
      .catch(() => ({ count: 0, error: null })),

    supabase
      .from("export_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID)
      .eq("status", "Active")
      .catch(() => ({ count: 0, error: null })),

    supabase
      .from("lead_intake")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID)
      .gte("created_at", todayISO)
      .catch(() => ({ count: 0, error: null })),

    supabase
      .from("lead_intake")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(5)
      .catch(() => ({ data: [], error: null })),

    supabase
      .from("tasks")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .eq("status", "Blocked")
      .order("created_at", { ascending: false })
      .limit(5)
      .catch(() => ({ data: [], error: null })),
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
