// @ts-nocheck
import crypto from "node:crypto";
import { cleanSlackText } from "../../lib/slackTextClean.js";
import { buildInvoicePdfBase64 } from "../../lib/leadInvoicePdf.mjs";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_BUYER_RELEASE_EMAIL = "admin@gopuexports.com";
const DEMO_BUYER_RELEASE_EMAIL = "sukeshgopu@gmail.com";
const PROFORMA_INVOICE_TYPE = "Proforma Invoice";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function nowIso() {
  return new Date().toISOString();
}

function compact(value: unknown, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
}

function escapeHtml(value: unknown) {
  return compact(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeEmail(value = "") {
  const raw = String(value || "").trim();
  const bracket = raw.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/)?.[1];
  const direct = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  return bracket || direct || "";
}

export function proformaInvoiceTestEmail() {
  return buyerReleaseEmail().email;
}

export function buyerReleaseEmail(originalBuyerEmail = "") {
  const original = normalizeEmail(originalBuyerEmail).toLowerCase();
  if (original === DEMO_BUYER_RELEASE_EMAIL) {
    return {
      email: original,
      original,
      overridden: false,
      reason: "demo_buyer_live_release"
    };
  }
  const configured = normalizeEmail(env("BUYER_EMAIL_OVERRIDE") || env("LEAD_BUYER_EMAIL_OVERRIDE"));
  const email = isValidEmail(configured) ? configured : DEFAULT_BUYER_RELEASE_EMAIL;
  return {
    email,
    original,
    overridden: email !== original,
    reason: "admin_buyer_email_override"
  };
}

function missingColumnName(error: any) {
  const message = String(error?.message || "");
  return (
    message.match(/'([^']+)'\s+column/i)?.[1] ||
    message.match(/Could not find the '([^']+)' column/i)?.[1] ||
    message.match(/column "([^"]+)"/i)?.[1] ||
    ""
  );
}

async function tolerantInsert(client: any, table: string, payload: Record<string, any>, select = "*") {
  if (!client) return { ok: false, table, status: "not_configured", message: "Supabase client is missing." };
  try {
    const { data, error } = await client.from(table).insert(payload).select(select).maybeSingle();
    const missing = missingColumnName(error);
    if (error && missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
      const fallback = { ...payload };
      delete fallback[missing];
      return tolerantInsert(client, table, fallback, select);
    }
    if (error) return { ok: false, table, status: "db_write_failed", message: error.message };
    return { ok: true, table, data };
  } catch (error) {
    return { ok: false, table, status: "db_exception", message: error instanceof Error ? error.message : "Insert failed." };
  }
}

async function tolerantUpdate(client: any, table: string, id: string, payload: Record<string, any>) {
  if (!client || !id) return { ok: false, table, skipped: true };
  try {
    const { error } = await client.from(table).update(payload).eq("id", id);
    const missing = missingColumnName(error);
    if (error && missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
      const fallback = { ...payload };
      delete fallback[missing];
      return tolerantUpdate(client, table, id, fallback);
    }
    return error ? { ok: false, table, message: error.message } : { ok: true, table };
  } catch (error) {
    return { ok: false, table, message: error instanceof Error ? error.message : "Update failed." };
  }
}

async function updateExportDocument(client: any, tenantId: string, exportOrderId: string, invoice: any) {
  if (!client || !exportOrderId) return { ok: false, skipped: true };
  try {
    const payload = {
      tenant_id: tenantId,
      export_order_id: exportOrderId,
      document_type: "proforma_invoice",
      document_name: PROFORMA_INVOICE_TYPE,
      stage: 1,
      status: "Generated",
      issued_by: "CFO after Director approval",
      goes_to: `${invoice.testing_mode ? "Admin buyer-email review" : "Buyer email"} ${invoice.buyer_email}`,
      metadata: {
        invoice_id: invoice.id || null,
        invoice_number: invoice.invoice_number,
        emailed_to: invoice.buyer_email,
        generated_at: nowIso(),
        testing_mode: Boolean(invoice.testing_mode)
      }
    };
    const { data, error } = await client
      .from("export_documents")
      .upsert(payload, { onConflict: "export_order_id,document_type" })
      .select("id,status")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Export document update failed." };
  }
}

