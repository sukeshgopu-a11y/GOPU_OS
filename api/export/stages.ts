// @ts-nocheck
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const STAGES = {
  1: { name: "Enquiry & Proforma Invoice",    docs: ["proforma_invoice", "product_spec_sheet"] },
  2: { name: "Order Confirmation & Payment",   docs: ["sales_contract", "lc_or_tt_advice"] },
  3: { name: "Production & Lab Testing",       docs: ["certificate_of_analysis", "inspection_report"] },
  4: { name: "Pre-Shipment Documents",         docs: ["commercial_invoice", "packing_list", "certificate_of_origin", "phytosanitary_certificate", "spice_board_certificate", "insurance_certificate", "consular_invoice"] },
  5: { name: "Customs — Shipping Bill & LEO", docs: ["shipping_bill", "let_export_order"] },
  6: { name: "Shipping — Bill of Lading",     docs: ["bill_of_lading"] },
  7: { name: "Payment Realisation & eBRC",    docs: ["bank_realisation_certificate"] },
};

export const DOC_META: Record<string, { label: string; issued_by: string; goes_to: string; stage: number }> = {
  proforma_invoice:           { label: "Proforma Invoice",             issued_by: "Exporter (CFO Priced)", goes_to: "Buyer",                   stage: 1 },
  product_spec_sheet:         { label: "Product Spec Sheet",           issued_by: "Exporter (COO)",        goes_to: "Buyer",                   stage: 1 },
  sales_contract:             { label: "Sales Contract / PO",          issued_by: "Both Parties",          goes_to: "Both",                    stage: 2 },
  lc_or_tt_advice:            { label: "LC / TT Advice",               issued_by: "Buyer's Bank",          goes_to: "Exporter's Bank",         stage: 2 },
  certificate_of_analysis:    { label: "Certificate of Analysis (COA)", issued_by: "NABL Accredited Lab",  goes_to: "Buyer, Bank, Plant Quarantine", stage: 3 },
  inspection_report:          { label: "Pre-Shipment Inspection Report", issued_by: "SGS / Bureau Veritas", goes_to: "Buyer, Bank",            stage: 3 },
  commercial_invoice:         { label: "Commercial Invoice (GST/LUT)", issued_by: "Exporter (CFO)",        goes_to: "Customs, Bank, Buyer",    stage: 4 },
  packing_list:               { label: "Packing List",                 issued_by: "Exporter (COO)",        goes_to: "Customs, Bank, Buyer",    stage: 4 },
  certificate_of_origin:      { label: "Certificate of Origin",        issued_by: "FIEO / Chamber",        goes_to: "Buyer, Bank, Destination Customs", stage: 4 },
  phytosanitary_certificate:  { label: "Phytosanitary Certificate",    issued_by: "Plant Quarantine (DPPQS)", goes_to: "Buyer's Customs, Bank", stage: 4 },
  spice_board_certificate:    { label: "Spice Board Export Certificate", issued_by: "Spices Board of India", goes_to: "Buyer, Bank",           stage: 4 },
  insurance_certificate:      { label: "Insurance Certificate",         issued_by: "Marine Insurer",        goes_to: "Bank, Buyer",            stage: 4 },
  consular_invoice:           { label: "Consular Invoice",              issued_by: "Destination Consulate", goes_to: "Destination Customs",    stage: 4 },
  shipping_bill:              { label: "Shipping Bill",                 issued_by: "CHA / Indian Customs",  goes_to: "Indian Customs",         stage: 5 },
  let_export_order:           { label: "Let Export Order (LEO)",        issued_by: "Indian Customs",        goes_to: "Shipping Line / CHA",    stage: 5 },
  bill_of_lading:             { label: "Bill of Lading",                issued_by: "Shipping Line",         goes_to: "Bank, Buyer",            stage: 6 },
  bank_realisation_certificate: { label: "Bank Realisation Certificate (eBRC)", issued_by: "Exporter's Bank", goes_to: "DGFT, GST Dept",     stage: 7 },
};

async function sendAgentComm(client: any, orderId: string, from: string, to: string, type: string, stage: number, payload: Record<string, any> = {}) {
  if (!client || !orderId) return;
  await client.from("export_agent_comms").insert({
    tenant_id: demoTenantId, export_order_id: orderId,
    from_agent: from, to_agent: to, message_type: type, stage, payload, status: "pending",
  });
}

async function logStageTransition(client: any, orderId: string, fromStage: number, toStage: number, triggeredBy: string, notes = "") {
  if (!client || !orderId) return;
  await client.from("export_stage_logs").insert({
    tenant_id: demoTenantId, export_order_id: orderId,
    from_stage: fromStage, to_stage: toStage,
    stage_name: STAGES[toStage]?.name || "",
    triggered_by: triggeredBy, notes,
  });
}

