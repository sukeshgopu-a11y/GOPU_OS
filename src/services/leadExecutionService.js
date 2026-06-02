import { requireSupabase, backendStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { createApprovalRequest } from './approvalService.js';
import { runPricingEngine } from './pricingEngineService.js';
import { getDemoLeadProfile, demoLeadId, demoLeadNumber } from '../config/demoLeadProfile.js';
import { getApprovalGatesForLead, getRequiredDocumentsForLead } from './exportDocumentRules.js';
import { buildWorkflowIds } from '../config/workflowIds.js';

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Quote pending';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

function formatZeroMoney(currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(0);
  } catch {
    return `${currency} 0`;
  }
}

function normalizeLead(lead = {}) {
  const fallback = getDemoLeadProfile();
  const merged = { ...fallback, ...lead };
  const email = merged.email || merged.buyer_email || fallback.email;
  return {
    ...merged,
    id: merged.id || merged.lead_number || fallback.id,
    lead_number: merged.lead_number || merged.lead_no || merged.id || fallback.lead_number,
    buyer_name: merged.buyer_name || merged.company_name || fallback.buyer_name,
    company_name: merged.company_name || merged.buyer_name || fallback.company_name,
    email,
    buyer_email: email,
    destination_country: merged.destination_country || merged.country || fallback.destination_country,
    country: merged.country || merged.destination_country || fallback.country,
    quantity: merged.quantity || fallback.quantity,
    unit: merged.unit || merged.unit_of_measure || fallback.unit,
    unit_of_measure: merged.unit_of_measure || merged.unit || fallback.unit_of_measure,
    payment_terms: merged.payment_terms || merged.payment_type || fallback.payment_terms,
    incoterm: String(merged.incoterm || fallback.incoterm || 'FOB').toUpperCase(),
    currency: String(merged.currency || fallback.currency || 'USD').toUpperCase()
  };
}

function conciseDocument(doc) {
  return {
    id: doc.id,
    name: doc.name,
    requirement: doc.requirement,
    status: doc.status,
    owner: doc.owner,
    due: doc.due,
    why: doc.why
  };
}

function buildInvoiceStructure(lead, pricing) {
  return [
    { step: 1, title: 'Proforma invoice sent', owner: 'CFO + COO', status: 'Blocked until Slack approval' },
    { step: 2, title: 'Buyer and consignee details', owner: 'COO', status: 'Ready', detail: `${lead.buyer_name}, ${lead.email}, ${lead.destination_country}` },
    { step: 3, title: 'Product and HS details', owner: 'COO', status: 'Ready', detail: `${lead.product}, HS ${lead.hs_code || 'to verify'}` },
    { step: 4, title: 'Commercial value and payment term', owner: 'CFO', status: 'Ready', detail: `${formatMoney(pricing.recommendedTotalPrice, pricing.currency || lead.currency)} - ${lead.payment_terms}` },
    { step: 5, title: 'Shipment, port, and container details', owner: 'COO', status: 'Ready', detail: `${lead.container_load || 'Container load'} - ${lead.incoterm} - ${lead.destination_port || lead.destination_country}` },
    { step: 6, title: 'Final document package', owner: 'COO', status: 'Requires payment and document approval' }
  ];
}

function isDemoCompletionLead(lead = {}) {
  return lead.id === demoLeadId || lead.lead_number === demoLeadNumber;
}