function financialYear(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function invoiceDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function invoiceNumber(approval: any, meta: any) {
  const details = meta.details || approval.details || {};
  const leadRef = compact(meta.lead_number || details.lead_number || approval.lead_number || approval.related_record_id || approval.id || crypto.randomUUID())
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  const stamp = invoiceDate().replace(/-/g, "");
  return `GX-PI-${stamp}-${leadRef || crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function numericAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferHsCode(product = "") {
  const p = String(product || "").toLowerCase();
  if (/chilli.*ground|chili.*ground|ground.*chilli/.test(p)) return "09042200";
  if (/chilli|chili|red pepper/.test(p)) return "09042110";
  if (/turmeric.*ground|ground.*turmeric/.test(p)) return "09103020";
  if (/turmeric/.test(p)) return "09103010";
  if (/pepper.*ground|ground.*pepper/.test(p)) return "09041200";
  if (/pepper|black pepper/.test(p)) return "09041100";
  return "";
}

function formatMoney(value: unknown, currency = "USD") {
  const amount = numericAmount(value);
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildInvoiceModel(approval: any, options: Record<string, any> = {}) {
  const meta = approval.metadata || {};
  const details = meta.details || approval.details || {};
  const lead = meta.lead || details.lead || {};
  const pricing = meta.pricing || details.pricing || {};
  const tenantId = approval.tenant_id || meta.tenant_id || lead.tenant_id || DEMO_TENANT_ID;
  const quantity = Number(meta.quantity || details.quantity || lead.quantity || pricing.quantity || approval.quantity || 1) || 1;
  const unit = compact(meta.unit || details.unit || lead.unit || lead.unit_of_measure || "MT", "MT").toUpperCase();
  const currency = compact(pricing.currency || meta.currency || "USD", "USD").toUpperCase();
  const total = Number(pricing.recommendedTotalPrice || numericAmount(approval.quotation_amount) || numericAmount(approval.amount) || numericAmount(meta.final_quote_amount || details.quote_total || details.amount)) || 0;
  const unitPrice = Number(pricing.recommendedPricePerUnit || (quantity ? total / quantity : total)) || 0;
  const product = compact(meta.product || details.product || lead.product || approval.product || "Requested product", "Requested product");
  const originalBuyerEmail = normalizeEmail(meta.buyer_email || meta.email || details.buyer_email || details.email || lead.email || approval.buyer_email || "");
  const releaseEmail = buyerReleaseEmail(originalBuyerEmail);
  const buyerEmail = releaseEmail.email;
  const testingMode = releaseEmail.overridden;
  const number = meta.proforma_invoice?.invoice_number || invoiceNumber(approval, meta);
  const date = invoiceDate();

  return {
    tenant_id: tenantId,
    invoice_type: PROFORMA_INVOICE_TYPE,
    invoice_number: number,
    invoice_date: date,
    financial_year: financialYear(),
    status: testingMode ? "Sent for Admin Review" : "Sent to Buyer",
    approval_status: "Director Approved",
    lead_id: meta.lead_id || details.lead_id || lead.id || approval.related_record_id || null,
    quote_id: null,
    export_order_id: meta.export_order_id || details.export_order_id || null,
    export_mode: "Stage 1 Proforma - buyer confirmation pending",
    currency,
    subtotal: total,
    tax_total: 0,
    grand_total: total,
    amount_in_words: `${formatMoney(total, currency)} only`,
    buyer_email: buyerEmail,
    original_buyer_email: originalBuyerEmail,
    buyer_email_release_reason: releaseEmail.reason,
    buyer_name: approval.buyer_name || meta.company_name || details.company_name || lead.company_name || meta.buyer_name || "Buyer",
    buyer_company: meta.company_name || details.company_name || lead.company_name || approval.buyer_name || "Buyer",
    buyer_address: meta.buyer_address || (testingMode ? "Testing buyer address - replace before external release" : "Buyer address to be confirmed"),
    buyer_country: meta.destination || details.destination || lead.destination_country || lead.country || approval.destination_country || "Not provided",
    destination_country: meta.destination || details.destination || lead.destination_country || lead.country || approval.destination_country || "Not provided",
    delivery_address: meta.delivery_address || details.delivery_address || meta.destination || details.destination || lead.destination_country || approval.destination_country || "",
    product,
    hsn_code: meta.hsn_code || inferHsCode(product),
    packing_type: meta.packing_type || "Export packing as agreed",
    quantity,
    unit,
    unit_price: unitPrice,
    taxable_value: total,
    total_value: total,
    incoterm: meta.incoterm || details.incoterm || pricing.incoterm || lead.incoterm || approval.incoterm || "FOB",
    port_of_loading: meta.port_of_loading || "India port - final to be confirmed",
    port_of_discharge: meta.destination_port || lead.destination_port || "",
    final_destination: meta.destination || lead.destination_country || lead.country || "",
    shipping_mode: lead.shipping_mode || meta.shipping_mode || "Sea freight",
    country_of_origin: "India",
    payment_terms: meta.payment_terms || "Advance payment as approved by CFO",
    validity: meta.validity || "7 days from invoice date",
    director_note: options.note || "",
    approved_at: options.approved_at || nowIso(),
    testing_mode: testingMode
  };
}

function invoiceHtml(invoice: any, approval: any) {
  const companyName = "GOPU Exports";
  const rows = [
    ["Invoice No", invoice.invoice_number],
    ["Invoice Date", invoice.invoice_date],
    ["Lead No", approval.lead_number || approval.metadata?.lead_number || ""],
    ["Buyer Email", invoice.buyer_email],
    ["Incoterm", invoice.incoterm],
    ["Payment Terms", invoice.payment_terms],
    ["Validity", invoice.validity]
  ];
  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#111827;background:#ffffff;border:1px solid #d1d5db">
      <div style="padding:24px;border-bottom:3px solid #111827">
        <h1 style="margin:0;font-size:24px;letter-spacing:0;color:#111827">PROFORMA INVOICE</h1>
        <p style="margin:6px 0 0 0;color:#4b5563">Stage 1 buyer confirmation invoice</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:22px;background:#f9fafb">
        <div>
          <h2 style="font-size:14px;margin:0 0 8px 0;color:#111827">Exporter</h2>
          <p style="margin:0;line-height:1.5"><strong>${companyName}</strong><br/>India<br/>Email: ${escapeHtml(env("FROM_EMAIL") || env("RESEND_FROM_EMAIL") || "exports@gopuexports.com")}</p>
        </div>
        <div>
          <h2 style="font-size:14px;margin:0 0 8px 0;color:#111827">Buyer / Consignee</h2>
          <p style="margin:0;line-height:1.5"><strong>${escapeHtml(invoice.buyer_company || invoice.buyer_name)}</strong><br/>${escapeHtml(invoice.buyer_address)}<br/>${escapeHtml(invoice.buyer_country)}<br/>Email: ${escapeHtml(invoice.buyer_email)}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          ${rows.map(([label, value]) => `<tr><td style="width:34%;padding:10px 14px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:700">${escapeHtml(label)}</td><td style="padding:10px 14px;border:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`).join("")}
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:18px">
        <thead>
          <tr style="background:#111827;color:#ffffff">
            <th style="padding:10px;border:1px solid #111827;text-align:left">No</th>
            <th style="padding:10px;border:1px solid #111827;text-align:left">Description</th>
            <th style="padding:10px;border:1px solid #111827;text-align:left">HSN</th>
            <th style="padding:10px;border:1px solid #111827;text-align:right">Qty</th>
            <th style="padding:10px;border:1px solid #111827;text-align:right">Rate</th>
            <th style="padding:10px;border:1px solid #111827;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;border:1px solid #e5e7eb">1</td>
            <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(invoice.product)}<br/><span style="color:#6b7280">Packing: ${escapeHtml(invoice.packing_type)}</span></td>
            <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(invoice.hsn_code || "Pending")}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(invoice.quantity)} ${escapeHtml(invoice.unit)}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(formatMoney(invoice.unit_price, invoice.currency))}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(formatMoney(invoice.total_value, invoice.currency))}</td>
          </tr>
        </tbody>
      </table>
      <div style="display:grid;grid-template-columns:1fr 260px;gap:18px;padding:18px">
        <div style="line-height:1.6">
          <strong>Shipment</strong><br/>
          Origin: ${escapeHtml(invoice.country_of_origin)}<br/>
          Port of loading: ${escapeHtml(invoice.port_of_loading)}<br/>
          Port of discharge: ${escapeHtml(invoice.port_of_discharge || "To be confirmed")}<br/>
          Final destination: ${escapeHtml(invoice.final_destination || invoice.destination_country)}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            <tr><td style="padding:9px;border:1px solid #e5e7eb">Subtotal</td><td style="padding:9px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(formatMoney(invoice.subtotal, invoice.currency))}</td></tr>
            <tr><td style="padding:9px;border:1px solid #e5e7eb">Tax</td><td style="padding:9px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(formatMoney(0, invoice.currency))}</td></tr>
            <tr><td style="padding:9px;border:1px solid #111827;background:#111827;color:#ffffff"><strong>Total</strong></td><td style="padding:9px;border:1px solid #111827;background:#111827;color:#ffffff;text-align:right"><strong>${escapeHtml(formatMoney(invoice.grand_total, invoice.currency))}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div style="padding:18px;border-top:1px solid #e5e7eb;background:#f9fafb;line-height:1.6">
        <strong>Terms</strong><br/>
        This is a proforma invoice for buyer confirmation. It is not a tax invoice, customs document, or final commercial invoice. Final release remains subject to payment, product, shipment, and document verification.
        ${invoice.director_note ? `<br/><br/><strong>Director note:</strong> ${escapeHtml(invoice.director_note)}` : ""}
      </div>
    </div>`;
}

function invoiceText(invoice: any, approval: any) {
  return [
    "GOPU Exports Proforma Invoice",
    `Invoice: ${invoice.invoice_number}`,
    `Lead: ${approval.lead_number || approval.metadata?.lead_number || ""}`,
    `Buyer: ${invoice.buyer_company}`,
    `Buyer email: ${invoice.buyer_email}`,
    `Product: ${invoice.quantity} ${invoice.unit} ${invoice.product}`,
    `Incoterm: ${invoice.incoterm}`,
    `Amount: ${formatMoney(invoice.grand_total, invoice.currency)}`,
    "",
    "This is a Stage 1 proforma invoice for buyer confirmation."
  ].join("\n");
}

function invoiceEmailHtml(invoice: any) {
  const total = formatMoney(invoice.grand_total, invoice.currency);
  const buyerName = compact(invoice.buyer_name || invoice.buyer_company || "");
  const greeting = buyerName ? `Dear ${escapeHtml(buyerName)},` : "Dear Valued Buyer,";
  const quantity = `${compact(invoice.quantity)} ${compact(invoice.unit)}`.trim();
  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:28px;background:#f8fafc;color:#0f172a">
      <div style="background:#ffffff;border:1px solid #e2e8f0;padding:24px">
        <h2 style="margin:0 0 14px;color:#0B1F3A">${greeting}</h2>
        <p>Greetings from <strong>GOPU Exports</strong>.</p>
        <p>Thank you for your interest in our premium Indian <strong>${escapeHtml(invoice.product)}</strong>.</p>
        <p>Please find attached Proforma Invoice No. <strong>${escapeHtml(invoice.invoice_number)}</strong> for your review and approval. The quotation has been prepared based on the specifications and commercial terms discussed.</p>
        <p style="margin:18px 0 8px"><strong>Order Details:</strong></p>
        <ul style="margin:0 0 18px 20px;padding:0;line-height:1.7">
          <li><strong>Product:</strong> ${escapeHtml(invoice.product)}</li>
          <li><strong>Quantity:</strong> ${escapeHtml(quantity)}</li>
          <li><strong>Trade Term:</strong> ${escapeHtml(invoice.incoterm)}</li>
          <li><strong>Total Invoice Value:</strong> ${escapeHtml(invoice.currency)} ${escapeHtml(total.replace(/^[A-Z]{3}\s*/, ""))}</li>
          <li><strong>Payment Terms:</strong> ${escapeHtml(invoice.payment_terms)}</li>
        </ul>
        <p>Kindly review the attached proforma invoice and confirm your acceptance of the terms and specifications.</p>
        <p>Upon receipt of your confirmation and payment advice, our team will immediately initiate:</p>
        <ul style="margin:0 0 18px 20px;padding:0;line-height:1.7">
          <li>Production and quality preparation</li>
          <li>Export documentation</li>
          <li>Packaging and labeling arrangements</li>
          <li>Vessel booking and shipment planning</li>
          <li>Pre-shipment compliance procedures</li>
        </ul>
        <p>If any amendment is required regarding product specifications, packaging, shipment terms, consignee details, or payment conditions, please inform us before payment processing so that we can issue a revised proforma invoice accordingly.</p>
        <p>We appreciate the opportunity to serve your organization and look forward to establishing a long-term business relationship.</p>
        <p>Should you require product samples, certifications, laboratory reports, packaging details, or any additional information, please feel free to contact us.</p>
        <p style="margin-top:22px">Best Regards,<br/><strong>Export Sales Team</strong><br/><strong>GOPU Exports</strong><br/>Email: exports@gopuexports.com<br/>Website: www.gopuexports.com</p>
        <p style="margin:16px 0 0;color:#475569;font-size:12px">Certified Exporter | APEDA | FSSAI | ISO 22000 | Global Export Solutions</p>
      </div>
    </div>`;
}

