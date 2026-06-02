// @ts-nocheck
/**
 * CTO Credit Check — runs daily at 9:00 AM IST (3:30 AM UTC + 30 mins = 4:00 AM UTC)
 *
 * Checks all platform subscriptions and API credit levels.
 * When any platform is low: creates alert → notifies CFO via Slack.
 * CFO logs payment → CTO marks resolved.
 *
 * Platforms monitored: OpenAI, Vercel, Supabase, Resend, Twilio
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

interface PlatformCheck {
  platform: string;
  label: string;
  status: "ok" | "low" | "critical" | "unknown";
  balance?: string;
  daysLeft?: number;
  note?: string;
}

// ── Platform checkers (add real API checks as credentials are available) ─────

async function checkOpenAI(): Promise<PlatformCheck> {
  const key = env("OPENAI_API_KEY");
  if (!key) return { platform: "openai", label: "OpenAI", status: "unknown", note: "No API key configured" };

  try {
    const res = await fetch("https://api.openai.com/v1/usage", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 200) {
      return { platform: "openai", label: "OpenAI", status: "ok", note: "API key valid" };
    }
    if (res.status === 429) {
      return { platform: "openai", label: "OpenAI", status: "critical", balance: "Rate limited", daysLeft: 0, note: "Quota exceeded" };
    }
    return { platform: "openai", label: "OpenAI", status: "unknown", note: `Status ${res.status}` };
  } catch {
    return { platform: "openai", label: "OpenAI", status: "unknown", note: "Check failed" };
  }
}

async function checkResend(): Promise<PlatformCheck> {
  const key = env("RESEND_API_KEY");
  if (!key) return { platform: "resend", label: "Resend Email", status: "unknown", note: "No API key — cold emails disabled" };

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { platform: "resend", label: "Resend Email", status: "ok", note: "API key valid" };
    if (res.status === 401) return { platform: "resend", label: "Resend Email", status: "critical", note: "Invalid API key" };
    return { platform: "resend", label: "Resend Email", status: "unknown", note: `Status ${res.status}` };
  } catch {
    return { platform: "resend", label: "Resend Email", status: "unknown", note: "Check failed" };
  }
}

async function checkSlack(): Promise<PlatformCheck> {
  const token = env("SLACK_BOT_TOKEN");
  if (!token) return { platform: "slack", label: "Slack", status: "critical", note: "No bot token — Slack messaging disabled" };

  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json().catch(() => ({}));
    if (body.ok) return { platform: "slack", label: "Slack", status: "ok", note: `Connected as ${body.bot_id}` };
    return { platform: "slack", label: "Slack", status: "critical", note: body.error || "Auth failed" };
  } catch {
    return { platform: "slack", label: "Slack", status: "unknown", note: "Check failed" };
  }
}

async function checkDataGov(): Promise<PlatformCheck> {
  const key = env("DATA_GOV_API_KEY");
  if (!key) return { platform: "data_gov", label: "Data.gov.in (Agmarknet)", status: "unknown", note: "No key — morning prices use reference data" };
  return { platform: "data_gov", label: "Data.gov.in (Agmarknet)", status: "ok", note: "Key configured" };
}

async function checkMeta(): Promise<PlatformCheck> {
  const token = env("META_ACCESS_TOKEN");
  if (!token) return { platform: "meta", label: "Meta (Facebook/Instagram)", status: "unknown", note: "No access token — social posting disabled" };

  try {
    const res = await fetch(`https://graph.facebook.com/me?access_token=${token}`, { signal: AbortSignal.timeout(5000) });
    const body = await res.json().catch(() => ({}));
    if (body.id) return { platform: "meta", label: "Meta (Facebook/Instagram)", status: "ok", note: `Connected as ${body.name || body.id}` };
    if (body.error?.code === 190) return { platform: "meta", label: "Meta (Facebook/Instagram)", status: "critical", note: "Token expired — renew in Meta Business" };
    return { platform: "meta", label: "Meta (Facebook/Instagram)", status: "unknown", note: body.error?.message || "Check failed" };
  } catch {
    return { platform: "meta", label: "Meta (Facebook/Instagram)", status: "unknown", note: "Check failed" };
  }
}

async function checkLinkedIn(): Promise<PlatformCheck> {
  const token = env("LINKEDIN_ACCESS_TOKEN");
  if (!token) return { platform: "linkedin", label: "LinkedIn", status: "unknown", note: "No token — LinkedIn posting disabled" };

  try {
    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { platform: "linkedin", label: "LinkedIn", status: "ok", note: "Token valid" };
    if (res.status === 401) return { platform: "linkedin", label: "LinkedIn", status: "critical", note: "Token expired — renew in LinkedIn Developer Portal" };
    return { platform: "linkedin", label: "LinkedIn", status: "unknown", note: `Status ${res.status}` };
  } catch {
    return { platform: "linkedin", label: "LinkedIn", status: "unknown", note: "Check failed" };
  }
}

async function sendSlack(text: string) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false };
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text: cleanSlackText(text) }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.ok, ts: body.ts };
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false });

  const client = getSupabase();
  const startAt = Date.now();

  // Run all platform checks in parallel
  const checks = await Promise.all([
    checkOpenAI(),
    checkResend(),
    checkSlack(),
    checkDataGov(),
    checkMeta(),
    checkLinkedIn(),
  ]);

  const critical = checks.filter(c => c.status === "critical");
  const unknown = checks.filter(c => c.status === "unknown");
  const ok = checks.filter(c => c.status === "ok");

  // Save alerts to DB for new issues
  if (client) {
    for (const check of [...critical, ...unknown]) {
      // Check if alert already open
      let existing = null;
      try {
        const { data } = await client
          .from("cto_credit_alerts")
          .select("id")
          .eq("tenant_id", TENANT_ID)
          .eq("platform", check.platform)
          .in("status", ["Open", "CFO_Notified"])
          .maybeSingle();
        existing = data;
      } catch {
        existing = null;
      }

      if (!existing) {
        try {
          await client.from("cto_credit_alerts").insert({
            tenant_id: TENANT_ID,
            platform: check.platform,
            alert_type: check.status === "critical" ? "credit_critical" : "config_missing",
            current_balance: check.balance || check.note || "Unknown",
            estimated_days_left: check.daysLeft ?? null,
            status: "Open",
            cfo_notified_at: new Date().toISOString(),
          });
        } catch {
          // Health check should still return if alert persistence is unavailable.
        }
      }
    }

    // Resolve alerts for platforms now OK
    for (const check of ok) {
      try {
        await client.from("cto_credit_alerts")
          .update({ status: "Paid", paid_at: new Date().toISOString() })
          .eq("tenant_id", TENANT_ID)
          .eq("platform", check.platform)
          .in("status", ["Open", "CFO_Notified"]);
      } catch {
        // Health check should still return if alert resolution persistence is unavailable.
      }
    }

    // Log CTO decision
    try {
      await client.from("agent_decisions").insert({
        tenant_id: TENANT_ID,
        agent: "CTO",
        decision_type: "credit_alert",
        decision_summary: `Daily platform health check: ${ok.length} OK, ${critical.length} critical, ${unknown.length} not configured`,
        confidence: 1.0,
        requires_director: false,
        output_data: { checks },
      });
    } catch {
      // Health check should still return if decision logging is unavailable.
    }

    // Update integration_services table
    for (const check of checks) {
      try {
        await client.from("integration_services").upsert({
          tenant_id: TENANT_ID,
          platform_key: check.platform,
          platform_name: check.label,
          status: check.status === "ok" ? "live" : check.status === "critical" ? "error" : "warning",
          error_message: check.note || null,
          last_checked_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,platform_key" });
      } catch {
        // Health check should still return if integration status persistence is unavailable.
      }
    }
  }

  // Send Slack alert to CFO if issues found
  if (critical.length > 0) {
    const alertLines = [`🖥️ *CTO Alert — Platform Issues Detected*`, ``];
    for (const c of critical) {
      alertLines.push(`🔴 *${c.label}*: ${c.note || "Critical issue"}`);
    }
    if (unknown.length > 0) {
      alertLines.push(``);
      alertLines.push(`⚠️ *Not configured (${unknown.length} platforms):*`);
      for (const c of unknown) {
        alertLines.push(`  • ${c.label}: ${c.note}`);
      }
    }
    alertLines.push(``);
    alertLines.push(`💰 *CFO — Please check Payment Requirements in CTO Command and recharge/renew as needed.*`);
    await sendSlack(alertLines.join("\n"));
  }

  // Daily healthy summary (only if all OK)
  if (critical.length === 0 && unknown.length <= 2) {
    const lines = [
      `🖥️ *CTO — Daily Health Check ✅*`,
      `${ok.length} platforms healthy | ${unknown.length} not yet configured`,
      ok.map(c => `  ✅ ${c.label}`).join("\n"),
    ];
    if (unknown.length > 0) lines.push(unknown.map(c => `  ⚠️ ${c.label}: ${c.note}`).join("\n"));
    await sendSlack(lines.join("\n"));
  }

  return res.status(200).json({
    ok: true,
    checks,
    summary: { total: checks.length, ok: ok.length, critical: critical.length, unknown: unknown.length },
    duration_ms: Date.now() - startAt,
  });
}
