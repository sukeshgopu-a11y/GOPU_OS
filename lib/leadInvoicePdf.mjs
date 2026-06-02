function compact(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function numericAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value, currency = "USD") {
  const amount = numericAmount(value);
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapePdfText(value) {
  return compact(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function text(value, x, y, size = 10, bold = false) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET\n`;
}

function line(x1, y1, x2, y2, width = 0.6) {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function wrap(value, max = 62) {
  const words = compact(value).split(" ");
  const rows = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) rows.push(current);
  return rows.length ? rows : [""];
}

function normalizeInvoice(invoice = {}) {
  const nestedItem = Array.isArray(invoice.lineItems) ? invoice.lineItems[0] : null;
  const currency = compact(invoice.currency, "USD").toUpperCase();
  const quantity = numericAmount(nestedItem?.quantity ?? invoice.quantity ?? 1) || 1;
  const grandTotal = numericAmount(invoice.grandTotal ?? invoice.grand_total ?? invoice.total_value ?? invoice.taxable_value ?? 0);
  const unitPrice = numericAmount(nestedItem?.unitPrice ?? invoice.unit_price ?? (quantity ? grandTotal / quantity : grandTotal));
  const product = compact(nestedItem?.description ?? invoice.product ?? invoice.product_description, "Export product");
  return {
    invoiceNumber: compact(invoice.invoiceNumber ?? invoice.invoice_number, "Invoice pending"),
    invoiceType: compact(invoice.invoiceType ?? invoice.invoice_type, "Proforma Invoice"),
    invoiceDate: compact(invoice.invoiceDate ?? invoice.invoice_date, new Date().toISOString().slice(0, 10)),
    leadNumber: compact(invoice.leadNumber ?? invoice.lead_number, ""),
    status: compact(invoice.status, "Draft"),
    exporter: {
      name: compact(invoice.exporter?.name, "GOPU EXPORTS"),
      address: compact(invoice.exporter?.address, "India"),
      email: compact(invoice.exporter?.email, "exports@gopuexports.com"),
      website: compact(invoice.exporter?.website, "www.gopuexports.com")
    },
    buyer: {
      name: compact(invoice.buyer?.name ?? invoice.buyer_name, "Buyer"),
      company: compact(invoice.buyer?.company ?? invoice.buyer_company ?? invoice.buyer_name, "Buyer"),
      email: compact(invoice.buyer?.email ?? invoice.buyer_email, "Buyer email pending"),
      address: compact(invoice.buyer?.address ?? invoice.buyer_address, "Buyer address pending"),
      country: compact(invoice.buyer?.country ?? invoice.buyer_country ?? invoice.destination_country, "Destination pending")
    },
    item: {
      product,
      hsn: compact(nestedItem?.hsn ?? invoice.hsn_code, "HS code pending"),
      packing: compact(nestedItem?.packing ?? invoice.packing_type, "Export packing as agreed"),
      quantity,
      unit: compact(nestedItem?.unit ?? invoice.unit, "MT").toUpperCase(),
      unitPrice,
      amount: grandTotal
    },
    shipment: {
      incoterm: compact(invoice.shipment?.incoterm ?? invoice.incoterm, "FOB"),
      origin: compact(invoice.shipment?.origin ?? invoice.country_of_origin, "India"),
      portOfLoading: compact(invoice.shipment?.portOfLoading ?? invoice.port_of_loading, "India port - final to be confirmed"),
      portOfDischarge: compact(invoice.shipment?.portOfDischarge ?? invoice.port_of_discharge, "Destination port pending"),
      finalDestination: compact(invoice.shipment?.finalDestination ?? invoice.final_destination ?? invoice.destination_country, "Destination pending"),
      container: compact(invoice.shipment?.container ?? invoice.container, "Container load to be confirmed")
    },
    paymentTerms: compact(invoice.paymentTerms ?? invoice.payment_terms, "Advance payment"),
    validity: compact(invoice.validity, "7 days from invoice date"),
    currency,
    subtotal: numericAmount(invoice.subtotal ?? grandTotal),
    taxTotal: numericAmount(invoice.taxTotal ?? invoice.tax_total ?? 0),
    grandTotal,
    amountInWords: compact(invoice.amountInWords ?? invoice.amount_in_words, `${money(grandTotal, currency)} only`),
    notes: compact(invoice.notes, "Proforma invoice for buyer confirmation and advance payment request.")
  };
}

export function buildInvoicePdfBytes(invoice) {
  const model = normalizeInvoice(invoice);
  const rows = [
    ["Invoice No", model.invoiceNumber],
    ["Invoice Date", model.invoiceDate],
    ["Lead No", model.leadNumber || "-"],
    ["Payment Terms", model.paymentTerms],
    ["Incoterm", model.shipment.incoterm],
    ["Validity", model.validity]
  ];

  let c = "";
  c += text(model.invoiceType.toUpperCase(), 42, 744, 22, true);
  c += text(model.invoiceNumber, 430, 748, 11, true);
  c += text(model.status, 42, 724, 10);
  c += line(42, 710, 570, 710, 1.2);

  c += text("Exporter", 42, 686, 10, true);
  c += text(model.exporter.name, 42, 670, 12, true);
  c += text(model.exporter.address, 42, 654, 9);
  c += text(model.exporter.email, 42, 640, 9);
  c += text(model.exporter.website, 42, 626, 9);

  c += text("Buyer / Consignee", 320, 686, 10, true);
  c += text(model.buyer.company || model.buyer.name, 320, 670, 12, true);
  wrap(model.buyer.address, 36).slice(0, 2).forEach((row, index) => { c += text(row, 320, 654 - index * 14, 9); });
  c += text(model.buyer.country, 320, 626, 9);
  c += text(model.buyer.email, 320, 612, 9);
  c += line(42, 596, 570, 596);

  let y = 574;
  rows.forEach(([label, value]) => {
    c += text(label, 52, y, 9, true);
    c += text(value, 188, y, 9);
    y -= 18;
  });
  c += line(42, y + 6, 570, y + 6);

  y -= 18;
  c += text("No", 52, y, 9, true);
  c += text("Description", 86, y, 9, true);
  c += text("HS Code", 302, y, 9, true);
  c += text("Qty", 372, y, 9, true);
  c += text("Rate", 426, y, 9, true);
  c += text("Amount", 500, y, 9, true);
  c += line(42, y - 8, 570, y - 8);

  y -= 28;
  c += text("1", 52, y, 9);
  wrap(model.item.product, 34).slice(0, 2).forEach((row, index) => { c += text(row, 86, y - index * 13, 9, index === 0); });
  c += text(`Packing: ${model.item.packing}`, 86, y - 30, 8);
  c += text(model.item.hsn, 302, y, 9);
  c += text(`${model.item.quantity} ${model.item.unit}`, 372, y, 9);
  c += text(money(model.item.unitPrice, model.currency), 426, y, 9);
  c += text(money(model.item.amount, model.currency), 500, y, 9);
  c += line(42, y - 44, 570, y - 44);

  y -= 74;
  c += text("Shipment Details", 42, y, 10, true);
  [
    `Origin: ${model.shipment.origin}`,
    `Port of loading: ${model.shipment.portOfLoading}`,
    `Port of discharge: ${model.shipment.portOfDischarge}`,
    `Final destination: ${model.shipment.finalDestination}`,
    `Container: ${model.shipment.container}`
  ].forEach((row, index) => { c += text(row, 42, y - 16 - index * 14, 9); });

  c += text("Subtotal", 390, y, 10, true);
  c += text(money(model.subtotal, model.currency), 480, y, 10);
  c += text("Tax", 390, y - 18, 10, true);
  c += text(money(model.taxTotal, model.currency), 480, y - 18, 10);
  c += text("Total", 390, y - 42, 12, true);
  c += text(money(model.grandTotal, model.currency), 480, y - 42, 12, true);
  c += line(390, y - 28, 570, y - 28);
  c += line(390, y - 54, 570, y - 54, 1.1);

  y -= 116;
  c += text(`Amount in words: ${model.amountInWords}`, 42, y, 9, true);
  wrap(`Terms: ${model.notes}`, 88).slice(0, 3).forEach((row, index) => { c += text(row, 42, y - 18 - index * 13, 8); });
  c += text("This document is system generated by GOPU OS and requires final verification before shipment release.", 42, 56, 8);

  const content = c;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function buildInvoicePdfBase64(invoice) {
  const bytes = buildInvoicePdfBytes(invoice);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