function invoiceEmailText(invoice: any) {
  const buyerName = compact(invoice.buyer_name || invoice.buyer_company || "");
  const greeting = buyerName ? `Dear ${buyerName},` : "Dear Valued Buyer,";
  const quantity = `${compact(invoice.quantity)} ${compact(invoice.unit)}`.trim();
  const total = formatMoney(invoice.grand_total, invoice.currency).replace(/^[A-Z]{3}\s*/, "");
  return [
    greeting,
    "",
    "Greetings from GOPU Exports.",
    "",
    `Thank you for your interest in our premium Indian ${invoice.product}.`,
    "",
    `Please find attached Proforma Invoice No. ${invoice.invoice_number} for your review and approval. The quotation has been prepared based on the specifications and commercial terms discussed.`,
    "",
    "Order Details:",
    `• Product: ${invoice.product}`,
    `• Quantity: ${quantity}`,
    `• Trade Term: ${invoice.incoterm}`,
    `• Total Invoice Value: ${invoice.currency} ${total}`,
    `• Payment Terms: ${invoice.payment_terms}`,
    "",
    "Kindly review the attached proforma invoice and confirm your acceptance of the terms and specifications.",
    "",
    "Upon receipt of your confirmation and payment advice, our team will immediately initiate:",
    "• Production and quality preparation",
    "• Export documentation",
    "• Packaging and labeling arrangements",
    "• Vessel booking and shipment planning",
    "• Pre-shipment compliance procedures",
    "",
    "If any amendment is required regarding product specifications, packaging, shipment terms, consignee details, or payment conditions, please inform us before payment processing so that we can issue a revised proforma invoice accordingly.",
    "",
    "We appreciate the opportunity to serve your organization and look forward to establishing a long-term business relationship.",
    "",
    "Should you require product samples, certifications, laboratory reports, packaging details, or any additional information, please feel free to contact us.",
    "",
    "Best Regards,",
    "Export Sales Team",
    "GOPU Exports",
    "Email: exports@gopuexports.com",
    "Website: www.gopuexports.com",
    "",
    "Certified Exporter | APEDA | FSSAI | ISO 22000 | Global Export Solutions"
  ].join("\n");
}

