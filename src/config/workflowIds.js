export const WORKFLOW_ID_PREFIXES = Object.freeze({
  lead: 'GOPU-LEAD',
  quote: 'GOPU-QT',
  approval: 'GOPU-APR',
  proformaInvoice: 'GOPU-PI',
  commercialInvoice: 'GOPU-CI',
  payment: 'GOPU-PAY',
  shipment: 'GOPU-SHP',
  document: 'GOPU-DOC',
  exportOrder: 'GOPU-ORD'
});

function compactSeed(value = '') {
  return String(value || 'FLOW')
    .replace(/^GOPU[-_]/i, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(-12) || 'FLOW';
}

function dateStamp(date = new Date()) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return safeDate.toISOString().slice(0, 10).replace(/-/g, '');
}

export function workflowId(type, seed, date = new Date()) {
  const prefix = WORKFLOW_ID_PREFIXES[type] || WORKFLOW_ID_PREFIXES.document;
  return `${prefix}-${dateStamp(date)}-${compactSeed(seed)}`;
}

export function buildWorkflowIds(context = {}) {
  const seed = context.leadNumber || context.lead_number || context.leadId || context.id || context.buyer || context.product || 'FLOW';
  const date = context.date ? new Date(context.date) : new Date();
  return {
    lead: context.leadNumber || context.lead_number || workflowId('lead', seed, date),
    quote: workflowId('quote', seed, date),
    approval: workflowId('approval', seed, date),
    proformaInvoice: workflowId('proformaInvoice', seed, date),
    commercialInvoice: workflowId('commercialInvoice', seed, date),
    payment: workflowId('payment', seed, date),
    shipment: workflowId('shipment', seed, date),
    document: workflowId('document', seed, date),
    exportOrder: workflowId('exportOrder', seed, date)
  };
}

export function workflowIdRows(ids = {}) {
  return [
    ['Lead ID', ids.lead],
    ['Quote ID', ids.quote],
    ['Approval ID', ids.approval],
    ['Proforma Invoice ID', ids.proformaInvoice],
    ['Payment ID', ids.payment],
    ['Shipment ID', ids.shipment],
    ['Document Set ID', ids.document],
    ['Export Order ID', ids.exportOrder]
  ].filter(([, value]) => value);
}
