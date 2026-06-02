import { backendStatus, requireSupabase, requireSupabaseSession } from '../lib/supabaseClient.js';
import { demoData, demoTenantId } from './demoData.js';
import { createTableService } from './serviceHelpers.js';

export const companyProfileService = createTableService('company_profiles');
export const companyRegistrationService = createTableService('company_registrations');
export const companyDocumentService = createTableService('company_documents');
export const documentDefaultsService = createTableService('document_defaults');
export const lutDetailsService = createTableService('lut_details');
export const systemAuditLogService = createTableService('system_audit_log');

const localStore = {
  company_profiles: [],
  company_registrations: [],
  company_documents: [],
  document_defaults: [],
  lut_details: [],
  system_audit_log: []
};

const fallbackRegistrationTypes = ['GSTIN', 'IEC', 'PAN', 'FSSAI', 'APEDA', 'Spice Board', 'MSME/Udyam', 'Other Certifications'];
const fallbackDocumentTypes = ['IEC Certificate', 'GST Certificate', 'LUT Document', 'FSSAI License', 'Spice Board Certificate', 'APEDA Certificate'];

localStore.company_registrations = [];

localStore.company_documents = [];

function response(data, error = null) {
  return { ok: !error, data, error, backend: backendStatus };
}

function localList(tableName, tenantId) {
  return (localStore[tableName] || []).filter((item) => item.tenant_id === tenantId);
}

function localUpsert(tableName, tenantId, payload, matchKey = 'id') {
  const rows = localStore[tableName] || [];
  const id = payload.id || `${tableName}-${Date.now()}`;
  const index = rows.findIndex((row) => (
    payload[matchKey] ? row.tenant_id === tenantId && row[matchKey] === payload[matchKey] : row.id === id
  ));
  const next = {
    ...(index >= 0 ? rows[index] : {}),
    ...payload,
    id: index >= 0 ? rows[index].id : id,
    tenant_id: tenantId,
    updated_at: new Date().toISOString()
  };
  if (index >= 0) rows[index] = next;
  else rows.unshift(next);
  localStore[tableName] = rows;
  return next;
}

async function selectRows(tableName, tenantId, fallback = []) {
  const { client, error } = await requireSupabaseSession();
  if (error) return response(fallback.length ? fallback : localList(tableName, tenantId));

  const { data, error: queryError } = await client.from(tableName).select('*').eq('tenant_id', tenantId);
  if (queryError) return response(fallback.length ? fallback : localList(tableName, tenantId), queryError);
  return response(data || []);
}

async function upsertRow(tableName, tenantId, payload, matchColumn = 'id') {
  const { client, error } = requireSupabase();
  if (error) return response(localUpsert(tableName, tenantId, payload, matchColumn));

  const cleanPayload = { ...payload, tenant_id: tenantId };
  const conflict = matchColumn === 'id' ? 'id' : `tenant_id,${matchColumn}`;
  const { data, error: queryError } = await client.from(tableName).upsert(cleanPayload, { onConflict: conflict }).select('*').single();
  if (queryError) return response(null, queryError);
  return response(data);
}

export async function loadCompanyMasterData() {
  const [profile, registrations, documents, defaults, lut] = await Promise.all([
    companyProfileService.list(),
    companyRegistrationService.list(),
    companyDocumentService.list(),
    documentDefaultsService.list(),
    lutDetailsService.list()
  ]);

  return { profile, registrations, documents, defaults, lut };
}

export async function getCompanyProfile(tenantId = demoTenantId) {
  const result = await selectRows('company_profiles', tenantId, localStore.company_profiles);
  return response(result.data?.[0] || null, result.error);
}

export async function saveCompanyProfile(tenantId = demoTenantId, payload) {
  const current = await getCompanyProfile(tenantId);
  const result = await upsertRow('company_profiles', tenantId, { ...payload, id: payload.id || current.data?.id || undefined }, 'id');
  if (result.ok) await writeAuditLog(tenantId, {
    actor: 'Founder/Admin',
    module: 'Company Master Data',
    action: 'Company profile saved',
    record_type: 'company_profiles',
    record_id: result.data.id,
    previous_status: current.data?.status || null,
    new_status: result.data.status || payload.status || 'Draft',
    notes: 'Company profile saved from Company Master Data Vault.'
  });
  return result;
}

export async function getCompanyRegistrations(tenantId = demoTenantId) {
  const result = await selectRows('company_registrations', tenantId, localStore.company_registrations);
  return response(result.data?.length ? result.data : localStore.company_registrations, result.error);
}