async function sendInvoiceEmail(invoice: any, approval: any) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("FROM_EMAIL") || env("RESEND_FROM_EMAIL") || "GOPU Exports <exports@gopuexports.com>";
  if (!apiKey || !from) {
    return { ok: false, skipped: true, status: "not_configured", reason: "resend_not_configured", to: invoice.buyer_email };
  }
  const cc = [
    normalizeEmail(env("PROFORMA_INVOICE_CC_EMAIL")),
    normalizeEmail(env("QUOTE_CC_EMAIL")),
    normalizeEmail(env("FOUNDER_EMAIL"))
  ].filter((email, index, list) => isValidEmail(email) && email !== invoice.buyer_email && list.indexOf(email) === index);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [invoice.buyer_email],
      cc,
      subject: `Proforma Invoice ${invoice.invoice_number} – ${invoice.product} (${invoice.quantity} ${invoice.unit})`,
      html: invoiceEmailHtml(invoice),
      text: invoiceEmailText(invoice),
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: buildInvoicePdfBase64(invoice)
        }
      ]
    })
  });
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && !body.error,
    status: response.ok && !body.error ? "sent" : "failed",
    httpStatus: response.status,
    id: body.id || null,
    error: body.error || null,
    to: invoice.buyer_email,
    cc
  };
}

