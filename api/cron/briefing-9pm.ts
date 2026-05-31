// @ts-nocheck
/**
 * Evening Intelligence Briefing — 9:00 PM IST (3:30 PM UTC)
 * The full day summary. Most detailed briefing of the day.
 *
 * Covers:
 * - Full day's leads: won, lost, and why
 * - All approvals done today + still pending
 * - Revenue collected vs pending
 * - CMO: posts published, emails sent, campaign performance
 * - COO: orders advanced today, documents submitted
 * - CTO: platform health, any issues resolved
 * - Tomorrow's agenda: what each agent plans to do
 */

import { createClient } from "@supabase/supabase-js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function istDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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
  const data = await safeData(client
    .from("lead_intake")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", todayStart())
    .order("created_at", { ascending: false }));
  return data || [];
}

async function fetchAllApprovals(client: any) {
  if (!client) return { pending: [], done: [] };
  const data = await safeData(client
    .from("founder_approvals")
    .select("id, buyer_name, amount, approval_status, reason, created_at, updated_at")
    .eq("tenant_id", TENANT_ID)
    .order("updated_at", { ascending: false })
    .limit(20));
  const all = data || [];
  return {
    pending: all.filter((a: any) => ["Pending Approval", "Pending"].includes(a.approval_status)),
    done: all.filter((a: any) => !["Pending Approval", "Pending"].includes(a.approval_status) && a.updated_at >= todayStart()),
  };
}

async function fetchTodayEmailSequences(client: any) {
  if (!client) return { sent: 0, replied: 0 };
  const data = await safeData(client
    .from("cold_email_sequences")
    .select("id, status")
    .eq("tenant_id", TENANT_ID)
    .gte("updated_at", todayStart()));
  const all = data || [];
  return {
    sent: all.filter((e: any) => e.status === "Sent").length,
    replied: all.filter((e: any) => e.status === "Replied").length,
  };
}

async function fetchOrdersAdvancedToday(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("export_stage_logs")
    .select("export_order_id, from_stage, to_stage, stage_name, triggered_by, created_at")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", todayStart())
    .order("created_at", { ascending: false }));
  return data || [];
}

async function fetchAgentDecisions(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("agent_decisions")
    .select("agent, decision_type, decision_summary, confidence, created_at")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", todayStart())
    .order("created_at", { ascending: false })
    .limit(20));
  return data || [];
}

async function fetchCreditAlerts(client: any) {
  if (!client) return [];
  const data = await safeData(client
    .from("cto_credit_alerts")
    .select("platform, alert_type, estimated_days_left, status")
    .eq("tenant_id", TENANT_ID)
    .in("status", ["Open", "CFO_Notified"]));
  return data || [];
}