export async function saveCompanyRegistration(tenantId = demoTenantId, payload) {
  const result = await upsertRow('company_registrations', tenantId, payload, payload.id ? 'id' : 'registration_type');
  if (result.ok) await writeAuditLog(tenantId, {
    actor: 'Founder/Admin',
    module: 'Company Master Data',
    action: 'Registration saved',
    record_type: 'company_registrations',
    record_id: result.data.id,
    previous_status: null,
    new_status: result.data.status || 'Draft',
    notes: `${result.data.registration_type} registration metadata saved.`
  });
  return result;
}

export async function getLutDetails(tenantId = demoTenantId) {
  const result = await selectRows('lut_details', tenantId, localStore.lut_details);
  return response(result.data?.[0] || localStore.lut_details[0], result.error);
}

export async function saveLutDetails(tenantId = demoTenantId, payload) {
  const current = await getLutDetails(tenantId);
  const result = await upsertRow('lut_details', tenantId, { ...payload, id: payload.id || current.data?.id || undefined }, 'id');
  if (result.ok) await writeAuditLog(tenantId, {
    actor: 'Founder/Admin',
    module: 'Company Master Data',
    action: 'LUT details saved',
    record_type: 'lut_details',
    record_id: result.data.id,
    previous_status: current.data?.status || null,
    new_status: result.data.status || 'Draft',
    notes: 'LUT data updated. Invoice release remains blocked until complete and founder verified.'
  });
  return result;
}

export async function getDocumentDefaults(tenantId = demoTenantId) {
  const result = await selectRows('document_defaults', tenantId, localStore.document_defaults);
  return response(result.data?.[0] || localStore.document_defaults[0], result.error);
}

export async function saveDocumentDefaults(tenantId = demoTenantId, payload) {
  const current = await getDocumentDefaults(tenantId);
  const maskedPayload = {
    ...payload,
    default_bank_masked: payload.default_bank_masked?.includes('XXXX') ? payload.default_bank_masked : 'XXXX-XXXX-4321'
  };
  const result = await upsertRow('document_defaults', tenantId, { ...maskedPayload, id: payload.id || current.data?.id || undefined }, 'id');
  if (result.ok) await writeAuditLog(tenantId, {
    actor: 'Founder/Admin',
    module: 'Company Master Data',
    action: 'Document defaults saved',
    record_type: 'document_defaults',
    record_id: result.data.id,
    previous_status: null,
    new_status: 'Draft',
    notes: 'Document defaults saved with masked bank details only.'
  });
  return result;
}

export async function getCompanyDocuments(tenantId = demoTenantId) {
  const result = await selectRows('company_documents', tenantId, localStore.company_documents);
  return response(result.data?.length ? result.data : localStore.company_documents, result.error);
}

export async function saveCompanyDocument(tenantId = demoTenantId, payload) {
  const result = await upsertRow('company_documents', tenantId, payload, payload.id ? 'id' : 'document_type');
  if (result.ok) await writeAuditLog(tenantId, {
    actor: 'Founder/Admin',
    module: 'Company Master Data',
    action: 'Company document metadata saved',
    record_type: 'company_documents',
    record_id: result.data.id,
    previous_status: null,
    new_status: result.data.status || 'Draft',
    notes: `${result.data.document_type} document metadata updated.`
  });
  return result;
}

export async function getCompanyAuditLog(tenantId = demoTenantId) {
  const { client, error } = await requireSupabaseSession();
  if (error) return response(localList('system_audit_log', tenantId));

  const { data, error: queryError } = await client
    .from('system_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('module', 'Company Master Data')
    .order('created_at', { ascending: false })
    .limit(12);

  if (queryError) return response(localList('system_audit_log', tenantId), queryError);
  return response(data || []);
}

export async function writeAuditLog(tenantId = demoTenantId, event) {
  const payload = {
    tenant_id: tenantId,
    actor: event.actor || 'Founder/Admin',
    module: event.module || 'Company Master Data',
    action: event.action,
    record_type: event.record_type,
    record_id: event.record_id || null,
    previous_status: event.previous_status || null,
    new_status: event.new_status || null,
    notes: event.notes || null,
    created_at: new Date().toISOString()
  };
  const { client, error } = requireSupabase();
  if (error) {
    const local = localUpsert('system_audit_log', tenantId, { ...payload, id: `audit-${Date.now()}` }, 'id');
    return response(local);
  }

  const { data, error: queryError } = await client.from('system_audit_log').insert(payload).select('*').single();
  if (queryError) return response(null, queryError);
  return response(data);
}

export { backendStatus, demoTenantId };