function completeDemoLeadExecution(summary) {
  const paidDisplay = summary.quote.amountDisplay;
  const completedGates = Object.fromEntries(summary.gates.map((gate) => [gate.key, `demo-approved-${gate.key}`]));
  const documentStatusById = {
    'proforma-invoice': 'Ready - sent to buyer',
    'commercial-invoice': 'Ready - payment confirmed',
    'packing-list': 'Ready - packing data confirmed',
    'shipping-bill': 'Ready for CHA filing',
    'bill-of-lading': 'Ready after vessel loading',
    'certificate-of-origin': 'Approved - origin confirmed',
    'spice-board-registration-check': 'Approved - registration verified',
    'certificate-of-analysis': 'Ready - lab certificate received',
    'phytosanitary-certificate': 'Approved - requirement confirmed',
    'fumigation-certificate': 'Approved - packaging treatment verified',
    'australia-biosecurity-check': 'Approved - Australia biosecurity reviewed',
    'insurance-certificate': 'Ready - CIF insurance prepared',
    'curcumin-and-microbial-test': 'Ready - test report received'
  };

  return {
    ...summary,
    demoFlowStatus: 'completed',
    completedGateRequests: completedGates,
    quote: {
      ...summary.quote,
      approvalStatus: 'Approved - demo complete'
    },
    invoice: {
      ...summary.invoice,
      status: 'Proforma invoice sent - demo complete',
      structure: summary.invoice.structure.map((step) => ({
        ...step,
        status: step.step === 6 ? 'Ready - final document package prepared' : 'Ready - demo complete'
      }))
    },
    payment: {
      ...summary.payment,
      status: 'Advance payment confirmed - demo complete',
      amountPaid: paidDisplay,
      amountDue: formatZeroMoney(summary.quote.currency),
      dueDate: 'Completed',
      followUpDate: 'Completed',
      requiredBefore: 'Payment confirmed - document generation and container booking released'
    },
    shipment: {
      ...summary.shipment,
      bookingStatus: 'Ready - container booking approved',
      dispatchStatus: 'Ready - dispatch approval recorded'
    },
    documents: summary.documents.map((document) => ({
      ...document,
      status: documentStatusById[document.id] || 'Ready - demo complete'
    })),
    gates: summary.gates.map((gate) => ({
      ...gate,
      status: 'Approved - demo complete',
      ifApproved: `${gate.ifApproved} Demo approval already recorded.`
    })),
    timeline: [
      { step: 1, title: 'Lead generated in COO', status: 'Ready - complete', owner: 'COO', date: 'Completed' },
      { step: 2, title: 'CFO final rate approval in Slack', status: 'Approved - complete', owner: 'CFO + Director', date: 'Completed' },
      { step: 3, title: 'Proforma invoice email approval', status: 'Approved - complete', owner: 'Director', date: 'Completed' },
      { step: 4, title: 'Buyer advance payment confirmation', status: 'Ready - complete', owner: 'CFO', date: 'Completed' },
      { step: 5, title: 'Document and certificate generation', status: 'Ready - complete', owner: 'COO', date: 'Completed' },
      { step: 6, title: 'Container booking and shipment execution', status: 'Ready - complete', owner: 'COO', date: 'Ready to book' }
    ]
  };
}

export function buildLeadExecutionSummary(rawLead = getDemoLeadProfile()) {
  const lead = normalizeLead(rawLead);
  const pricing = runPricingEngine(lead);
  const documents = getRequiredDocumentsForLead(lead, pricing);
  const gates = getApprovalGatesForLead(lead, pricing, documents);
  const quoteCurrency = pricing.currency || lead.currency || 'USD';
  const quoteAmount = pricing.recommendedTotalPrice || 0;
  const paymentDueDate = addDays(3);
  const bookingDueDate = addDays(7);
  const deliveryDate = lead.delivery_date || addDays(32);
  const workflowIds = {
    ...buildWorkflowIds({ leadNumber: lead.lead_number || lead.id, buyer: lead.buyer_name, product: lead.product }),
    ...(lead.workflow_ids || {})
  };

  const summary = {
    id: lead.id,
    lead,
    workflowIds,
    pricing,
    quote: {
      amount: quoteAmount,
      currency: quoteCurrency,
      amountDisplay: formatMoney(quoteAmount, quoteCurrency),
      costDisplay: formatMoney(pricing.totalCost, quoteCurrency),
      margin: pricing.achievedMarginPercent,
      validUntil: lead.quote_valid_until || addDays(7),
      priceSource: pricing.price_source_name || pricing.source_summary?.price_source_type || 'CFO pricing engine'
    },
    invoice: {
      number: workflowIds.proformaInvoice,
      type: 'Proforma Invoice',
      status: 'Draft ready - Slack approval required before buyer email',
      structure: buildInvoiceStructure(lead, pricing)
    },
    payment: {
      terms: lead.payment_terms || 'Advance payment',
      requiredBefore: 'Commercial invoice, document generation, and container booking',
      status: 'Waiting buyer advance payment approval',
      amountPaid: '$0',
      amountDue: formatMoney(quoteAmount, quoteCurrency),
      dueDate: paymentDueDate,
      followUpDate: addDays(2)
    },
    shipment: {
      container: lead.container_load || '1 x 20 ft FCL',
      reference: lead.shipment_reference || workflowIds.shipment,
      type: lead.shipment_type || 'FCL sea freight',
      incoterm: lead.incoterm,
      destination: lead.destination_country,
      destinationPort: lead.destination_port || lead.destination_country,
      bookingDueDate,
      deliveryDate,
      leadTime: pricing.seaLeadTime || 'To be confirmed'
    },
    documents,
    gates,
    timeline: [
      { step: 1, title: 'Lead generated in COO', status: 'Ready', owner: 'COO', date: 'Now' },
      { step: 2, title: 'CFO final rate approval in Slack', status: 'Required', owner: 'CFO + Director', date: 'Today' },
      { step: 3, title: 'Proforma invoice email approval', status: 'Required', owner: 'Director', date: 'Before buyer email' },
      { step: 4, title: 'Buyer advance payment confirmation', status: 'Required', owner: 'CFO', date: paymentDueDate },
      { step: 5, title: 'Document and certificate generation', status: 'Blocked until payment', owner: 'COO', date: addDays(4) },
      { step: 6, title: 'Container booking and shipment execution', status: 'Blocked until docs ready', owner: 'COO', date: bookingDueDate }
    ]
  };

  return isDemoCompletionLead(lead) ? completeDemoLeadExecution(summary) : summary;
}

