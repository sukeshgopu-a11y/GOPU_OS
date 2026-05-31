// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { advanceStage } from "../export/stages.js";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getClient() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function safeUpdate(client: any, table: string, id: string, payload: Record<string, any>) {
  const { error } = await client.from(table).update(payload).eq("id", id);
  const missingColumn = String(error?.message || "").match(/'([^']+)'\s+column/)?.[1];
  if (error && missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
    const fallback = { ...payload };
    delete fallback[missingColumn];
    return safeUpdate(client, table, id, fallback);
  }
  return { ok: !error, error };
}

async function sendQuoteEmail(approval: any, meta: any, note = "") {
  const buyerEmail = meta.buyer_email || meta.email || "";
  const resendKey = env("RESEND_API_KEY");
  if (!resendKey || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return { ok: false, skipped: true, reason: !buyerEmail ? "missing_buyer_email" : "resend_not_configured" };
  }
  const cc = [env("FOUNDER_EMAIL"), env("QUOTE_CC_EMAIL"), env("FROM_EMAIL")].filter(Boolean);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;background:#f8fafc;color:#0f172a">
      <h2>Dear ${approval.buyer_name || meta.company_name || "Valued Buyer"},</h2>
      <p>Thank you for your enquiry. GOPU Exports has prepared the approved quotation below.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:white">
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Lead No</td><td style="padding:10px;border:1px solid #e2e8f0">${meta.lead_number || ""}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Product</td><td style="padding:10px;border:1px solid #e2e8f0">${meta.product || meta.lead?.product || "As discussed"}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Quantity</td><td style="padding:10px;border:1px solid #e2e8f0">${meta.quantity || meta.lead?.quantity || ""} ${meta.unit || meta.lead?.unit || ""}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Incoterm</td><td style="padding:10px;border:1px solid #e2e8f0">${meta.incoterm || meta.pricing?.incoterm || "FOB"}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Delivery Estimate</td><td style="padding:10px;border:1px solid #e2e8f0">${meta.pricing?.seaLeadTime || meta.logistics?.lead_time || "To be confirmed"}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0"><strong>Total Quote</strong></td><td style="padding:10px;border:1px solid #e2e8f0"><strong>${approval.amount || meta.final_quote_amount || "TBD"}</strong></td></tr>
      </table>
      <p>This quotation remains subject to final document and payment confirmations.</p>
      ${note ? `<p><strong>Director note:</strong> ${note}</p>` : ""}
      <p>Regards,<br><strong>GOPU Exports</strong></p>
    </div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("FROM_EMAIL") || "exports@gopuexports.com",
      to: [buyerEmail],
      cc,
      subject: `GOPU Exports quotation - ${meta.product || meta.lead?.product || "Export enquiry"}`,
      html,
    }),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok && !body.error, status: response.status, id: body.id || null, error: body.error || null, to: buyerEmail, cc };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "POST required." });
  }
  const client = getClient();
  if (!client) return res.status(200).json({ ok: false, status: "not_configured", message: "Supabase server env is missing." });
  const { approval_id, note } = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!approval_id) return res.status(200).json({ ok: false, status: "missing_approval_id" });

  const { data: approval, error } = await client.from("founder_approvals").select("*").eq("id", approval_id).maybeSingle();
  if (error || !approval) return res.status(200).json({ ok: false, status: "approval_not_found", message: error?.message || "Approval not found." });
  const meta = approval.metadata || {};

  await safeUpdate(client, "founder_approvals", approval_id, {
    status: "Approved",
    approval_status: "Approved",
    decision_note: note || approval.decision_note || "",
    decided_by: "Director",
    decided_at: new Date().toISOString(),
    metadata: {
      ...meta,
      stage_after_approval: 2,
      buyer_reply_release_status: "released_after_director_approval",
      stage_2_handoff_metadata: {
        approved_at: new Date().toISOString(),
        buyer_reply_email: meta.buyer_email || meta.email || "",
        quote_release_requires_director_approval: false,
      },
    },
    director_approval_metadata: {
      ...(approval.director_approval_metadata || {}),
      decided_by: "Director",
      decided_at: new Date().toISOString(),
      stage_2_handoff_ready: true,
      email_status: "pending",
    },
    updated_at: new Date().toISOString(),
  });

  const email = await sendQuoteEmail(approval, meta, note || "");
  const stage = meta.export_order_id
    ? await advanceStage(client, meta.export_order_id, 2, "Director Approval", {
      buyer_reply_email: email.to || null,
      quote_email_result: email,
      stage_2_handoff_metadata: {
        approved_at: new Date().toISOString(),
        buyer_reply_email: email.to || null,
        quote_email_result: email,
        lead_number: meta.lead_number || approval.lead_number || "",
      },
    })
    : { ok: false, skipped: true, message: "No export_order_id on approval metadata." };

  await safeUpdate(client, "founder_approvals", approval_id, {
    director_approval_metadata: {
      ...(approval.director_approval_metadata || {}),
      decided_by: "Director",
      decided_at: new Date().toISOString(),
      stage_2_handoff_ready: Boolean(stage?.ok),
      stage_2_result: stage,
      email_status: email.ok ? "sent" : "skipped_or_failed",
      email_result: email,
    },
    updated_at: new Date().toISOString(),
  });

  if (meta.lead_id) {
    await client.from("lead_intake").update({ status: email.ok ? "Quotation Sent" : "Director Approved", updated_at: new Date().toISOString() }).eq("id", meta.lead_id);
  }

  const slackToken = env("SLACK_BOT_TOKEN");
  const slackChannel = env("SLACK_CHANNEL_ID");
  if (slackToken && slackChannel) {
    const text = email.ok
      ? `✅ *Director Approved — Quote Sent*\nLead: ${meta.lead_number || approval.lead_number || approval_id}\nBuyer: ${approval.buyer_name || "Buyer"}\nAmount: ${approval.amount || meta.final_quote_amount || "TBD"}\nStage: 2 — Proforma sent to buyer`
      : `✅ *Director Approved*\nLead: ${meta.lead_number || approval.lead_number || approval_id}\nAmount: ${approval.amount || meta.final_quote_amount || "TBD"}\nEmail not sent: ${email.reason || email.error || "unknown"}`;
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: slackChannel, text }),
    }).catch(() => null);
  }

  return res.status(200).json({ ok: true, status: "approved", email, stage });
}
