type LeadEmailPayload = {
  id?: string;
  buyer_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  destination_country?: string;
  product?: string;
  quantity?: string;
  incoterm?: string;
  deadline?: string;
  notes?: string;
};

const RESEND_API_BASE = "https://api.resend.com";

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeText(value = "") {
  return String(value).replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char] || char));
}

function normalizeLead(payload: LeadEmailPayload = {}) {
  return {
    id: payload.id || "Draft lead",
    buyerName: payload.buyer_name || "Buyer",
    companyName: payload.company_name || "Importer company",
    email: payload.email || "",
    phone: payload.phone || "",
    destinationCountry: payload.destination_country || "Not provided",
    product: payload.product || "Requested product",
    quantity: payload.quantity || "Not provided",
    incoterm: payload.incoterm || "FOB",
    deadline: payload.deadline || "Not provided",
    notes: payload.notes || ""
  };
}

async function sendResendEmail(apiKey: string, message: { from: string; to: string[]; subject: string; html: string; text: string }) {
  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "GOPU-Lead-Email/1.0"
    },
    body: JSON.stringify(message)
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

function customerEmail(lead: ReturnType<typeof normalizeLead>) {
  const subject = `Thank you for contacting GOPU Exports`;
  const text = [
    `Hello ${lead.buyerName},`,
    "",
    "Thank you for contacting GOPU Exports. We received your enquiry and our team will review the details before sharing any quotation or export commitment.",
    "",
    `Company: ${lead.companyName}`,
    `Product: ${lead.product}`,
    `Quantity: ${lead.quantity}`,
    `Destination: ${lead.destinationCountry}`,
    "",
    "If anything is missing, our team will contact you for clarification. We prefer to confirm product, packing, documents, pricing, and shipment assumptions carefully before sending a buyer-facing quote.",
    "",
    "Regards,",
    "GOPU Exports"
  ].join("\n");
  const html = `<p>Hello ${escapeText(lead.buyerName)},</p><p>Thank you for contacting GOPU Exports. We received your enquiry and our team will review the details before sharing any quotation or export commitment.</p><ul><li><strong>Company:</strong> ${escapeText(lead.companyName)}</li><li><strong>Product:</strong> ${escapeText(lead.product)}</li><li><strong>Quantity:</strong> ${escapeText(lead.quantity)}</li><li><strong>Destination:</strong> ${escapeText(lead.destinationCountry)}</li></ul><p>If anything is missing, our team will contact you for clarification. We prefer to confirm product, packing, documents, pricing, and shipment assumptions carefully before sending a buyer-facing quote.</p><p>Regards,<br/>GOPU Exports</p>`;
  return { subject, text, html };
}

function adminEmail(lead: ReturnType<typeof normalizeLead>) {
  const subject = `New GOPU lead: ${lead.companyName}`;
  const text = [
    "New lead submitted in GOPU OS.",
    "",
    `Lead ID: ${lead.id}`,
    `Buyer: ${lead.buyerName}`,
    `Company: ${lead.companyName}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "Not provided"}`,
    `Destination: ${lead.destinationCountry}`,
    `Product: ${lead.product}`,
    `Quantity: ${lead.quantity}`,
    `Incoterm: ${lead.incoterm}`,
    `Deadline: ${lead.deadline}`,
    "",
    "Next action: COO should verify buyer details before pricing, shipment promises, or buyer-facing documents."
  ].join("\n");
  const html = `<p>New lead submitted in GOPU OS.</p><ul><li><strong>Lead ID:</strong> ${escapeText(lead.id)}</li><li><strong>Buyer:</strong> ${escapeText(lead.buyerName)}</li><li><strong>Company:</strong> ${escapeText(lead.companyName)}</li><li><strong>Email:</strong> ${escapeText(lead.email)}</li><li><strong>Phone:</strong> ${escapeText(lead.phone || "Not provided")}</li><li><strong>Destination:</strong> ${escapeText(lead.destinationCountry)}</li><li><strong>Product:</strong> ${escapeText(lead.product)}</li><li><strong>Quantity:</strong> ${escapeText(lead.quantity)}</li><li><strong>Incoterm:</strong> ${escapeText(lead.incoterm)}</li><li><strong>Deadline:</strong> ${escapeText(lead.deadline)}</li></ul><p>Next action: COO should verify buyer details before pricing, shipment promises, or buyer-facing documents.</p>`;
  return { subject, text, html };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  const adminEmailAddress = env("LEAD_ADMIN_EMAIL") || env("ADMIN_NOTIFICATION_EMAIL") || env("RESEND_TEST_TO");
  if (!apiKey || !from || !adminEmailAddress) {
    return res.status(200).json({ ok: false, status: "not_configured", message: "Lead email env is not fully configured." });
  }

  const payload: LeadEmailPayload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const lead = normalizeLead(payload);
  if (!isValidEmail(lead.email)) {
    return res.status(200).json({ ok: false, status: "invalid_customer_email", message: "Customer email is missing or invalid." });
  }

  const customer = customerEmail(lead);
  const admin = adminEmail(lead);
  const [customerResult, adminResult] = await Promise.all([
    sendResendEmail(apiKey, { from, to: [lead.email], ...customer }),
    sendResendEmail(apiKey, { from, to: [adminEmailAddress], ...admin })
  ]);

  return res.status(200).json({
    ok: customerResult.ok && adminResult.ok,
    status: customerResult.ok && adminResult.ok ? "sent" : "partial_or_failed",
    customer: { ok: customerResult.ok, status: customerResult.status },
    admin: { ok: adminResult.ok, status: adminResult.status }
  });
}
