// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { advanceStage } from "../export/stages.js";
import { buyerReleaseEmail, createApprovedLeadProformaInvoice } from "../_shared/approvedLeadProformaInvoice.js";

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

function approvalContext(approval: any, meta: any = {}) {
  const details = meta.details || approval.details || {};
  const lead = meta.lead || details.lead || {};
  const pricing = meta.pricing || details.pricing || {};
  const buyerEmail = meta.buyer_email || meta.email || details.buyer_email || details.email || lead.email || approval.buyer_email || "";
  const product = meta.product || details.product || lead.product || approval.product || "As discussed";
  const quantity = meta.quantity || details.quantity || lead.quantity || approval.quantity || "";
  const unit = meta.unit || details.unit || lead.unit || lead.unit_of_measure || "";
  const destination = meta.destination || details.destination || lead.destination_country || lead.country || approval.destination_country || "";
  const incoterm = meta.incoterm || details.incoterm || pricing.incoterm || lead.incoterm || approval.incoterm || "FOB";
  const leadId = meta.lead_id || details.lead_id || lead.id || approval.related_record_id || "";
  const leadNumber = meta.lead_number || details.lead_number || lead.lead_number || approval.lead_number || "";
  const exportOrderId = meta.export_order_id || details.export_order_id || "";
  return {
    details,
    lead,
    pricing,
    buyerEmail,
    product,
    quantity,
    unit,
    destination,
    incoterm,
    leadId,
    leadNumber,
    exportOrderId,
    companyName: meta.company_name || details.company_name || lead.company_name || approval.buyer_name || "Valued Buyer",
    quoteAmount: approval.amount || approval.quotation_amount || meta.final_quote_amount || details.quote_total || details.amount || "TBD"
  };
}