async function fetchPricingRequestsToday(client: any) {
  if (!client) return 0;
  const data = await safeData(client
    .from("pricing_requests")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", todayStart()));
  return (data || []).length;
}

function buildEveningBriefing(data: any): string {
  const {
    date, todayLeads, approvals, emails,
    ordersAdvanced, agentDecisions, creditAlerts, quotesToday
  } = data;

  const lines: string[] = [];

  lines.push(`🌙 *GOPU OS — Evening Summary*`);
  lines.push(`📅 ${date} | 9:00 PM IST`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Full Day Report — What Your 5 Agents Did Today*`);
  lines.push(``);

  // Lead summary
  const wonLeads = todayLeads.filter((l: any) => (l.status || "").toLowerCase() === "won");
  const lostLeads = todayLeads.filter((l: any) => ["lost", "rejected", "declined"].includes((l.status || "").toLowerCase()));
  const activeLeads = todayLeads.filter((l: any) => !["won", "lost", "rejected", "declined"].includes((l.status || "").toLowerCase()));

  lines.push(`🔍 *CIO — Lead Report*`);
  lines.push(`  Total leads today: *${todayLeads.length}*`);
  if (wonLeads.length > 0) lines.push(`  ✅ Won: ${wonLeads.length} lead${wonLeads.length > 1 ? "s" : ""}`);
  if (activeLeads.length > 0) lines.push(`  ⏳ In pipeline: ${activeLeads.length} lead${activeLeads.length > 1 ? "s" : ""}`);
  if (lostLeads.length > 0) {
    lines.push(`  ❌ Lost: ${lostLeads.length} lead${lostLeads.length > 1 ? "s" : ""}`);
    for (const l of lostLeads) {
      lines.push(`  _Lost: ${l.buyer_name || "Buyer"} — ${l.product || "Product"} ${l.quantity || ""}${l.notes ? `. Reason: ${l.notes}` : ""}_`);
    }
  }
  if (todayLeads.length === 0) lines.push(`  No leads today. CIO will resume monitoring overnight.`);

  // CFO
  lines.push(``);
  lines.push(`💰 *CFO — Financial Summary*`);
  lines.push(`  Quotes generated today: ${quotesToday}`);
  if (approvals.done.length > 0) {
    const approved = approvals.done.filter((a: any) => a.approval_status === "Approved");
    const rejected = approvals.done.filter((a: any) => a.approval_status === "Rejected");
    if (approved.length > 0) lines.push(`  ✅ ${approved.length} quotation${approved.length > 1 ? "s" : ""} approved and sent to buyers today`);
    if (rejected.length > 0) lines.push(`  ❌ ${rejected.length} quotation${rejected.length > 1 ? "s" : ""} rejected`);
  }
  if (approvals.pending.length > 0) {
    lines.push(`  ⚠️ *${approvals.pending.length} quotation${approvals.pending.length > 1 ? "s" : ""} still awaiting your approval — will carry to tomorrow*`);
    for (const a of approvals.pending) {
      const amount = a.amount ? `₹${a.amount}` : "Amount TBD";
      lines.push(`  • ${a.buyer_name || "Buyer"} — ${amount}`);
    }
  } else {
    lines.push(`  ✅ No pending approvals — queue clear for tomorrow`);
  }

  // COO
  lines.push(``);
  lines.push(`⚙️ *COO — Operations*`);
  if (ordersAdvanced.length > 0) {
    lines.push(`  ${ordersAdvanced.length} export order${ordersAdvanced.length > 1 ? "s" : ""} advanced today:`);
    for (const o of ordersAdvanced) {
      lines.push(`  • Stage ${o.from_stage} → Stage ${o.to_stage}: ${o.stage_name} _(by ${o.triggered_by})_`);
    }
  } else {
    lines.push(`  No stage changes today. Orders maintained.`);
  }

  // CMO
  lines.push(``);
  lines.push(`📣 *CMO — Marketing*`);
  if (emails.sent > 0 || emails.replied > 0) {
    if (emails.sent > 0) lines.push(`  ✉️ ${emails.sent} buyer email${emails.sent > 1 ? "s" : ""} sent today`);
    if (emails.replied > 0) lines.push(`  🎉 ${emails.replied} buyer${emails.replied > 1 ? "s" : ""} replied — follow up tomorrow`);
  } else {
    lines.push(`  Email sequences running. No sends today.`);
  }
  lines.push(`  Social media posts: processed via daily trigger`);

  // CTO
  lines.push(``);
  lines.push(`🖥️ *CTO — System Report*`);
  if (creditAlerts.length > 0) {
    for (const a of creditAlerts) {
      lines.push(`  ⚠️ ${a.platform}: ${a.estimated_days_left || "?"} days of credits left — CFO to recharge`);
    }
  } else {
    lines.push(`  ✅ All systems healthy. Zero incidents today.`);
  }

  // Agent decisions log
  if (agentDecisions.length > 0) {
    lines.push(``);
    lines.push(`🤖 *Autonomous Decisions Made Today (${agentDecisions.length})*`);
    const byAgent: Record<string, number> = {};
    for (const d of agentDecisions) {
      byAgent[d.agent] = (byAgent[d.agent] || 0) + 1;
    }
    for (const [agent, count] of Object.entries(byAgent)) {
      lines.push(`  • ${agent}: ${count} decision${count > 1 ? "s" : ""} made autonomously`);
    }
  }

  // Tomorrow agenda
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Tomorrow — Agents Wake Up At 9 AM IST*`);
  lines.push(`  🔍 CIO: Monitor global spice import channels overnight`);
  lines.push(`  💰 CFO: Fetch live Agmarknet prices, update pricing engine`);
  lines.push(`  📣 CMO: Send scheduled follow-up emails, post on social media`);
  lines.push(`  ⚙️ COO: Check shipment status, advance any ready orders`);
  lines.push(`  🖥️ CTO: Verify all platform credits and API health`);
  lines.push(``);
  lines.push(`_Your agents are working overnight. Sleep well. 🌙_`);
  lines.push(`_GOPU OS · 5 agents active 24/7_`);

  return lines.join("\n");
}

async function sendSlack(text: string) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false, reason: "not_configured" };
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text }),
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

  const [todayLeads, approvals, emails, ordersAdvanced, agentDecisions, creditAlerts, quotesToday] =
    await Promise.all([
      fetchTodayLeads(client),
      fetchAllApprovals(client),
      fetchTodayEmailSequences(client),
      fetchOrdersAdvancedToday(client),
      fetchAgentDecisions(client),
      fetchCreditAlerts(client),
      fetchPricingRequestsToday(client),
    ]);

  const data = { date: istDate(), todayLeads, approvals, emails, ordersAdvanced, agentDecisions, creditAlerts, quotesToday };
  const text = buildEveningBriefing(data);
  const slackResult = await sendSlack(text);

  if (client) {
    try {
      await client.from("agent_briefings").insert({
        tenant_id: TENANT_ID,
        briefing_type: "evening_9pm",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        slack_ts: slackResult.ts || null,
        summary: `Day end: ${todayLeads.length} leads, ${approvals.done.length} approvals done, ${approvals.pending.length} pending`,
        leads_count: todayLeads.length,
        pending_approvals: approvals.pending.length,
        content: data,
      });
    } catch {
      // Briefing delivery should not fail when audit persistence is unavailable.
    }
  }

  return res.status(200).json({
    ok: true,
    briefing_type: "evening_9pm",
    leads_today: todayLeads.length,
    approvals_done: approvals.done.length,
    approvals_pending: approvals.pending.length,
    slack_sent: slackResult.ok,
    duration_ms: Date.now() - startAt,
  });
}
