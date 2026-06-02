import { backendStatus, requireSupabase, requireSupabaseSession } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { createTableService } from './serviceHelpers.js';

export const systemAuditLogService = createTableService('system_audit_log');
export const auditLogService = createTableService('audit_logs');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fallbackAuditLogs = [];

function normalizeAuditPayload(payload = {}, includeLegacyColumns = true) {
  const actionType = payload.action_type || payload.action || 'Action recorded';
  const description = payload.description || payload.notes || actionType;
  const relatedId = payload.related_record_id || payload.record_id || null;
  const safeRelatedUuid = uuidPattern.test(String(relatedId || '')) ? relatedId : null;
  const normalized = {
    action_type: actionType,
    module: payload.module || 'System',
    related_table: payload.related_table || payload.record_type || null,
    related_record_id: safeRelatedUuid,
    actor: payload.actor || 'GOPU OS',
    description,
    old_value: payload.old_value || payload.previous_value || null,
    new_value: payload.new_value || payload.metadata || null,
    risk_level: payload.risk_level || payload.severity || 'Low'
  };

  if (!includeLegacyColumns) return normalized;

  return {
    tenant_id: payload.tenant_id || demoTenantId,
    actor_user_id: payload.actor_user_id || null,
    actor_role: payload.actor_role || normalized.actor,
    action: actionType,
    record_type: normalized.related_table,
    record_id: relatedId ? String(relatedId) : null,
    previous_status: payload.previous_status || null,
    new_status: payload.new_status || null,
    notes: description,
    metadata: payload.metadata || {},
    ...normalized
  };
}

function normalizeAuditRow(row = {}) {
  return {
    id: row.id,
    action_type: row.action_type || row.action || 'Action recorded',
    module: row.module || row.record_type || 'System',
    actor: row.actor || row.actor_role || 'GOPU OS',
    description: row.description || row.notes || '',
    risk_level: row.risk_level || row.severity || row.metadata?.risk_level || 'Low',
    created_at: row.created_at,
    related_table: row.related_table || row.record_type || '',
    related_record_id: row.related_record_id || row.record_id || ''
  };
}

export async function recordAuditEvent(payload) {
  return systemAuditLogService.create(payload);
}

export async function createAuditLog(payload = {}) {
  const { client, error } = requireSupabase();
  if (error) return { ok: true, data: normalizeAuditPayload(payload), error: null, backend: backendStatus };

  try {
    const primaryPayload = normalizeAuditPayload(payload, true);
    const { data, error: insertError } = await client.from('audit_logs').insert(primaryPayload).select('*').single();
    if (!insertError) return { ok: true, data: normalizeAuditRow(data), error: null, backend: backendStatus };

    const retryableSchemaError = ['PGRST204', '42703', '23502'].includes(insertError.code);
    if (retryableSchemaError) {
      const { data: retryData, error: retryError } = await client.from('audit_logs').insert(normalizeAuditPayload(payload, false)).select('*').single();
      if (!retryError) return { ok: true, data: normalizeAuditRow(retryData), error: null, backend: backendStatus };
      return { ok: false, data: null, error: retryError, backend: backendStatus };
    }

    return { ok: false, data: null, error: insertError, backend: backendStatus };
  } catch (auditError) {
    return { ok: false, data: null, error: auditError, backend: backendStatus };
  }
}

export async function listAuditLogs(limit = 50) {
  const { client, error } = await requireSupabaseSession();
  if (error) return { ok: true, data: fallbackAuditLogs, error: null, backend: backendStatus };

  try {
    const { data, error: queryError } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (queryError) return { ok: false, data: fallbackAuditLogs, error: queryError, backend: backendStatus };
    return { ok: true, data: (data || []).map(normalizeAuditRow), error: null, backend: backendStatus };
  } catch (queryError) {
    return { ok: false, data: fallbackAuditLogs, error: queryError, backend: backendStatus };
  }
}

export function createRecordDeletedAudit(payload = {}) {
  return createAuditLog({
    ...payload,
    action_type: 'Record deleted',
    risk_level: payload.risk_level || 'High',
    description: payload.description || `${payload.related_table || 'Record'} deleted.`
  });
}
