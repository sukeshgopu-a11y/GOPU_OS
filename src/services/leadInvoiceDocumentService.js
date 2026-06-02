import { workflowId } from '../config/workflowIds.js';
import { buildInvoicePdfBytes } from '../../lib/leadInvoicePdf.mjs';

function compact(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function numericAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function financialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inferHsCode(product = '') {
  const value = String(product || '').toLowerCase();
  if (/chilli.*ground|chili.*ground|ground.*chilli/.test(value)) return '09042200';
  if (/chilli|chili|red pepper/.test(value)) return '09042110';
  if (/turmeric.*ground|ground.*turmeric/.test(value)) return '09103020';
  if (/turmeric/.test(value)) return '09103010';
  if (/pepper.*ground|ground.*pepper/.test(value)) return '09041200';
  if (/pepper|black pepper/.test(value)) return '09041100';
  if (/rice/.test(value)) return '100630';
  return 'HS code pending';
}

function leadReference(summary = {}) {
  const lead = summary.lead || {};
  const raw = compact(lead.lead_number || lead.id || summary.id || 'LEAD');
  return raw.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase() || 'LEAD';
}

export function isInvoiceDocument(document = {}) {
  const text = `${document.id || ''} ${document.name || ''} ${document.type || ''}`.toLowerCase();
  return text.includes('invoice');
}

export function invoiceDisplayMoney(value, currency = 'USD') {
  const amount = numericAmount(value);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function buildLeadInvoiceDocument(summary = {}, document = {}) {
  const lead = summary.lead || {};
  const pricing = summary.pricing || {};
  const quote = summary.quote || {};
  const shipment = summary.shipment || {};
  const isCommercial = String(document.id || document.name || '').toLowerCase().includes('commercial');
  const invoiceDate = todayIso();
  const currency = compact(quote.currency || pricing.currency || lead.currency, 'USD').toUpperCase();
  const quantity = numericAmount(lead.quantity || pricing.quantity || 1) || 1;
  const grandTotal = numericAmount(quote.amount || pricing.recommendedTotalPrice || pricing.totalPrice || 0);
  const unitPrice = numericAmount(pricing.recommendedPricePerUnit || pricing.unit_price || (quantity ? grandTotal / quantity : grandTotal));
  const invoiceType = isCommercial ? 'Commercial Invoice' : 'Proforma Invoice';
  const product = compact(lead.product || pricing.product, 'Export product');
  const unit = compact(lead.unit || lead.unit_of_measure || pricing.unit, 'MT').toUpperCase();
  const container = compact(lead.container_load || shipment.container, 'Container load to be confirmed');

  const invoiceNumber = isCommercial
    ? (summary.workflowIds?.commercialInvoice || workflowId('commercialInvoice', leadReference(summary), new Date(invoiceDate)))
    : (summary.workflowIds?.proformaInvoice || workflowId('proformaInvoice', leadReference(summary), new Date(invoiceDate)));
  const rawBuyerName = compact(lead.buyer_name || lead.company_name, '');
  const buyerName = rawBuyerName || 'Valued Buyer';
  const buyerEmail = compact(lead.email || lead.buyer_email, 'Buyer email pending');
  const paymentTerms = compact(lead.payment_terms || lead.payment_type || summary.payment?.terms, 'Advance payment');
  const incoterm = compact(lead.incoterm || shipment.incoterm || pricing.incoterm, 'FOB');
  const deliveryTarget = compact(lead.delivery_date || shipment.deliveryDate, 'Delivery date pending');
  const orderQuantity = `${quantity} ${unit}`.trim();
  const totalAmount = `${currency} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return {
    invoiceType,
    invoiceNumber,
    invoiceDate,
    financialYear: financialYear(),
    status: isCommercial
      ? 'Draft - blocked until buyer payment confirmation'
      : 'Draft - Director approval required before buyer email',
    stage: isCommercial
      ? 'Final buyer/customs invoice draft'
      : 'Stage 1 buyer confirmation invoice',
    leadNumber: compact(lead.lead_number || lead.id || summary.id, 'Lead pending'),
    exporter: {
      name: 'GOPU EXPORTS',
      address: 'India',
      email: 'exports@gopuexports.com',
      website: 'www.gopuexports.com',
      country: 'India'
    },
    buyer: {
      name: buyerName,
      company: compact(lead.company_name || lead.buyer_name, 'Buyer'),
      email: buyerEmail,
      phone: compact(lead.phone, 'Phone pending'),
      address: compact(lead.buyer_address || lead.delivery_address, 'Buyer address pending'),
      country: compact(lead.destination_country || lead.country, 'Destination pending')
    },
    lineItems: [
      {
        no: 1,
        description: product,
        hsn: compact(lead.hs_code || inferHsCode(product), 'HS code pending'),
        packing: compact(lead.packing_type || lead.product_grade, 'Export packing as agreed'),
        quantity,
        unit,
        unitPrice,
        amount: grandTotal
      }
    ],
    shipment: {
      incoterm,
      shipmentType: compact(lead.shipment_type || shipment.type, 'Sea freight'),
      container,
      portOfLoading: compact(lead.port_of_loading || pricing.port_of_loading, 'India port - final to be confirmed'),
      portOfDischarge: compact(lead.destination_port || shipment.destinationPort, 'Destination port pending'),
      finalDestination: compact(lead.destination_country || lead.country || shipment.destination, 'Destination pending'),
      origin: 'India',
      deliveryTarget
    },
    paymentTerms,
    validity: compact(lead.quote_valid_until || quote.validUntil, '7 days from invoice date'),
    currency,
    subtotal: grandTotal,
    taxTotal: 0,
    grandTotal,
    amountInWords: `${invoiceDisplayMoney(grandTotal, currency)} only`,
    notes: isCommercial
      ? 'Commercial invoice draft. Final release remains blocked until buyer payment, document verification, and approval are complete.'
      : 'Proforma invoice for buyer confirmation and advance payment request. Not a tax invoice or customs document.',
    email: {
      to: buyerEmail,
      subject: `Proforma Invoice ${invoiceNumber} – ${product} (${orderQuantity})`,
      greeting: rawBuyerName ? `Dear ${rawBuyerName},` : 'Dear Valued Buyer,',
      body: [
        'Greetings from GOPU Exports.',
        `Thank you for your interest in our premium Indian ${product}.`,
        `Please find attached Proforma Invoice No. ${invoiceNumber} for your review and approval. The quotation has been prepared based on the specifications and commercial terms discussed.`,
        'Order Details:',
        `• Product: ${product}`,
        `• Quantity: ${orderQuantity}`,
        `• Trade Term: ${incoterm}`,
        `• Total Invoice Value: ${totalAmount}`,
        `• Payment Terms: ${paymentTerms}`,
        'Kindly review the attached proforma invoice and confirm your acceptance of the terms and specifications.',
        'Upon receipt of your confirmation and payment advice, our team will immediately initiate:',
        '• Production and quality preparation',
        '• Export documentation',
        '• Packaging and labeling arrangements',
        '• Vessel booking and shipment planning',
        '• Pre-shipment compliance procedures',
        'If any amendment is required regarding product specifications, packaging, shipment terms, consignee details, or payment conditions, please inform us before payment processing so that we can issue a revised proforma invoice accordingly.',
        'We appreciate the opportunity to serve your organization and look forward to establishing a long-term business relationship.',
        'Should you require product samples, certifications, laboratory reports, packaging details, or any additional information, please feel free to contact us.'
      ],
      signature: [
        'Best Regards,',
        'Export Sales Team',
        'GOPU Exports',
        'Email: exports@gopuexports.com',
        'Website: www.gopuexports.com',
        'Certified Exporter | APEDA | FSSAI | ISO 22000 | Global Export Solutions'
      ]
    },
    documentStatus: compact(document.status, 'Draft'),
    documentReason: compact(document.why, 'Invoice document required for buyer and shipment workflow.')
  };
}

function invoiceRows(invoice) {
  return [
    ['Invoice No', invoice.invoiceNumber],
    ['Invoice Date', invoice.invoiceDate],
    ['Financial Year', invoice.financialYear],
    ['Lead No', invoice.leadNumber],
    ['Status', invoice.status],
    ['Incoterm', invoice.shipment.incoterm],
    ['Payment Terms', invoice.paymentTerms],
    ['Validity', invoice.validity]
  ];
}

export function buildLeadInvoiceHtml(invoice) {
  const itemRows = invoice.lineItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.no)}</td>
      <td><strong>${escapeHtml(item.description)}</strong><br><span>Packing: ${escapeHtml(item.packing)}</span></td>
      <td>${escapeHtml(item.hsn)}</td>
      <td class="num">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
      <td class="num">${escapeHtml(invoiceDisplayMoney(item.unitPrice, invoice.currency))}</td>
      <td class="num">${escapeHtml(invoiceDisplayMoney(item.amount, invoice.currency))}</td>
    </tr>
  `).join('');
  const metaRows = invoiceRows(invoice).map(([label, value]) => `
    <tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(invoice.invoiceNumber)} ${escapeHtml(invoice.invoiceType)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .invoice { max-width: 920px; margin: 0 auto; background: #fff; border: 1px solid #d1d5db; }
    header { padding: 28px; border-bottom: 4px solid #0b1f3a; display: flex; justify-content: space-between; gap: 24px; }
    h1 { margin: 0; font-size: 28px; color: #0b1f3a; letter-spacing: 0; }
    h2 { margin: 0 0 8px; font-size: 13px; color: #0b1f3a; text-transform: uppercase; }
    p { margin: 4px 0; line-height: 1.45; }
    .brand { text-align: right; color: #4b5563; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 22px 28px; background: #f9fafb; }
    .box { border: 1px solid #e5e7eb; padding: 14px; min-height: 132px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border: 1px solid #e5e7eb; vertical-align: top; font-size: 13px; }
    th { background: #f3f4f6; text-align: left; color: #111827; }
    .line thead th { background: #0b1f3a; color: #fff; }
    .line span { color: #6b7280; }
    .num { text-align: right; white-space: nowrap; }
    .content { padding: 20px 28px; }
    .summary { display: grid; grid-template-columns: 1fr 280px; gap: 18px; padding: 0 28px 22px; }
    .total th, .total td { font-size: 14px; }
    .grand th, .grand td { background: #0b1f3a; color: #fff; font-weight: 700; }
    footer { padding: 18px 28px; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #374151; }
    @media print { body { background: #fff; padding: 0; } .invoice { border: 0; } }
  </style>
</head>
<body>
  <main class="invoice">
    <header>
      <div>
        <h1>${escapeHtml(invoice.invoiceType.toUpperCase())}</h1>
        <p>${escapeHtml(invoice.stage)}</p>
      </div>
      <div class="brand">
        <strong>${escapeHtml(invoice.exporter.name)}</strong>
        <p>${escapeHtml(invoice.exporter.address)}</p>
        <p>${escapeHtml(invoice.exporter.email)}</p>
        <p>${escapeHtml(invoice.exporter.website)}</p>
      </div>
    </header>
    <section class="parties">
      <div class="box">
        <h2>Exporter</h2>
        <p><strong>${escapeHtml(invoice.exporter.name)}</strong></p>
        <p>${escapeHtml(invoice.exporter.address)}</p>
        <p>${escapeHtml(invoice.exporter.country)}</p>
        <p>${escapeHtml(invoice.exporter.email)}</p>
      </div>
      <div class="box">
        <h2>Buyer / Consignee</h2>
        <p><strong>${escapeHtml(invoice.buyer.company || invoice.buyer.name)}</strong></p>
        <p>${escapeHtml(invoice.buyer.address)}</p>
        <p>${escapeHtml(invoice.buyer.country)}</p>
        <p>${escapeHtml(invoice.buyer.email)}</p>
      </div>
    </section>
    <table><tbody>${metaRows}</tbody></table>
    <section class="content">
      <table class="line">
        <thead><tr><th>No</th><th>Description</th><th>HS Code</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </section>
    <section class="summary">
      <div>
        <h2>Shipment Details</h2>
        <p>Origin: ${escapeHtml(invoice.shipment.origin)}</p>
        <p>Port of loading: ${escapeHtml(invoice.shipment.portOfLoading)}</p>
        <p>Port of discharge: ${escapeHtml(invoice.shipment.portOfDischarge)}</p>
        <p>Final destination: ${escapeHtml(invoice.shipment.finalDestination)}</p>
        <p>Container: ${escapeHtml(invoice.shipment.container)}</p>
      </div>
      <table class="total">
        <tbody>
          <tr><th>Subtotal</th><td class="num">${escapeHtml(invoiceDisplayMoney(invoice.subtotal, invoice.currency))}</td></tr>
          <tr><th>Tax</th><td class="num">${escapeHtml(invoiceDisplayMoney(invoice.taxTotal, invoice.currency))}</td></tr>
          <tr class="grand"><th>Total</th><td class="num">${escapeHtml(invoiceDisplayMoney(invoice.grandTotal, invoice.currency))}</td></tr>
        </tbody>
      </table>
    </section>
    <footer>
      <p><strong>Amount in words:</strong> ${escapeHtml(invoice.amountInWords)}</p>
      <p><strong>Terms:</strong> ${escapeHtml(invoice.notes)}</p>
    </footer>
  </main>
</body>
</html>`;
}

export function downloadLeadInvoice(invoice) {
  if (typeof window === 'undefined') return false;
  const blob = new Blob([buildInvoicePdfBytes(invoice)], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export function printLeadInvoice(invoice) {
  if (typeof window === 'undefined') return false;
  const popup = window.open('', '_blank');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildLeadInvoiceHtml(invoice));
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}
