import { createTableService } from './serviceHelpers.js';
import { backendStatus, requireSupabaseSession } from '../lib/supabaseClient.js';
import {
  demoTenantId,
  getCompanyProfile,
  getCompanyRegistrations,
  getDocumentDefaults,
  getLutDetails
} from './companyService.js';

export const invoiceService = createTableService('invoices');
export const invoiceCompanySnapshotService = createTableService('invoice_company_snapshot');
export const invoiceBuyerSnapshotService = createTableService('invoice_buyer_snapshot');
export const invoiceLineItemService = createTableService('invoice_line_items');
export const invoiceExportDetailsService = createTableService('invoice_export_details');
export const invoiceValidationLogService = createTableService('invoice_validation_logs');
export const invoiceApprovalEventService = createTableService('invoice_approval_events');
export const invoiceAuditLogService = createTableService('invoice_audit_log');
export const documentWorkflowService = createTableService('document_workflows');
export const documentDraftService = createTableService('document_drafts');

export async function loadInvoiceSystem() {
  const [invoices, workflows, drafts, validationLogs] = await Promise.all([
    invoiceService.list(),
    documentWorkflowService.list(),
    documentDraftService.list(),
    invoiceValidationLogService.list()
  ]);

  return { invoices, workflows, drafts, validationLogs };
}

const LUT_EXPORT_ENDORSEMENT = 'SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX';

function registrationMap(registrations = []) {
  return Object.fromEntries(registrations.map((item) => [item.registration_type, item.registration_number || '']));
}

export async function buildCompanySnapshotFromVault(tenantId = demoTenantId) {
  const [profileResult, registrationsResult, defaultsResult, lutResult] = await Promise.all([
    getCompanyProfile(tenantId),
    getCompanyRegistrations(tenantId),
    getDocumentDefaults(tenantId),
    getLutDetails(tenantId)
  ]);
  const profile = profileResult.data || {};
  const registrations = registrationMap(registrationsResult.data || []);
  const defaults = defaultsResult.data || {};
  const lut = lutResult.data || {};

  return {
    tenant_id: tenantId,
    backend_mode: backendStatus.mode,
    company_display_name: profile.company_display_name || 'GOPU Exports',
    legal_company_name: profile.legal_company_name || '',
    business_type: profile.business_type || '',
    registered_address: profile.registered_address || '',
    operating_address: profile.operating_address || '',
    city: profile.city || '',
    state: profile.state || '',
    country: profile.country || '',
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    authorized_person: profile.authorized_person || defaults.authorized_signatory || '',
    gstin: registrations.GSTIN || '',
    iec: registrations.IEC || '',
    pan: registrations.PAN || '',
    fssai: registrations.FSSAI || '',
    apeda: registrations.APEDA || '',
    spice_board: registrations['Spice Board'] || '',
    msme_udyam: registrations['MSME/Udyam'] || '',
    invoice_prefix: defaults.invoice_prefix || 'GOPU-INV',
    quotation_prefix: defaults.quotation_prefix || 'GOPU-QTN',
    default_currency: defaults.default_currency || 'USD',
    default_payment_terms: defaults.default_payment_terms || '',
    default_incoterm: defaults.default_incoterm || 'CIF',
    default_port_loading: defaults.default_port_loading || '',
    default_bank_name: 'Masked bank metadata only',
    default_bank_account_masked: defaults.default_bank_masked || 'XXXX-XXXX-4321',
    authorized_signatory: defaults.authorized_signatory || profile.authorized_person || '',
    default_email_footer: defaults.email_footer || '',
    buyer_document_note: defaults.buyer_document_note || '',
    lut_arn: lut.lut_arn || '',
    lut_financial_year: lut.financial_year || '',
    lut_filing_date: lut.filing_date || '',
    lut_valid_from: lut.valid_from || '',
    lut_valid_to: lut.valid_to || '',
    lut_status: lut.status || 'Draft',
    lut_document_status: lut.document_url ? 'Uploaded' : 'Missing upload',
    lut_founder_verified_status: lut.founder_verified ? 'Verified' : 'Pending',
    export_endorsement: LUT_EXPORT_ENDORSEMENT,
    snapshot_created_at: new Date().toISOString()
  };
}