async function sendSlackInvoiceCopy(invoice: any, approval: any, email: any) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false, skipped: true, status: "not_configured" };
  const emailLabel = invoice.testing_mode ? "Admin buyer-email review" : "Buyer email";
  const releaseNote = invoice.testing_mode
    ? "Director approval is recorded. The buyer-facing invoice email was routed to the admin review address for the present flow."
    : "Director approval is recorded. The Stage 1 proforma invoice was sent to the buyer.";
  const text = cleanSlackText([
    ":page_facing_up: *Stage 1 Proforma Invoice Generated*",
    `Lead: ${approval.lead_number || approval.metadata?.lead_number || approval.id}`,
    `Invoice: ${invoice.invoice_number}`,
    `Buyer: ${invoice.buyer_company}`,
    `${emailLabel}: ${invoice.buyer_email}`,
    `Amount: ${formatMoney(invoice.grand_total, invoice.currency)}`,
    `Email status: ${email.ok ? "sent" : email.reason || email.error || email.status || "not sent"}`,
    "",
    releaseNote
  ].join("\n"));
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text })
    });
    const body = await response.json().catch(() => ({}));
    return response.ok && body.ok === true
      ? { ok: true, status: "sent", channel: body.channel, ts: body.ts }
      : { ok: false, status: "failed", message: body.error || `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, status: "failed", message: error instanceof Error ? error.message : "Slack post failed." };
  }
}

async function insertInvoiceStructure(client: any, approval: any, invoice: any) {
  const payload = {
    tenant_id: invoice.tenant_id,
    invoice_type: invoice.invoice_type,
    invoice_number: invoice.invoice_number,
    financial_year: invoice.financial_year,
    status: invoice.status,
    approval_status: invoice.approval_status,
    lead_id: invoice.lead_id,
    quote_id: invoice.quote_id,
    export_mode: invoice.export_mode,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax_total: invoice.tax_total,
    grand_total: invoice.grand_total,
    amount_in_words: invoice.amount_in_words,
    payload: {
      kind: "stage_1_proforma_invoice",
      requested_name: "performer invoice",
      approval_id: approval.id,
      export_order_id: invoice.export_order_id,
      buyer_email: invoice.buyer_email,
      original_buyer_email: invoice.original_buyer_email,
      invoice_date: invoice.invoice_date,
      payment_terms: invoice.payment_terms,
      validity: invoice.validity,
      testing_mode: Boolean(invoice.testing_mode)
    }
  };
  const invoiceResult = await tolerantInsert(client, "invoices", payload, "*");
  const invoiceId = invoiceResult.data?.id || null;

  const childResults: any[] = [];
  if (invoiceId) {
    childResults.push(await tolerantInsert(client, "invoice_company_snapshot", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      legal_company_name: "GOPU Exports",
      registered_address: "India - complete Company Master Data before external release",
      gstin: env("GOPU_GSTIN") || "",
      iec: env("GOPU_IEC") || "",
      pan: env("GOPU_PAN") || "",
      authorized_signatory: env("GOPU_AUTHORIZED_SIGNATORY") || "Director / Authorized Signatory",
      bank_details_masked: "Masked - verify before external release",
      lut_arn: env("GOPU_LUT_ARN") || "",
      lut_financial_year: invoice.financial_year,
      lut_status: "Review Required"
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_buyer_snapshot", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      buyer_name: invoice.buyer_name,
      buyer_company: invoice.buyer_company,
      buyer_address: invoice.buyer_address,
      buyer_country: invoice.buyer_country,
      delivery_address: invoice.delivery_address,
      destination_country: invoice.destination_country,
      buyer_email: invoice.buyer_email
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_line_items", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      item_number: 1,
      product_description: invoice.product,
      hsn_code: invoice.hsn_code,
      packing_type: invoice.packing_type,
      quantity: invoice.quantity,
      unit: invoice.unit,
      unit_price: invoice.unit_price,
      discount: 0,
      taxable_value: invoice.taxable_value,
      tax_rate: 0,
      tax_amount: 0,
      total_value: invoice.total_value
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_export_details", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      incoterm: invoice.incoterm,
      port_of_loading: invoice.port_of_loading,
      port_of_discharge: invoice.port_of_discharge,
      final_destination: invoice.final_destination,
      shipping_mode: invoice.shipping_mode,
      country_of_origin: invoice.country_of_origin,
      export_mode: invoice.export_mode,
      export_endorsement: "Proforma invoice for buyer confirmation only. Final commercial invoice will be issued after order, shipment, and document verification.",
      hsn_review_required: true,
      origin_review_required: true
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_approval_events", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      approval_stage: "Director Approval",
      status: "Approved",
      actor: "Director",
      notes: "Stage 1 proforma invoice generated after Director approval."
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_validation_logs", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      validation_key: invoice.testing_mode ? "admin_buyer_email_override" : "buyer_email_release",
      status: "Passed",
      severity: "info",
      message: invoice.testing_mode
        ? `Buyer-facing email routed to admin review address ${invoice.buyer_email}. Original buyer email: ${invoice.original_buyer_email || "not provided"}.`
        : `Buyer email set to ${invoice.buyer_email} after Director approval.`,
      owner: "CFO"
    }, "id"));
    childResults.push(await tolerantInsert(client, "invoice_audit_log", {
      tenant_id: invoice.tenant_id,
      invoice_id: invoiceId,
      action: "Stage 1 proforma invoice generated",
      actor: "GOPU OS Approval Pipeline",
      previous_status: "Pending Approval",
      new_status: invoice.status,
      notes: invoice.testing_mode
        ? `Invoice email routed to admin review address ${invoice.buyer_email}.`
        : `Invoice email routed to buyer ${invoice.buyer_email}.`
    }, "id"));
  }

  return { invoiceResult, childResults, invoiceId };
}

export async function createApprovedLeadProformaInvoice(client: any, approval: any, options: Record<string, any> = {}) {
  if (!client) return { ok: false, status: "not_configured", message: "Supabase client is missing." };
  const currentMeta = approval.metadata || {};
  const existing = currentMeta.proforma_invoice || currentMeta.performer_invoice;
  if (existing?.invoice_id || existing?.invoice_number) {
    return { ok: true, status: "already_created", invoice: existing, email: existing.email_result || null, slack: existing.slack_result || null };
  }

  const invoice = buildInvoiceModel(approval, options);
  const { invoiceResult, childResults, invoiceId } = await insertInvoiceStructure(client, approval, invoice);
  const persistedInvoice = { ...invoice, id: invoiceId || invoice.invoice_number };
  const exportDocument = await updateExportDocument(client, invoice.tenant_id, invoice.export_order_id, persistedInvoice);
  const email = await sendInvoiceEmail(persistedInvoice, approval);
  const slack = await sendSlackInvoiceCopy(persistedInvoice, approval, email);

  const timeline = Array.isArray(currentMeta.timeline) ? currentMeta.timeline : [];
  const invoiceSummary = {
    invoice_id: invoiceId,
    invoice_number: persistedInvoice.invoice_number,
    invoice_type: PROFORMA_INVOICE_TYPE,
    buyer_email: persistedInvoice.buyer_email,
    original_buyer_email: persistedInvoice.original_buyer_email || null,
    buyer_email_release_reason: persistedInvoice.buyer_email_release_reason || null,
    amount: formatMoney(persistedInvoice.grand_total, persistedInvoice.currency),
    status: persistedInvoice.status,
    email_result: email,
    slack_result: slack,
    export_document_result: exportDocument,
    generated_at: nowIso(),
    testing_mode: Boolean(persistedInvoice.testing_mode)
  };

  await tolerantUpdate(client, "founder_approvals", approval.id, {
    metadata: {
      ...currentMeta,
      proforma_invoice: invoiceSummary,
      performer_invoice: invoiceSummary,
      invoice_blocked_until_director_approval: false,
      timeline: [
        ...timeline,
        {
          step: 6,
          label: "Stage 1 proforma invoice generated",
          actor: "GOPU OS Approval Pipeline",
          at: invoiceSummary.generated_at,
          detail: `${invoiceSummary.invoice_number} emailed to ${invoiceSummary.buyer_email}`
        }
      ]
    },
    director_approval_metadata: {
      ...(approval.director_approval_metadata || {}),
      proforma_invoice: invoiceSummary,
      stage_1_invoice_ready: true,
      invoice_email_status: email.ok ? "sent" : "skipped_or_failed"
    },
    updated_at: nowIso()
  });

  if (persistedInvoice.lead_id) {
    try {
      await client.from("lead_intake").update({
        status: email.ok
          ? (persistedInvoice.testing_mode ? "Proforma Invoice Sent to Admin" : "Proforma Invoice Sent")
          : "Proforma Invoice Drafted",
        updated_at: nowIso()
      }).eq("id", persistedInvoice.lead_id);
    } catch {
      // Lead status is helpful but not required for invoice creation.
    }
  }

  const metadataOnly = !invoiceResult.ok && /public\.invoices|schema cache|table/i.test(String(invoiceResult.message || ""));

  return {
    ok: Boolean(invoiceResult.ok || metadataOnly),
    status: invoiceResult.ok ? "created" : metadataOnly ? "created_metadata_only" : "partial",
    invoice: invoiceSummary,
    invoice_write: invoiceResult,
    child_writes: childResults,
    email,
    slack,
    export_document: exportDocument
  };
}

export { PROFORMA_INVOICE_TYPE };