export async function getLeadExecutionSummary(tenantId = demoTenantId, leadId = demoLeadId) {
  const decodedLeadId = decodeURIComponent(String(leadId || demoLeadId));
  if (!decodedLeadId || decodedLeadId === demoLeadId || decodedLeadId === demoLeadNumber) {
    return { ok: true, data: buildLeadExecutionSummary(getDemoLeadProfile()), error: null, backend: backendStatus };
  }

  const { client, error } = requireSupabase();
  if (error) {
    return { ok: true, data: buildLeadExecutionSummary({ ...getDemoLeadProfile(), id: decodedLeadId }), error: null, backend: backendStatus };
  }

  try {
    let data = null;
    if (isUuid(decodedLeadId)) {
      const result = await client.from('lead_intake').select('*').eq('tenant_id', tenantId).eq('id', decodedLeadId).maybeSingle();
      if (!result.error) data = result.data;
    }
    if (!data) {
      const result = await client.from('lead_intake').select('*').eq('tenant_id', tenantId).eq('lead_number', decodedLeadId).maybeSingle();
      if (!result.error) data = result.data;
    }
    return { ok: true, data: buildLeadExecutionSummary(data || { ...getDemoLeadProfile(), id: decodedLeadId }), error: null, backend: backendStatus };
  } catch (queryError) {
    return { ok: true, data: buildLeadExecutionSummary({ ...getDemoLeadProfile(), id: decodedLeadId }), error: queryError, backend: backendStatus };
  }
}

export async function requestLeadExecutionGate(tenantId = demoTenantId, summary, gateKey) {
  const gate = summary?.gates?.find((item) => item.key === gateKey);
  if (!summary || !gate) {
    return { ok: false, data: null, error: new Error('Approval gate not found.'), backend: backendStatus };
  }

  const lead = summary.lead;
  const relatedRecord = lead.lead_number || lead.id;
  const documents = summary.documents.map(conciseDocument);
  const metadata = {
    lead_id: lead.id,
    lead_number: lead.lead_number,
    lead,
    buyer_email: lead.email || lead.buyer_email,
    email: lead.email || lead.buyer_email,
    product: lead.product,
    quantity: lead.quantity,
    unit: lead.unit || lead.unit_of_measure,
    destination: lead.destination_country || lead.country,
    incoterm: lead.incoterm,
    payment_terms: lead.payment_terms,
    final_quote_amount: summary.quote.amountDisplay,
    pricing: summary.pricing,
    documents,
    invoice: summary.invoice,
    payment: summary.payment,
    shipment: summary.shipment,
    gate,
    gate_key: gate.key,
    release_action: gate.releaseAction,
    approval_gate_only: gate.releaseAction !== 'buyer_quote_proforma_release',
    workflow_stage: 'coo_lead_execution'
  };

  const summaryText = [
    gate.summary,
    `Lead: ${relatedRecord}`,
    `Buyer: ${lead.buyer_name} <${lead.email || lead.buyer_email}>`,
    `Product: ${lead.product} - ${lead.quantity} ${lead.unit || lead.unit_of_measure} (${lead.container_load || 'container load'})`,
    `Quote: ${summary.quote.amountDisplay}`,
    `Blocked until approval: ${gate.blockedItems.join(', ')}`,
    `If approved: ${gate.ifApproved}`
  ].join('\n');

  return createApprovalRequest({
    tenant_id: tenantId,
    request_type: gate.requestType,
    title: gate.title,
    summary: summaryText,
    source_module: 'COO Lead Execution',
    related_table: gate.releaseAction === 'buyer_quote_proforma_release' ? 'lead_intake' : 'coo_lead_execution',
    related_record_id: isUuid(lead.id) ? lead.id : null,
    related_record: relatedRecord,
    related_record_label: relatedRecord,
    buyer_name: lead.buyer_name || lead.company_name,
    amount: summary.quote.amountDisplay,
    requested_by: 'COO Command',
    executive_owner: 'COO Command',
    department: 'Operations',
    category: 'Lead to Shipment',
    risk_level: gate.riskLevel,
    priority: gate.priority,
    reason: gate.summary,
    details: metadata,
    metadata
  });
}