export function validateInvoice(invoice) {
  const c = invoice.company_snapshot || {};
  const item = invoice.items?.[0] || {};
  const lutExpired = c.lut_valid_to ? new Date(c.lut_valid_to) < new Date() : false;
  const checks = [
    ['legal_company_name', 'Company', 'legal company name present', c.legal_company_name, 'Founder Office', 'critical'],
    ['registered_address', 'Company', 'registered address present', c.registered_address, 'Founder Office', 'critical'],
    ['gstin', 'Company', 'GSTIN present', c.gstin, 'Finance', 'critical'],
    ['iec', 'Company', 'IEC present', c.iec, 'Compliance', 'critical'],
    ['pan', 'Company', 'PAN present', c.pan, 'Finance', 'critical'],
    ['authorized_signatory', 'Company', 'authorized signatory present', c.authorized_signatory, 'Founder Office', 'critical'],
    ['lut_arn', 'LUT', 'LUT ARN/reference present', c.lut_arn, 'Founder Office', 'critical'],
    ['lut_financial_year', 'LUT', 'LUT financial year present', c.lut_financial_year, 'Founder Office', 'critical'],
    ['lut_valid_from', 'LUT', 'LUT valid from present', c.lut_valid_from, 'Founder Office', 'critical'],
    ['lut_valid_to', 'LUT', 'LUT valid to present', c.lut_valid_to && !lutExpired, 'Founder Office', 'critical'],
    ['lut_status', 'LUT', 'LUT status active/verified', ['Active', 'Verified'].includes(c.lut_status), 'Founder Office', 'critical'],
    ['lut_founder_verified', 'LUT', 'founder verified', c.lut_founder_verified_status === 'Verified', 'Founder Office', 'critical'],
    ['invoice_number', 'Invoice', 'invoice number present', invoice.invoice_number, 'Finance', 'critical'],
    ['invoice_date', 'Invoice', 'invoice date present', invoice.invoice_date, 'Finance', 'critical'],
    ['financial_year', 'Invoice', 'financial year present', invoice.financial_year, 'Finance', 'critical'],
    ['buyer_name', 'Buyer', 'buyer name present', invoice.buyer_name, 'Sales', 'critical'],
    ['buyer_address', 'Buyer', 'buyer address present', invoice.buyer_address, 'Sales', 'critical'],
    ['product_description', 'Product', 'product line item present', item.product_description, 'Operations', 'critical'],
    ['hsn_code', 'Product', 'HSN present', item.hsn_code, 'Compliance', 'critical'],
    ['quantity', 'Product', 'quantity present', Number(item.quantity) > 0, 'Operations', 'critical'],
    ['unit_price', 'Product', 'unit price present', Number(item.unit_price) > 0, 'Finance', 'critical'],
    ['endorsement', 'Export', 'LUT endorsement attached', c.export_endorsement === LUT_EXPORT_ENDORSEMENT, 'Documentation', 'critical'],
    ['origin_review', 'Export', 'country of origin reviewed', invoice.origin_review_status === 'Approved', 'Founder Office', 'critical'],
    ['hsn_review', 'Export', 'HSN review flagged/approved', invoice.hsn_review_status === 'Approved', 'Founder Office', 'critical'],
    ['founder_approval', 'Approval', 'founder approval complete', invoice.approval_status === 'Approved for Release', 'Founder Office', 'critical']
  ];

  return checks.map(([key, group, message, pass, owner, severity]) => ({
    key,
    group,
    message,
    owner,
    severity,
    status: pass ? 'Passed' : 'Failed'
  }));
}

export async function getInvoices(tenantId = demoTenantId) {
  return invoiceService.list({ tenant_id: tenantId });
}

