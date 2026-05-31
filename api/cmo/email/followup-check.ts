// @ts-nocheck
/**
 * CMO Follow-up Email Check — runs daily at 10:00 AM IST (4:30 AM UTC)
 *
 * Checks cold_email_sequences table for buyers due a follow-up.
 * Sends follow-up emails automatically via Resend.
 * Sequence: intro → 3-day → 7-day → 14-day → mark cold
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

const FOLLOW_UP_DAYS: Record<number, number> = { 1: 3, 2: 7, 3: 14 };

const FOLLOW_UP_SUBJECTS: Record<number, string> = {
  2: "Following up — {product} export inquiry",
  3: "Quick check-in — GOPU Exports",
  4: "Last follow-up — {product} from India",
};

function buildFollowUpEmail(seq: any, stage: number): { subject: string; html: string } {
  const name = seq.buyer_name || "Dear Buyer";
  const product = seq.product || "spices";
  const company = "GOPU Exports";

  const subject = (FOLLOW_UP_SUBJECTS[stage] || "Following up from GOPU Exports")
    .replace("{product}", product);

  const intros: Record<number, string> = {
    2: `I wanted to follow up on our earlier message about exporting premium ${product} from India. We understand you receive many inquiries, so I'll keep this brief.`,
    3: `I'm reaching out once more regarding ${product} exports from India. Many of our buyers in your region have found our quality and pricing very competitive — I'd love for you to experience the same.`,
    4: `This is my final follow-up regarding ${product} exports from India. If the timing isn't right, no worries at all — I'll keep you in our database for future opportunities.`,
  };

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9">
      <h3 style="color:#1a1a2e">Dear ${name},</h3>
      <p>${intros[stage] || `Following up on our ${product} export inquiry.`}</p>
      <p>We export the following directly from source:</p>
      <ul style="color:#333;line-height:2">
        <li>✅ 100% natural, export-grade quality</li>
        <li>✅ Phytosanitary & Spice Board certified</li>
        <li>✅ FOB / CIF / CFR available</li>
        <li>✅ Minimum order: 1 MT</li>
        <li>✅ Competitive pricing — updated weekly from live mandi prices</li>
      </ul>
      <p>Would you like a fresh quote for ${product}? I can send it within 24 hours.</p>
      <p style="margin-top:24px">Best regards,<br><strong>${company}</strong><br>India Export Division</p>
      <p style="font-size:11px;color:#999;margin-top:32px">You are receiving this because you expressed interest in Indian spice imports. Reply STOP to unsubscribe.</p>
    </div>`;

  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("FROM_EMAIL") || "exports@gopuexports.com",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => null);
  return res?.ok === true;
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const client = getSupabase();
  if (!client) return res.status(200).json({ ok: true, skipped: "no_supabase" });

  const now = new Date().toISOString();
  const startAt = Date.now();
  let sent = 0, skipped = 0, markedCold = 0;

  // Fetch all sequences due for follow-up
  let due = [];
  try {
    const { data } = await client
      .from("cold_email_sequences")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .in("status", ["Sent", "Pending"])
      .lte("next_followup_at", now)
      .lt("sequence_stage", 4)
      .limit(50);
    due = data || [];
  } catch {
    due = [];
  }

  for (const seq of (due || [])) {
    const nextStage = (seq.sequence_stage || 1) + 1;

    if (!seq.buyer_email) { skipped++; continue; }

    const { subject, html } = buildFollowUpEmail(seq, nextStage);
    const ok = await sendEmail(seq.buyer_email, subject, html);

    if (ok) {
      const nextFollowup = nextStage < 4
        ? new Date(Date.now() + FOLLOW_UP_DAYS[nextStage] * 24 * 60 * 60 * 1000).toISOString()
        : null;

      try {
        await client
          .from("cold_email_sequences")
          .update({
            sequence_stage: nextStage,
            status: nextStage >= 4 ? "Exhausted" : "Sent",
            sent_at: now,
            next_followup_at: nextFollowup,
            email_subject: subject,
            updated_at: now,
          })
          .eq("id", seq.id);
      } catch {
        // Follow-up processing should continue if a sequence update fails.
      }

      // Log agent decision
      try {
        await client.from("agent_decisions").insert({
        tenant_id: TENANT_ID,
        agent: "CMO",
        decision_type: "email_send",
        decision_summary: `Follow-up email stage ${nextStage} sent to ${seq.buyer_name || seq.buyer_email} for ${seq.product || "product"}`,
        confidence: 0.9,
        requires_director: false,
        output_data: { buyer_email: seq.buyer_email, stage: nextStage, subject },
        });
      } catch {
        // Follow-up processing should continue if decision logging is unavailable.
      }

      sent++;
    } else {
      skipped++;
    }
  }

  // Mark sequences exhausted after stage 4 as Cold
  let exhausted = [];
  try {
    const { data } = await client
      .from("cold_email_sequences")
      .select("id, buyer_name")
      .eq("tenant_id", TENANT_ID)
      .eq("status", "Exhausted")
      .is("next_followup_at", null);
    exhausted = data || [];
  } catch {
    exhausted = [];
  }

  for (const seq of (exhausted || [])) {
    try {
      await client
        .from("cold_email_sequences")
        .update({ status: "Cold", updated_at: now })
        .eq("id", seq.id);
    } catch {
      // Exhaustion cleanup should continue if one sequence update fails.
    }
    markedCold++;
  }

  // Slack notification summary if anything was sent
  const slackToken = env("SLACK_BOT_TOKEN");
  const slackChannel = env("SLACK_CHANNEL_ID");
  if (sent > 0 && slackToken && slackChannel) {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: slackChannel,
        text: `📣 *CMO — Follow-up Emails Sent*\n✉️ ${sent} follow-up email${sent > 1 ? "s" : ""} sent to buyers today\n${markedCold > 0 ? `❄️ ${markedCold} buyer${markedCold > 1 ? "s" : ""} moved to Cold (no response after 14 days)` : ""}`,
      }),
    }).catch(() => null);
  }

  return res.status(200).json({
    ok: true,
    sent,
    skipped,
    marked_cold: markedCold,
    duration_ms: Date.now() - startAt,
  });
}
