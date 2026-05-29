import { backendStatus, requireSupabase } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';

export const whatsappApprovalProviders = ['twilio', 'meta-cloud-api', 'future-provider'];
export const whatsappDeliveryStatuses = ['Disabled', 'Pending', 'Sent', 'Delivered', 'Failed'];
export const whatsappApprovalActions = ['Approve', 'Reject', 'Needs Review'];

const localFounderApprovals = [];
const localFounderApprovalAudit = [];

function serverEnv(name) {
  if (typeof process === 'undefined' || !process.env) return '';
  return process.env[name] || '';
}

function response(data, error = null) {
  return { ok: !error, data, error, backend: backendStatus };
}

function safeError(error) {
  return {
    message: error?.message || 'WhatsApp approval request failed safely.',
    code: error?.code || error?.name || 'WHATSAPP_SEND_FAILED'
  };
}

function normalizeApprovalPayload(payload = {}) {
  return {
    approvalId: payload.approvalId || payload.id || '',
    type: payload.type || payload.request_type || 'Approval Request',
    buyer: payload.buyer || payload.buyer_name || 'Workflow',
    amount: payload.amount || 'Workflow approval',
    risk: payload.risk || payload.risk_level || 'Medium',
    requestedBy: payload.requestedBy || payload.executive_owner || payload.department || 'Operations Team',
    reason: payload.reason || payload.summary || payload.details?.risk_reason || 'Founder decision required.',
    phoneNumber: payload.phoneNumber || serverEnv('WHATSAPP_PHONE_NUMBER'),
    provider: payload.provider || 'meta-cloud-api',
    sourceModule: payload.sourceModule || payload.source_module || payload.details?.workflow_source || 'Approval Workflow'
  };
}

export function formatWhatsAppApprovalMessage(payload = {}) {
  const approval = normalizeApprovalPayload(payload);
  return [
    '--------------',
    'GOPU OS APPROVAL REQUEST',
    '',
    `Type: ${approval.type}`,
    `Buyer: ${approval.buyer}`,
    `Amount: ${approval.amount}`,
    `Risk: ${approval.risk}`,
    '',
    'Requested By:',
    approval.requestedBy,
    '',
    'Reason:',
    approval.reason,
    '',
    'Reply:',
    'APPROVE',
    'or',
    'REJECT',
    '--------------'
  ].join('\n');
}

function buildProviderRequest(approval) {
  const apiUrl = serverEnv('WHATSAPP_API_URL');
  const apiToken = serverEnv('WHATSAPP_API_TOKEN');
  const phoneNumber = approval.phoneNumber || serverEnv('WHATSAPP_PHONE_NUMBER');
  return {
    apiUrl,
    apiToken,
    phoneNumber,
    configured: Boolean(apiUrl && apiToken && phoneNumber),
    body: {
      to: phoneNumber,
      type: 'text',
      text: { body: formatWhatsAppApprovalMessage(approval) },
      metadata: {
        approval_id: approval.approvalId,
        provider: approval.provider,
        source_module: approval.sourceModule
      }
    }
  };
}