async function tolerantUpdate(client: any, table: string, payload: Record<string, any>, column: string, value: string) {
  const { data, error } = await client.from(table).update(payload).eq(column, value).select("id").maybeSingle();
  const missingColumn = String(error?.message || "").match(/'([^']+)'\s+column/)?.[1];
  if (error && missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
    const fallback = { ...payload };
    delete fallback[missingColumn];
    return tolerantUpdate(client, table, fallback, column, value);
  }
  return { data, error };
}

async function createDocumentChecklist(client: any, orderId: string, stage: number) {
  if (!client || !orderId) return;
  const docs = STAGES[stage]?.docs || [];
  for (const docType of docs) {
    const meta = DOC_META[docType];
    if (!meta) continue;
    await client.from("export_documents").upsert({
      tenant_id: demoTenantId, export_order_id: orderId,
      document_type: docType, document_name: meta.label, stage,
      status: "Pending", issued_by: meta.issued_by, goes_to: meta.goes_to,
    }, { onConflict: "export_order_id,document_type", ignoreDuplicates: true });
  }
}

export async function createExportOrder(client: any, lead: Record<string, any>, pricing: Record<string, any>) {
  if (!client) return null;
  const orderId = crypto.randomUUID();
  const { data, error } = await client.from("export_orders").insert({
    id: orderId,
    tenant_id: demoTenantId,
    lead_id: lead.id,
    buyer_name: lead.buyer_name,
    company_name: lead.company_name,
    product: lead.product,
    quantity: lead.quantity,
    unit: lead.unit,
    destination_country: lead.destination_country || lead.country,
    destination_port: lead.destination_port,
    hs_code: inferHsCode(lead.product),
    incoterm: lead.incoterm,
    payment_term: "TT_ADVANCE",
    currency: pricing.currency || "USD",
    proforma_amount: pricing.recommendedTotalPrice,
    current_stage: 1,
    current_stage_name: STAGES[1].name,
    status: "Active",
    metadata: { pricing_snapshot: pricing, lead_number: lead.lead_number || "" },
  }).select("id").maybeSingle();

  if (error || !data) return null;

  // Create Stage 1 document checklist
  await createDocumentChecklist(client, orderId, 1);

  // COO → CFO: price this proforma
  await sendAgentComm(client, orderId, "COO", "CFO", "proforma_pricing_requested", 1, {
    product: lead.product, quantity: lead.quantity, unit: lead.unit,
    destination: lead.destination_country, incoterm: lead.incoterm,
    pricing_estimate: pricing.recommendedTotalPrice, currency: pricing.currency,
  });

  // CFO → COO: proforma priced (auto-completed since pricing engine already ran)
  await sendAgentComm(client, orderId, "CFO", "COO", "proforma_priced", 1, {
    amount: pricing.recommendedTotalPrice, per_unit: pricing.recommendedPricePerUnit,
    margin: pricing.achievedMarginPercent, currency: pricing.currency,
  });

  // COO → Director: proforma ready for approval to send to buyer
  await sendAgentComm(client, orderId, "COO", "Director", "proforma_approval_requested", 1, {
    buyer: lead.company_name, product: lead.product, quantity: lead.quantity,
    amount: pricing.recommendedTotalPrice, currency: pricing.currency,
    incoterm: lead.incoterm, destination: lead.destination_country,
    action_required: "Approve Proforma Invoice to send to buyer",
  });

  await logStageTransition(client, orderId, 0, 1, "Slack", "Lead received via Slack — Stage 1 initiated");
  return orderId;
}

