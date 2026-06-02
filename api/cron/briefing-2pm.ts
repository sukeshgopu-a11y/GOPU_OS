// @ts-nocheck
/**
 * Afternoon Intelligence Briefing — 2:00 PM IST (8:30 AM UTC)
 *
 * Mid-day update from all 5 agents:
 * - What happened since morning briefing
 * - Leads that came in today so far
 * - Quotes sent and awaiting buyer replies
 * - Active shipment updates
 * - Any urgent items needing Director attention
 */

import { createClient } from "@supabase/supabase-js";
import { cleanSlackText } from "../../lib/slackTextClean.js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function istTime() {
  return new Date().toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

async function safeData(query: any, fallback: any[] = []) {
  try {
    const { data } = await query;
    return data || fallback;
  } catch {
    return fallback;
  }
}

async function fetchTodayLeads(client: any) {
  if (!client) return [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const data = await safeData(client
    .from("lead_intake")
    .select("id, buyer_name, product, quantity, country, status, created_at")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false }));
  return data || [];
}

async function fetchPendingApprovals(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("founder_approvals")
    .select("id, buyer_name, amount, approval_status, created_at")
    .eq("tenant_id", TENANT_ID)
    .in("approval_status", ["Pending Approval", "Pending"])
    .order("created_at", { ascending: false })
    .limit(10));
  return data || [];
}

async function fetchApprovalsDoneToday(client: any) {
  if (!client) return [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const data = await safeData(client
    .from("founder_approvals")
    .select("id, buyer_name, amount, approval_status")
    .eq("tenant_id", TENANT_ID)
    .in("approval_status", ["Approved", "Rejected"])
    .gte("updated_at", todayStart.toISOString()));
  return data || [];
}

async function fetchBlockedTasks(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("tasks")
    .select("id, title, status, priority, department, blocking_reason")
    .eq("tenant_id", TENANT_ID)
    .eq("status", "Blocked")
    .limit(5));
  return data || [];
}

async function fetchActiveOrders(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("export_orders")
    .select("id, buyer_name, product, current_stage, current_stage_name, quantity, unit")
    .eq("tenant_id", TENANT_ID)
    .eq("status", "Active")
    .order("updated_at", { ascending: false })
    .limit(5));
  return data || [];
}

async function fetchColdEmailsSentToday(client: any) {
  if (!client) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const data = await safeData(client
    .from("cold_email_sequences")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .gte("sent_at", todayStart.toISOString()));
  return (data || []).length;
}

function buildAfternoonBriefing(data: any): string {
  const { time, todayLeads, pendingApprovals, approvalsDone, blockedTasks, activeOrders, emailsSent } = data;
  const lines: string[] = [];

  lines.push(`☀️ *GOPU OS — Afternoon Update*`);
  lines.push(`🕑 ${time}`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Today's lead activity
  lines.push(``);
  lines.push(`🔍 *Today's Lead Activity*`);
  if (todayLeads.length === 0) {
    lines.push(`  No new leads today yet. CIO monitoring active.`);
  } else {
    lines.push(`  ${todayLeads.length} lead${todayLeads.length > 1 ? "s" : ""} received today:`);
    for (const l of todayLeads.slice(0, 5)) {
      lines.push(`  • ${l.buyer_name || "Buyer"} — ${l.product || "Product"} ${l.quantity || ""} | ${l.country || "?"}`);
    }
  }

  // Approvals
  lines.push(``);
  lines.push(`🎯 *Director Approvals*`);
  if (approvalsDone.length > 0) {
    const approved = approvalsDone.filter((a: any) => a.approval_status === "Approved");
    const rejected = approvalsDone.filter((a: any) => a.approval_status === "Rejected");
    if (approved.length > 0) lines.push(`  ✅ ${approved.length} approved today — quotations sent to buyers`);
    if (rejected.length > 0) lines.push(`  ❌ ${rejected.length} rejected today`);
  }
  if (pendingApprovals.length > 0) {
    lines.push(`  ⏳ *${pendingApprovals.length} still waiting for your approval*`);
    for (const a of pendingApprovals) {
      const amount = a.amount ? `₹${a.amount}` : "Amount TBD";
      lines.push(`  • ${a.buyer_name || "Buyer"} — ${amount}`);
    }
  } else {
    lines.push(`  ✅ Approval queue clear`);
  }

  // COO — active orders
  lines.push(``);
  lines.push(`⚙️ *COO — Active Export Orders*`);
  if (activeOrders.length > 0) {
    for (const o of activeOrders) {
      lines.push(`  • ${o.buyer_name || "Buyer"} — ${o.product} ${o.quantity || ""}${o.unit || ""} | ${o.current_stage_name || `Stage ${o.current_stage}`}`);
    }
  } else {
    lines.push(`  No active orders. Ready for new business.`);
  }

  // Blockers
  if (blockedTasks.length > 0) {
    lines.push(``);
    lines.push(`🔴 *Blockers — Needs Attention*`);
    for (const t of blockedTasks) {
      lines.push(`  • ${t.title}${t.blocking_reason ? ` — _${t.blocking_reason}_` : ""}`);
    }
  }

  // CMO
  lines.push(``);
  lines.push(`📣 *CMO — Marketing Today*`);
  if (emailsSent > 0) {
    lines.push(`  ✉️ ${emailsSent} follow-up email${emailsSent > 1 ? "s" : ""} sent today by CMO`);
  } else {
    lines.push(`  Email sequences running in background`);
  }
  lines.push(`  Social posts: scheduled for 9 PM IST briefing trigger`);

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Next briefing: 9:00 PM IST — Evening summary_`);

  return lines.join("\n");
}

async function sendSlack(text: string) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false, reason: "not_configured" };
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text: cleanSlackText(text) }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.ok === true, ts: body.ts };
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "GET or POST only" });
  }
  if (req.method === "POST") {
    const secret = env("CRON_SECRET");
    const auth = String(req.headers.authorization || "");
    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
  }

  const client = getSupabase();
  const startAt = Date.now();

  const [todayLeads, pendingApprovals, approvalsDone, blockedTasks, activeOrders, emailsSent] =
    await Promise.all([
      fetchTodayLeads(client),
      fetchPendingApprovals(client),
      fetchApprovalsDoneToday(client),
      fetchBlockedTasks(client),
      fetchActiveOrders(client),
      fetchColdEmailsSentToday(client),
    ]);

  const data = { time: istTime(), todayLeads, pendingApprovals, approvalsDone, blockedTasks, activeOrders, emailsSent };
  const text = buildAfternoonBriefing(data);
  const slackResult = await sendSlack(text);

  if (client) {
    try {
      await client.from("agent_briefings").insert({
        tenant_id: TENANT_ID,
        briefing_type: "afternoon_2pm",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        slack_ts: slackResult.ts || null,
        summary: `${todayLeads.length} leads today, ${pendingApprovals.length} pending approvals`,
        leads_count: todayLeads.length,
        pending_approvals: pendingApprovals.length,
        content: data,
      });
    } catch {
      // Briefing delivery should not fail when audit persistence is unavailable.
    }
  }

  return res.status(200).json({
    ok: true,
    briefing_type: "afternoon_2pm",
    leads_today: todayLeads.length,
    pending_approvals: pendingApprovals.length,
    slack_sent: slackResult.ok,
    duration_ms: Date.now() - startAt,
  });
}