export async function getInvoiceById(tenantId = demoTenantId, invoiceId) {
  const result = await invoiceService.getById(invoiceId);
  if (!result.data || result.data.tenant_id === tenantId) return result;
  return { ...result, data: null, error: { message: 'Invoice not found for tenant.' } };
}

export async function writeInvoiceAuditLog(tenantId = demoTenantId, invoiceId, event) {
  return invoiceAuditLogService.create({
    tenant_id: tenantId,
    invoice_id: invoiceId,
    action: event.action,
    actor: event.actor || 'Founder UI',
    previous_status: event.previous_status || null,
    new_status: event.new_status || null,
    notes: event.notes || null
  });
}

export async function createInvoiceCompanySnapshot(tenantId = demoTenantId, invoiceId) {
  const snapshot = await buildCompanySnapshotFromVault(tenantId);
  const payload = {
    tenant_id: tenantId,
    invoice_id: invoiceId,
    legal_company_name: snapshot.legal_company_name,
    registered_address: snapshot.registered_address,
    gstin: snapshot.gstin,
    iec: snapshot.iec,
    pan: snapshot.pan,
    authorized_signatory: snapshot.authorized_signatory,
    bank_details_masked: snapshot.default_bank_account_masked,
    lut_arn: snapshot.lut_arn,
    lut_financial_year: snapshot.lut_financial_year,
    lut_valid_from: snapshot.lut_valid_from || null,
    lut_valid_to: snapshot.lut_valid_to || null,
    lut_status: snapshot.lut_status
  };
  const { client, error } = await requireSupabaseSession();
  if (error) {
    await writeInvoiceAuditLog(tenantId, invoiceId, {
      action: 'Company data snapshot injected',
      new_status: 'Draft',
      notes: 'Integration Pending - Company data not backend connected.'
    });
    return { ok: false, data: null, error, backend: backendStatus, snapshot };
  }
  const { data, error: queryError } = await client.from('invoice_company_snapshot').insert(payload).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus, snapshot };
  await writeInvoiceAuditLog(tenantId, invoiceId, {
    action: 'Company data snapshot injected',
    new_status: 'Draft',
    notes: 'Snapshot copied from Company Master Data Vault.'
  });
  return { ok: true, data, error: null, backend: backendStatus, snapshot };
}

export async function createInvoiceDraftFromVault(tenantId = demoTenantId, payload = {}) {
  const snapshot = await buildCompanySnapshotFromVault(tenantId);
  const invoiceNumber = payload.invoice_number || `${snapshot.invoice_prefix || 'GOPU-INV'}-DRAFT-${Date.now().toString().slice(-5)}`;
  const draft = {
    tenant_id: tenantId,
    invoice_type: payload.invoice_type || 'Export Tax Invoice under LUT',
    invoice_number: invoiceNumber,
    financial_year: payload.financial_year || snapshot.lut_financial_year || '2026-2027',
    status: 'Draft',
    approval_status: 'Founder Review Required',
    export_mode: 'LUT/Bond Without IGST',
    currency: payload.currency || snapshot.default_currency || 'USD',
    subtotal: 0,
    tax_total: 0,
    grand_total: 0,
    amount_in_words: 'Draft amount pending'
  };
  const { client, error } = await requireSupabaseSession();
  if (error) {
    await writeInvoiceAuditLog(tenantId, invoiceNumber, {
      action: 'Company data snapshot injected',
      new_status: 'Draft',
      notes: 'Integration Pending - Company data not backend connected.'
    });
    return { ok: false, data: null, error, backend: backendStatus };
  }
  const { data, error: queryError } = await client.from('invoices').insert(draft).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  const snapshotResult = await createInvoiceCompanySnapshot(tenantId, data.id);
  return { ok: true, data: { ...data, company_snapshot: snapshotResult.snapshot }, error: null, backend: backendStatus };
}

export { backendStatus, demoTenantId, LUT_EXPORT_ENDORSEMENT };