export async function advanceStage(client: any, orderId: string, toStage: number, triggeredBy: string, details: Record<string, any> = {}) {
  if (!client || !orderId) return { ok: false, message: "Missing client or orderId" };

  const { data: order } = await client.from("export_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, message: "Export order not found" };

  const fromStage = order.current_stage;
  if (toStage <= fromStage) return { ok: false, message: `Already at stage ${fromStage}` };

  const stageUpdate: Record<string, any> = {
    current_stage: toStage,
    current_stage_name: STAGES[toStage]?.name || "",
    updated_at: new Date().toISOString(),
    ...details,
  };
  if (toStage === 2) {
    stageUpdate.stage_2_handoff_metadata = {
      approved_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      previous_stage: fromStage,
      next_stage: STAGES[toStage]?.name || "",
      ...details,
    };
  }
  await tolerantUpdate(client, "export_orders", stageUpdate, "id", orderId);

  await createDocumentChecklist(client, orderId, toStage);
  await logStageTransition(client, orderId, fromStage, toStage, triggeredBy);

  // Fire inter-agent communications per stage
  if (toStage === 2) {
    await sendAgentComm(client, orderId, "Director", "COO", "proforma_approved", 2, { action: "Send Proforma to buyer. Record payment terms when confirmed." });
    await sendAgentComm(client, orderId, "COO", "CFO", "order_confirmed_record_payment_terms", 2, { payment_term: details.payment_term || "TT_ADVANCE" });
  }
  if (toStage === 3) {
    await sendAgentComm(client, orderId, "COO", "COO", "initiate_lab_testing", 3, { action: "Send sample to NABL lab. Apply for Phytosanitary Certificate on PQMS portal." });
  }
  if (toStage === 4) {
    await sendAgentComm(client, orderId, "COO", "CFO", "generate_commercial_invoice", 4, { action: "Generate GST/LUT Commercial Invoice. Include LUT ARN. Use CBIC exchange rate." });
    await sendAgentComm(client, orderId, "CFO", "Director", "pre_shipment_docs_approval_requested", 4, { action: "Approve Commercial Invoice + full document package before customs filing." });
  }
  if (toStage === 5) {
    await sendAgentComm(client, orderId, "Director", "COO", "pre_shipment_docs_approved", 5, { action: "File Shipping Bill on ICEGATE via CHA. Confirm LEO before loading." });
  }
  if (toStage === 6) {
    await sendAgentComm(client, orderId, "COO", "CFO", "bl_issued_present_to_bank", 6, { action: "Present full document set to bank within 21 days of BL date (UCP 600). Verify BL date is before LC last shipment date." });
    await sendAgentComm(client, orderId, "COO", "Director", "goods_shipped", 6, { bl_number: details.bl_number, vessel: details.vessel_name, eta: details.eta_destination });
  }
  if (toStage === 7) {
    await sendAgentComm(client, orderId, "CFO", "COO", "payment_received", 7, { action: "Mark order complete. Ensure eBRC is generated within 15 months of shipment (FEMA)." });
    await sendAgentComm(client, orderId, "CFO", "Director", "order_complete_pnl_ready", 7, { action: "Export order completed. P&L summary available." });
  }

  return { ok: true, fromStage, toStage, stageName: STAGES[toStage]?.name };
}

function inferHsCode(product = "") {
  const p = product.toLowerCase();
  if (/chilli|chili|red pepper/.test(p)) return "09042110";
  if (/chilli.*ground|chili.*ground|ground.*chilli/.test(p)) return "09042200";
  if (/turmeric.*ground|ground.*turmeric/.test(p)) return "09103020";
  if (/turmeric/.test(p)) return "09103010";
  if (/pepper.*ground|ground.*pepper/.test(p)) return "09041200";
  if (/pepper|black pepper/.test(p)) return "09041100";
  return "";
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const client = getSupabase();

  if (req.method === "GET") {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ ok: false, message: "order_id required" });

    const [orderRes, docsRes, logsRes, commsRes] = await Promise.all([
      client?.from("export_orders").select("*").eq("id", order_id).maybeSingle(),
      client?.from("export_documents").select("*").eq("export_order_id", order_id).order("stage").order("created_at"),
      client?.from("export_stage_logs").select("*").eq("export_order_id", order_id).order("created_at"),
      client?.from("export_agent_comms").select("*").eq("export_order_id", order_id).order("created_at"),
    ]);

    return res.status(200).json({
      ok: true, order: orderRes?.data, documents: docsRes?.data || [],
      stage_logs: logsRes?.data || [], agent_comms: commsRes?.data || [],
      stages: STAGES,
    });
  }

  if (req.method === "POST") {
    const { action, order_id, to_stage, triggered_by, details } = req.body || {};

    if (action === "advance_stage") {
      if (!order_id || !to_stage) return res.status(400).json({ ok: false, message: "order_id and to_stage required" });
      const result = await advanceStage(client, order_id, Number(to_stage), triggered_by || "Manual", details || {});
      return res.status(200).json(result);
    }

    if (action === "update_document") {
      const { doc_id, status, reference_number, issued_date, notes } = req.body;
      if (!doc_id) return res.status(400).json({ ok: false, message: "doc_id required" });
      const { data, error } = await client?.from("export_documents").update({
        status, reference_number, issued_date, notes, updated_at: new Date().toISOString(),
      }).eq("id", doc_id).select("id,status").maybeSingle();
      return res.status(200).json({ ok: !error, data, error: error?.message });
    }

    if (action === "action_comm") {
      const { comm_id } = req.body;
      if (!comm_id) return res.status(400).json({ ok: false, message: "comm_id required" });
      await client?.from("export_agent_comms").update({ status: "actioned", actioned_at: new Date().toISOString() }).eq("id", comm_id);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: "Unknown action" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