function localInsert(collection, payload) {
  const record = {
    id: payload.id || `wa-approval-local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
    created_at: payload.created_at || new Date().toISOString()
  };
  collection.unshift(record);
  return record;
}

export async function sendWhatsAppApprovalRequest(payload = {}) {
  const approval = normalizeApprovalPayload(payload);
  const message = formatWhatsAppApprovalMessage(approval);
  const base = {
    provider: approval.provider,
    approval_id: approval.approvalId,
    whatsapp_status: 'Pending',
    message_preview: message,
    retry_count: 0,
    sent_at: null,
    delivered_at: null
  };

  if (typeof window !== 'undefined') {
    try {
      const request = await fetch('/api/whatsapp/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...approval, message })
      });
      const result = await request.json().catch(() => ({}));
      const status = result.ok ? (result.status || 'Sent') : result.status === 'not_configured' ? 'Disabled' : 'Failed';
      return response({ ...base, whatsapp_status: status, provider_message_id: result.messageId || null, note: result.message || '' }, result.ok || status === 'Disabled' ? null : new Error(result.message || 'WhatsApp send failed.'));
    } catch (error) {
      console.error('[whatsapp] approval request failed safely', {
        approval_id: approval.approvalId,
        provider: approval.provider,
        error: safeError(error)
      });
      return response({ ...base, whatsapp_status: 'Disabled', retry_count: 0, note: 'WhatsApp provider disabled for launch. Approval remains in GOPU OS.' }, null);
    }
  }

  const providerRequest = buildProviderRequest(approval);
  if (!providerRequest.configured) {
    return response({ ...base, whatsapp_status: 'Disabled', note: 'WhatsApp provider disabled for launch.' });
  }

  try {
    const providerResponse = await fetch(providerRequest.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerRequest.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(providerRequest.body)
    });
    const result = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) throw new Error(result.error?.message || result.message || `WhatsApp provider returned ${providerResponse.status}`);
    return response({
      ...base,
      whatsapp_status: 'Sent',
      provider_message_id: result.messages?.[0]?.id || result.sid || result.id || null,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[whatsapp] approval provider send failed safely', {
      approval_id: approval.approvalId,
      provider: approval.provider,
      error: safeError(error)
    });
    return response({ ...base, whatsapp_status: 'Failed', retry_count: 1, note: 'WhatsApp provider send failed. Approval remains in GOPU OS.' }, null);
  }
}

export async function syncFounderApproval(tenantId = demoTenantId, approvalRequest, whatsappResult = {}) {
  const payload = {
    tenant_id: tenantId,
    approval_request_id: approvalRequest.id,
    request_type: approvalRequest.request_type,
    buyer_name: approvalRequest.buyer_name || 'Workflow',
    amount: approvalRequest.amount || approvalRequest.details?.amount || 'Workflow approval',
    risk_level: approvalRequest.risk_level || 'Medium',
    requested_by: approvalRequest.executive_owner || approvalRequest.department || 'Operations Team',
    reason: approvalRequest.summary || approvalRequest.details?.risk_reason || 'Founder decision required.',
    title: approvalRequest.title || `${approvalRequest.request_type} approval`,
    summary: approvalRequest.summary || approvalRequest.details?.operational_impact || approvalRequest.reason || '',
    source_module: approvalRequest.source_module || approvalRequest.details?.workflow_source || 'Approval Workflow',
    related_table: approvalRequest.related_table || approvalRequest.source_module || 'Approval Workflow',
    related_record: approvalRequest.related_record || approvalRequest.related_workflow_id || null,
    status: approvalRequest.status || approvalRequest.approval_status || 'Pending Approval',
    approval_status: approvalRequest.approval_status || approvalRequest.status || 'Pending Approval',
    whatsapp_status: whatsappResult.whatsapp_status || 'Pending',
    whatsapp_provider: whatsappResult.provider || 'meta-cloud-api',
    provider_message_id: whatsappResult.provider_message_id || null,
    retry_count: whatsappResult.retry_count || 0,
    audit_trail: [
      {
        event: 'WhatsApp approval request prepared',
        status: whatsappResult.whatsapp_status || 'Pending',
        at: new Date().toISOString()
      }
    ]
  };

  const { client, error } = requireSupabase();
  if (error) return response(localInsert(localFounderApprovals, payload));

  const { data, error: queryError } = await client
    .from('founder_approvals')
    .upsert(payload, { onConflict: 'approval_request_id' })
    .select('*')
    .single();
  if (queryError) {
    console.error('[whatsapp] founder approval sync failed safely', {
      approval_request_id: approvalRequest.id,
      error: safeError(queryError)
    });
    return response(null, queryError);
  }
  return response(data);
}

export async function updateFounderApprovalDecision(tenantId = demoTenantId, approvalRequestId, decision, note = '') {
  const action = whatsappApprovalActions.includes(decision) ? decision : 'Needs Review';
  const normalized = action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : 'Needs Review';
  const auditEvent = {
    event: `Founder decision: ${normalized}`,
    note,
    at: new Date().toISOString()
  };

  const { client, error } = requireSupabase();
  if (error) {
    const row = localFounderApprovals.find((item) => item.approval_request_id === approvalRequestId);
    if (row) {
      row.approval_status = normalized;
      row.status = normalized;
      row.audit_trail = [...(row.audit_trail || []), auditEvent];
      row.updated_at = new Date().toISOString();
    }
    localInsert(localFounderApprovalAudit, { approval_request_id: approvalRequestId, ...auditEvent });
    return response(row || null);
  }

  const { data: existing } = await client
    .from('founder_approvals')
    .select('audit_trail')
    .eq('tenant_id', tenantId)
    .eq('approval_request_id', approvalRequestId)
    .maybeSingle();

  const { data, error: queryError } = await client
    .from('founder_approvals')
    .update({
      status: normalized,
      approval_status: normalized,
      decision_note: note || null,
      decided_by: 'Founder',
      decided_at: new Date().toISOString(),
      audit_trail: [...(existing?.audit_trail || []), auditEvent],
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('approval_request_id', approvalRequestId)
    .select('*')
    .maybeSingle();

  if (queryError) {
    console.error('[whatsapp] founder approval decision sync failed safely', {
      approval_request_id: approvalRequestId,
      error: safeError(queryError)
    });
    return response(null, queryError);
  }
  return response(data || null);
}

export function parseWhatsAppApprovalReply(text = '') {
  const normalized = String(text).trim().toUpperCase();
  if (normalized === 'APPROVE') return 'Approve';
  if (normalized === 'REJECT') return 'Reject';
  if (normalized === 'NEEDS REVIEW' || normalized === 'REVIEW') return 'Needs Review';
  return null;
}