async function sendQuoteEmail(approval: any, meta: any, note = "") {
  const context = approvalContext(approval, meta);
  const releaseEmail = buyerReleaseEmail(context.buyerEmail);
  const buyerEmail = releaseEmail.email;
  const resendKey = env("RESEND_API_KEY");
  if (!resendKey || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    const reason = !buyerEmail ? "missing_buyer_email" : !resendKey ? "resend_not_configured" : "invalid_buyer_email";
    return { ok: false, skipped: true, reason };
  }
  const cc = [env("FOUNDER_EMAIL"), env("QUOTE_CC_EMAIL"), env("FROM_EMAIL")].filter(Boolean);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;background:#f8fafc;color:#0f172a">
      <h2>Dear ${approval.buyer_name || context.companyName || "Valued Buyer"},</h2>
      <p>Thank you for your enquiry. GOPU Exports has prepared the approved quotation below.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:white">
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Lead No</td><td style="padding:10px;border:1px solid #e2e8f0">${context.leadNumber}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Product</td><td style="padding:10px;border:1px solid #e2e8f0">${context.product}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Quantity</td><td style="padding:10px;border:1px solid #e2e8f0">${context.quantity} ${context.unit}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Incoterm</td><td style="padding:10px;border:1px solid #e2e8f0">${context.incoterm}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0">Delivery Estimate</td><td style="padding:10px;border:1px solid #e2e8f0">${context.pricing?.seaLeadTime || meta.logistics?.lead_time || "To be confirmed"}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0"><strong>Total Quote</strong></td><td style="padding:10px;border:1px solid #e2e8f0"><strong>${context.quoteAmount}</strong></td></tr>
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
      subject: `GOPU Exports quotation - ${context.product || "Export enquiry"}`,
      html,
    }),
  });
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && !body.error,
    status: response.status,
    id: body.id || null,
    error: body.error || null,
    to: buyerEmail,
    original_to: releaseEmail.original || null,
    buyer_email_override: releaseEmail.overridden,
    release_reason: releaseEmail.reason,
    cc
  };
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
  const context = approvalContext(approval, meta);
  const releaseEmail = buyerReleaseEmail(context.buyerEmail);
  const approvedAt = new Date().toISOString();
  const approvedMeta = {
    ...meta,
    lead: context.lead,
    pricing: context.pricing,
    lead_id: context.leadId,
    lead_number: context.leadNumber,
    buyer_email: context.buyerEmail,
    email: context.buyerEmail,
    buyer_email_release_to: releaseEmail.email,
    buyer_email_release_reason: releaseEmail.reason,
    product: context.product,
    quantity: context.quantity,
    unit: context.unit,
    destination: context.destination,
    incoterm: context.incoterm,
    final_quote_amount: context.quoteAmount,
    stage_after_approval: 2,
    buyer_reply_release_status: "released_after_director_approval",
    stage_2_handoff_metadata: {
      approved_at: approvedAt,
      buyer_reply_email: releaseEmail.email,
      original_buyer_email: context.buyerEmail || null,
      quote_release_requires_director_approval: false,
    },
  };

  await safeUpdate(client, "founder_approvals", approval_id, {
    status: "Approved",
    approval_status: "Approved",
    decision_note: note || approval.decision_note || "",
    decided_by: "Director",
    decided_at: approvedAt,
    metadata: approvedMeta,
    director_approval_metadata: {
      ...(approval.director_approval_metadata || {}),
      decided_by: "Director",
      decided_at: approvedAt,
      stage_2_handoff_ready: true,
      email_status: "pending",
    },
    updated_at: approvedAt,
  });

  const email = await sendQuoteEmail(approval, meta, note || "");
  const stage = context.exportOrderId
    ? await advanceStage(client, context.exportOrderId, 2, "Director Approval", {
      buyer_reply_email: email.to || null,
      quote_email_result: email,
      stage_2_handoff_metadata: {
        approved_at: new Date().toISOString(),
        buyer_reply_email: email.to || null,
        quote_email_result: email,
        lead_number: context.leadNumber,
      },
    })
    : { ok: false, skipped: true, message: "No export_order_id on approval metadata." };
  const invoice = await createApprovedLeadProformaInvoice(client, {
    ...approval,
    status: "Approved",
    approval_status: "Approved",
    decided_by: "Director",
    decided_at: approvedAt,
    metadata: approvedMeta,
  }, { note: note || "", approved_at: approvedAt, quote_email_result: email, stage_result: stage });

  await safeUpdate(client, "founder_approvals", approval_id, {
    director_approval_metadata: {
      ...(approval.director_approval_metadata || {}),
      decided_by: "Director",
      decided_at: approvedAt,
      stage_2_handoff_ready: Boolean(stage?.ok),
      stage_2_result: stage,
      email_status: email.ok ? "sent" : "skipped_or_failed",
      email_result: email,
      stage_1_invoice_ready: Boolean(invoice?.invoice?.invoice_number),
      proforma_invoice: invoice?.invoice || null,
      invoice_email_status: invoice?.email?.ok ? "sent" : "skipped_or_failed",
    },
    updated_at: new Date().toISOString(),
  });

  if (context.leadId) {
    const leadStatus = invoice?.email?.ok
      ? "Proforma Invoice Sent"
      : email.ok ? "Quotation Sent" : "Director Approved";
    await client.from("lead_intake").update({ status: leadStatus, updated_at: new Date().toISOString() }).eq("id", context.leadId);
  }

  const slackToken = env("SLACK_BOT_TOKEN");
  const slackChannel = env("SLACK_CHANNEL_ID");
  if (slackToken && slackChannel) {
    const invoiceText = invoice?.invoice?.invoice_number
      ? `\nInvoice: ${invoice.invoice.invoice_number}\nInvoice email: ${invoice.invoice.buyer_email || "admin@gopuexports.com"}`
      : "\nInvoice: not created";
    const text = email.ok
      ? `✅ *Director Approved — Quote Sent*\nLead: ${context.leadNumber || approval_id}\nBuyer: ${approval.buyer_name || context.companyName || "Buyer"}\nAmount: ${context.quoteAmount}\nBuyer-facing email: ${email.to}\nOriginal buyer email: ${email.original_to || "not provided"}\nStage: 2 — Proforma routed to admin review`
      : `✅ *Director Approved*\nLead: ${context.leadNumber || approval_id}\nAmount: ${context.quoteAmount}\nEmail not sent: ${email.reason || email.error || "unknown"}`;
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: slackChannel, text: `${text}${invoiceText}` }),
    }).catch(() => null);
  }

  return res.status(200).json({ ok: true, status: "approved", email, stage, invoice });
}
