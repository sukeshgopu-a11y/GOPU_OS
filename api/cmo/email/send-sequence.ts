// @ts-nocheck
/**
 * CMO — Start Cold Email Sequence for a buyer
 * Called by CIO when a new buyer is scored A or B tier
 * Called by COO when a lead is received without direct contact
 *
 * POST body: { buyer_name, buyer_email, company_name, country, product, lead_id }
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

function buildIntroEmail(buyer: any): { subject: string; html: string } {
  const name = buyer.buyer_name || "Dear Buyer";
  const product = buyer.product || "premium Indian spices";
  const country = buyer.country || "your country";

  const subject = `Premium ${product} exports from India — GOPU Exports`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9">
      <h2 style="color:#1a1a2e">Dear ${name},</h2>
      <p>I'm reaching out from <strong>GOPU Exports</strong>, a leading Indian spice and agricultural commodity exporter.</p>
      <p>We noticed your interest in importing ${product} into ${country} and would love to present you with a competitive offer.</p>

      <h3 style="color:#1a1a2e">Why GOPU Exports?</h3>
      <ul style="color:#333;line-height:2">
        <li>🌿 <strong>Direct from source</strong> — we work directly with farmers across Andhra Pradesh, Kerala & Rajasthan</li>
        <li>📋 <strong>Fully certified</strong> — Spice Board of India, APEDA, Phytosanitary, FSSAI compliant</li>
        <li>🚢 <strong>All incoterms</strong> — FOB, CIF, CFR, DAP as required</li>
        <li>⚡ <strong>Fast turnaround</strong> — 15–30 days from order confirmation to shipment</li>
        <li>💰 <strong>Live pricing</strong> — updated daily from Indian mandi markets</li>
      </ul>

      <p><strong>Products available for export:</strong><br>
      Red Chilli, Turmeric, Black Pepper, Cumin, Coriander, Cardamom, Fenugreek, Mustard, Cinnamon, Clove, Rice, Onion, Garlic</p>

      <p style="background:#e8f4fd;padding:16px;border-radius:8px;border-left:4px solid #2563eb">
        <strong>Would you like a quotation?</strong><br>
        Simply reply with your required product, quantity, and destination port — we'll have a competitive Proforma Invoice ready within 24 hours.
      </p>

      <p style="margin-top:24px">Looking forward to doing business with you.</p>
      <p>Best regards,<br><strong>GOPU Exports</strong><br>International Trade Division<br>India</p>
    </div>`;

  return { subject, html };
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const body = req.body || {};
  const { buyer_name, buyer_email, company_name, country, product, lead_id } = body;

  if (!buyer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer_email)) {
    return res.status(400).json({ ok: false, error: "valid buyer_email required" });
  }

  const client = getSupabase();
  if (!client) return res.status(200).json({ ok: false, error: "no_supabase" });

  // Check if sequence already exists for this email
  const { data: existing } = await client
    .from("cold_email_sequences")
    .select("id, status")
    .eq("tenant_id", TENANT_ID)
    .eq("buyer_email", buyer_email)
    .in("status", ["Sent", "Pending", "Opened"])
    .maybeSingle()
    .catch(() => ({ data: null }));

  if (existing) {
    return res.status(200).json({ ok: true, skipped: true, reason: "sequence_already_active", id: existing.id });
  }

  // Send intro email
  const { subject, html } = buildIntroEmail({ buyer_name, product, country });
  const resendKey = env("RESEND_API_KEY");
  let emailSent = false;

  if (resendKey) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("FROM_EMAIL") || "exports@gopuexports.com",
        to: [buyer_email],
        subject,
        html,
      }),
    }).then(r => r.json()).catch(() => ({}));
    emailSent = !emailRes.error;
  }

  // Create sequence record
  const now = new Date().toISOString();
  const followup3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: seq, error } = await client
    .from("cold_email_sequences")
    .insert({
      tenant_id: TENANT_ID,
      lead_id: lead_id || null,
      buyer_name,
      buyer_email,
      company_name: company_name || null,
      country: country || null,
      product: product || null,
      sequence_stage: 1,
      status: emailSent ? "Sent" : "Pending",
      sent_at: emailSent ? now : null,
      next_followup_at: followup3days,
      email_subject: subject,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  // Log CMO decision
  await client.from("agent_decisions").insert({
    tenant_id: TENANT_ID,
    agent: "CMO",
    decision_type: "email_send",
    decision_summary: `Cold email sequence started for ${buyer_name || buyer_email} — ${product || "product"}. Stage 1 intro ${emailSent ? "sent" : "queued"}.`,
    confidence: 0.85,
    requires_director: false,
    output_data: { buyer_email, product, email_sent: emailSent, sequence_id: seq?.id },
  }).catch(() => null);

  return res.status(200).json({
    ok: true,
    email_sent: emailSent,
    sequence_id: seq?.id,
    next_followup: followup3days,
    message: emailSent
      ? `Intro email sent to ${buyer_email}. Follow-ups: 3 days, 7 days, 14 days.`
      : `Sequence created. Email will send when RESEND_API_KEY is configured.`,
  });
}
