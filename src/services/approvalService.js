import { backendStatus, isSupabaseConfigured, requireSupabase, requireSupabaseSession } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { createAuditLog } from './auditService.js';
import { createTableService } from './serviceHelpers.js';
import { sendSlackNotification } from './slackNotificationService.js';
import { createTaskFromWorkflow } from './taskService.js';
import { cachedRead, clearCache } from './performanceCache.js';
import { cleanSlackText } from '../../lib/slackTextClean.js';
import {
  sendWhatsAppApprovalRequest,
  syncFounderApproval,
  updateFounderApprovalDecision
} from './whatsappApprovalService.js';

export const approvalRequestService = createTableService('approval_requests');
export const approvalCommentService = createTableService('approval_comments');
export const approvalActionService = createTableService('approval_actions');
export const approvalAuditService = createTableService('approval_audit_log');

export const founderApprovalStatuses = ['Pending Approval', 'Approved', 'Rejected', 'Needs Review'];

export const sensitiveApprovalTypes = {
  SEND_QUOTE_TO_BUYER: 'Sending quote to buyer',
  APPROVE_DISCOUNT: 'Approving discount',
  MARK_SHIPMENT_DELIVERED: 'Marking shipment as delivered',
  MARK_RENEWAL_PAID: 'Marking renewal as paid',
  HIGH_VALUE_PAYMENT_UPDATE: 'High-value payment update',
  DELETE_RECORD: 'Deleting records',
  CHANGE_FINAL_PRICE: 'Changing final price',
  SEND_BUYER_EMAIL: 'Sending buyer-facing email'
};

const approvalStatusMap = {
  Pending: 'Pending Approval',
  'Review Pending': 'Pending Approval',
  'Founder Review Required': 'Pending Approval',
  'Attention Required': 'Pending Approval',
  'Waiting Founder Action': 'Pending Approval',
  'Approved for Release': 'Approved',
  'Revision Requested': 'Needs Review',
  Escalated: 'Needs Review'
};

function normalizeApprovalStatus(status) {
  return approvalStatusMap[status] || (founderApprovalStatuses.includes(status) ? status : 'Pending Approval');
}

function toLegacyReleaseStatus(status) {
  if (status === 'Approved') return 'Approved for Release';
  if (status === 'Needs Review') return 'Revision Requested';
  return status;
}

function isLeadReleaseApproval(request = {}) {
  const metadata = request.metadata || {};
  const details = request.details || metadata.details || {};
  const type = String(request.request_type || metadata.request_type || details.request_type || '').toLowerCase();
  const releaseAction = String(metadata.release_action || details.release_action || '').toLowerCase();
  if (releaseAction === 'buyer_quote_proforma_release' || releaseAction === 'buyer_email_release') return true;
  if (releaseAction && releaseAction !== 'buyer_quote_proforma_release' && releaseAction !== 'buyer_email_release') return false;
  return (
    type.includes('slack lead quote') ||
    type.includes('quotation send') ||
    type.includes('lead quote') ||
    type.includes('proforma invoice send')
  );
}

export function requiresFounderApproval(actionType) {
  return Boolean(sensitiveApprovalTypes[actionType] || Object.values(sensitiveApprovalTypes).includes(actionType));
}

const localApprovals = [];

const localComments = [];
const localActions = [];
const localAudit = [];

function normalizeApproval(row) {
  const metadata = row.metadata || {};
  const details = row.details || metadata.details || metadata || {};
  const whatsappStatus = row.whatsapp_status || details.whatsapp_status || details.whatsapp_delivery_status || metadata.whatsapp_status || 'Pending';
  const requestType = row.request_type || row.approval_type || metadata.request_type;
  const status = normalizeApprovalStatus(row.status || row.approval_status);
  const relatedRecord = row.related_record || metadata.related_record || metadata.related_record_id || metadata.linked_record || row.source_record_id || row.related_workflow_id;
  return {
    ...row,
    request_type: requestType,
    approval_status: status,
    status,
    title: row.title || metadata.title || details.title || row.summary || `${requestType} approval`,
    amount: row.amount || details.amount || details.value || 'Workflow approval',
    category: row.category || metadata.category || details.category || inferApprovalCategory({ ...row, request_type: requestType }),
    department: row.department || metadata.department || details.department || inferApprovalCategory({ ...row, request_type: requestType }),
    executive_owner: row.executive_owner || metadata.executive_owner || metadata.requested_by_label || 'Workflow Owner',
    requested_by_label: row.requested_by_label || metadata.requested_by_label || row.executive_owner || 'Workflow Owner',
    requested_time: row.requested_time || row.created_at,
    lead_number: row.lead_number || metadata.lead_number || metadata.lead?.lead_number || '',
    quotation_amount: row.quotation_amount || metadata.pricing?.recommendedTotalPrice || metadata.final_quote_amount || null,
    product: row.product || metadata.product || metadata.lead?.product || details.product || '',
    quantity: row.quantity || metadata.quantity || metadata.lead?.quantity || details.quantity || '',
    unit: row.unit || metadata.unit || metadata.lead?.unit || details.unit || '',
    price_source_type: metadata.price_source_summary?.price_source_type || metadata.pricing?.price_source_type || '',
    source_confidence: metadata.price_source_summary?.source_confidence || '',
    buyer_name: row.buyer_name || metadata.buyer_name || metadata.related_record_label || 'Workflow',
    related_workflow_id: relatedRecord,
    related_record: relatedRecord || 'Not linked',
    risk_level: row.risk_level || metadata.risk_level || row.priority || 'Medium',
    priority: row.priority || metadata.priority || row.risk_level || 'Medium',
    source_module: row.source_module || metadata.source_module || details.workflow_source,
    whatsapp_status: whatsappStatus,
    whatsapp_provider: row.whatsapp_provider || details.whatsapp_provider || metadata.whatsapp_provider || 'meta-cloud-api',
    reason: row.reason || metadata.reason || row.summary || details.risk_reason || 'Founder approval required before execution.',
    summary: row.summary || metadata.summary || details.operational_impact || 'Founder approval required before sensitive action can execute.',
    created_at: row.created_at?.includes?.('T') ? new Date(row.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : row.created_at,
    details: { ...details, whatsapp_status: whatsappStatus }
  };
}

function inferApprovalCategory(row) {
  const text = `${row.request_type} ${row.department}`.toLowerCase();
  if (text.includes('price') || text.includes('pricing') || text.includes('finance') || text.includes('payment') || text.includes('discount')) return 'Financial';
  if (text.includes('document') || text.includes('invoice') || text.includes('compliance') || text.includes('lut') || text.includes('hsn') || text.includes('origin')) return 'Compliance';
  if (text.includes('marketing') || text.includes('claim') || text.includes('content')) return 'Marketing';
  if (text.includes('technical') || text.includes('api') || text.includes('automation') || text.includes('cto')) return 'Technical';
  return 'Operations';
}

function localInsert(collection, payload) {
  const record = {
    id: payload.id || `approval-local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
    created_at: payload.created_at || new Date().toISOString()
  };
  collection.unshift(record);
  return record;
}

function localUpdateRequest(id, payload) {
  const index = localApprovals.findIndex((request) => request.id === id);
  if (index < 0) return null;
  localApprovals[index] = { ...localApprovals[index], ...payload, updated_at: new Date().toISOString() };
  return localApprovals[index];
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function createFounderApprovalNotification(tenantId, approval) {
  const payload = {
    tenant_id: tenantId,
    recipient_role: 'director',
    source_module: approval.source_module || 'Approval Workflow',
    title: `Founder approval requested: ${approval.request_type}`,
    message: approval.reason || approval.summary || 'Sensitive action is blocked until founder decision.',
    status: 'Unread',
    priority: ['Critical', 'High'].includes(approval.risk_level || approval.priority) ? 'High' : 'Medium',
    metadata: {
      approval_id: approval.id,
      request_type: approval.request_type,
      related_record: approval.related_record,
      risk_level: approval.risk_level,
      linked_route: '/export-os/director',
      channel: 'Slack'
    }
  };
  const { client, error } = requireSupabase();
  if (error) return { ok: true, data: payload, error: null, backend: backendStatus };
  const { data, error: queryError } = await client.from('notifications').insert(payload).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  return { ok: true, data, error: null, backend: backendStatus };
}

async function attachWhatsAppApprovalRequest(tenantId, approvalRow) {
  const approval = normalizeApproval(approvalRow);
  const whatsapp = await sendWhatsAppApprovalRequest({
    approvalId: approval.id,
    type: approval.request_type,
    buyer: approval.buyer_name,
    amount: approval.amount,
    risk: approval.risk_level,
    requestedBy: approval.requested_by_label || approval.executive_owner || 'Operations Team',
    reason: approval.reason || approval.summary,
    sourceModule: approval.source_module,
    details: approval.details
  });
  const whatsappStatus = whatsapp.data?.whatsapp_status || 'Pending';
  const whatsappProvider = whatsapp.data?.provider || 'meta-cloud-api';
  const details = {
    ...(approval.details || {}),
    whatsapp_status: whatsappStatus,
    whatsapp_provider: whatsappProvider,
    whatsapp_retry_count: whatsapp.data?.retry_count || 0
  };

  await syncFounderApproval(tenantId, { ...approval, details }, whatsapp.data || {});

  const { client, error } = requireSupabase();
  if (error) {
    return localUpdateRequest(approval.id, { details, whatsapp_status: whatsappStatus, whatsapp_provider: whatsappProvider }) || { ...approvalRow, details, whatsapp_status: whatsappStatus, whatsapp_provider: whatsappProvider };
  }

  const metadata = {
    ...(approvalRow.metadata || {}),
    details,
    whatsapp_status: whatsappStatus,
    whatsapp_provider: whatsappProvider,
    whatsapp_retry_count: whatsapp.data?.retry_count || 0
  };
  const { data, error: updateError } = await client
    .from('founder_approvals')
    .update({
      metadata,
      whatsapp_status: whatsappStatus,
      whatsapp_provider: whatsappProvider,
      provider_message_id: whatsapp.data?.provider_message_id || null,
      retry_count: whatsapp.data?.retry_count || 0,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('id', approval.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('[approval] WhatsApp status update failed safely', {
      approval_id: approval.id,
      message: updateError.message
    });
    return { ...approvalRow, metadata, details, whatsapp_status: whatsappStatus, whatsapp_provider: whatsappProvider };
  }
  return data;
}

export async function getApprovalQueue(tenantId = demoTenantId) {
  const cacheKey = `approvals:list:${tenantId}`;
  return cachedRead(cacheKey, 12000, () => getApprovalQueueUncached(tenantId));
}

async function getApprovalQueueUncached(tenantId = demoTenantId) {
  const { client, error } = await requireSupabaseSession();
  if (error) return { ok: true, data: localApprovals.map(normalizeApproval), error: null, backend: backendStatus };

  const { data, error: queryError } = await client
    .from('founder_approvals')
    .select('id,tenant_id,approval_request_id,request_type,approval_type,title,summary,source_module,related_table,related_record_id,related_record,buyer_name,amount,requested_by,risk_level,priority,lead_number,quotation_amount,reason,status,approval_status,whatsapp_status,whatsapp_provider,provider_message_id,retry_count,metadata,details,audit_trail,decision_note,decided_by,decided_at,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(250);

  if (queryError) return { ok: false, data: isSupabaseConfigured ? localApprovals.map(normalizeApproval) : localApprovals.map(normalizeApproval), error: queryError, backend: backendStatus };
  return { ok: true, data: (data || []).map(normalizeApproval), error: null, backend: backendStatus };
}

export async function getApprovalById(tenantId = demoTenantId, id) {
  const queue = await getApprovalQueue(tenantId);
  return { ...queue, data: queue.data.find((request) => request.id === id) || null };
}

export async function createApprovalRequest(payload = {}) {
  const tenantId = payload.tenant_id || demoTenantId;
  const requestDetails = {
    ...(payload.details || {}),
    title: payload.title,
    amount: payload.amount,
    category: payload.category,
    source_module: payload.source_module
  };
  const approvalStatus = normalizeApprovalStatus(payload.status || payload.approval_status || 'Pending Approval');
  const approvalId = isUuid(payload.id) ? payload.id : createUuid();
  const requestType = payload.request_type || payload.approval_type || 'Sensitive Action';
  const sourceModule = payload.source_module || payload.department || 'Approval Workflow';
  const relatedRecord = payload.related_record || payload.related_record_id || payload.related_workflow_id || null;
  const request = {
    id: approvalId,
    tenant_id: tenantId,
    approval_request_id: approvalId,
    request_type: requestType,
    title: payload.title || requestType,
    summary: payload.summary,
    source_module: sourceModule,
    related_table: payload.related_table || sourceModule,
    related_record_id: isUuid(payload.source_record_id || payload.related_record_id || payload.related_workflow_id) ? (payload.source_record_id || payload.related_record_id || payload.related_workflow_id) : null,
    related_record: relatedRecord ? String(relatedRecord) : null,
    buyer_name: payload.buyer_name || payload.related_record_label || 'Workflow',
    amount: payload.amount || requestDetails.amount || null,
    requested_by: payload.requested_by || payload.executive_owner || 'Workflow Owner',
    risk_level: payload.risk_level || payload.priority || 'Medium',
    reason: payload.reason || payload.summary,
    status: approvalStatus,
    approval_status: approvalStatus,
    whatsapp_status: 'Pending',
    whatsapp_provider: 'meta-cloud-api',
    metadata: {
      ...(payload.metadata || {}),
      details: requestDetails,
      request_type: requestType,
      title: payload.title || requestType,
      department: payload.department,
      executive_owner: payload.executive_owner,
      requested_by_label: payload.requested_by || payload.executive_owner || 'Workflow Owner',
      buyer_name: payload.buyer_name || 'Workflow',
      related_record: relatedRecord,
      related_record_label: payload.related_record_label || payload.buyer_name || payload.title,
      risk_level: payload.risk_level || payload.priority || 'Medium',
      reason: payload.reason || payload.summary,
      category: payload.category,
      amount: payload.amount,
      approval_status: approvalStatus,
      action_blocked: true,
      slack_alert_status: 'Queued',
      whatsapp_status: 'Pending',
      whatsapp_provider: 'meta-cloud-api'
    },
    audit_trail: [{
      event: 'Founder approval requested',
      status: approvalStatus,
      at: new Date().toISOString()
    }]
  };
  const { client, error } = requireSupabase();
  if (error) {
    const local = localInsert(localApprovals, {
      ...payload,
      request_type: request.request_type,
      status: approvalStatus,
      source_module: request.source_module,
      title: payload.title,
      category: payload.category,
      related_record: request.related_record,
      reason: request.metadata.reason,
      details: { ...requestDetails, whatsapp_status: 'Pending', whatsapp_provider: 'meta-cloud-api' },
      whatsapp_status: 'Pending',
      whatsapp_provider: 'meta-cloud-api'
    });
    await writeApprovalAudit(tenantId, local.id, { event: 'approval request created', actor: payload.executive_owner || 'Workflow', status: local.status });
    await createAuditLog({
      tenant_id: tenantId,
      action_type: 'Approval requested',
      module: request.source_module || payload.source_module || 'Director Queue',
      related_table: 'founder_approvals',
      related_record_id: local.id,
      actor: payload.executive_owner || 'Workflow',
      description: payload.summary || `${payload.request_type || 'Approval'} requested.`,
      new_value: local,
      risk_level: local.risk_level || payload.risk_level || 'Medium'
    });
    await createFounderApprovalNotification(tenantId, normalizeApproval(local));
    await createTaskFromWorkflow({
      tenant_id: tenantId,
      title: payload.title ? `Approval pending: ${payload.title}` : 'Founder approval pending',
      description: payload.summary || 'Approval request created from workflow.',
      workflow_source: 'Director Queue',
      linked_record_id: local.id,
      linked_label: payload.request_type || 'Approval request',
      linked_route: '/export-os/director',
      department: payload.department || 'Founder Office',
      owner_command: local.status === 'Revision Requested' ? payload.executive_owner : 'Founder',
      assigned_role: local.status === 'Revision Requested' ? payload.executive_owner : 'Founder',
      priority: payload.priority || payload.risk_level || 'High',
      status: 'Waiting Founder Approval',
      due_date: 'Today',
      blocking_reason: payload.summary || local.details?.risk_reason || 'Approval request is blocking workflow progress.',
      next_action: 'Founder must approve, reject, request revision, or escalate.',
      buyer: payload.buyer_name,
      product: payload.details?.product
    });
    await sendSlackNotification({
      type: 'Founder Approval Required',
      priority: ['Critical', 'High'].includes(local.priority || local.risk_level) ? 'URGENT' : 'WARNING',
      reference: local.related_workflow_id || local.id,
      buyer: local.buyer_name || local.executive_owner || 'Founder Office',
      status: local.status,
      eta: local.due_date || 'Today',
      actionRequired: local.summary || local.details?.operational_impact || 'Founder decision required before workflow can continue.',
      source: local.source_module || 'Approval Workflow'
    });
    const localWithWhatsApp = await attachWhatsAppApprovalRequest(tenantId, local);
    clearCache('approvals:');
    clearCache('tasks:');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gopu:approval-created', { detail: normalizeApproval(localWithWhatsApp) }));
    return { ok: true, data: normalizeApproval(localWithWhatsApp), error: null, backend: backendStatus };
  }

  const { data, error: queryError } = await client.from('founder_approvals').insert(request).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  clearCache('approvals:');
  clearCache('tasks:');
  await writeApprovalAudit(tenantId, data.id, { event: 'approval request created', actor: payload.executive_owner || payload.requested_by || 'Workflow', status: request.status });
  await createAuditLog({
    tenant_id: tenantId,
    action_type: 'Approval requested',
    module: request.source_module || payload.source_module || 'Director Queue',
    related_table: 'founder_approvals',
    related_record_id: data.id,
    actor: payload.executive_owner || payload.requested_by || 'Workflow',
    description: payload.summary || `${payload.request_type || 'Approval'} requested.`,
    new_value: data,
    risk_level: request.risk_level || payload.risk_level || 'Medium'
  });
  await createFounderApprovalNotification(tenantId, normalizeApproval(data));
  await createTaskFromWorkflow({
    tenant_id: tenantId,
    title: payload.title ? `Approval pending: ${payload.title}` : 'Founder approval pending',
    description: payload.summary || 'Approval request created from workflow.',
    workflow_source: 'Director Queue',
    linked_record_id: data.id,
    linked_label: payload.request_type || 'Approval request',
    linked_route: '/export-os/director',
    department: payload.department || 'Founder Office',
    owner_command: 'Founder',
    assigned_role: 'Founder',
    priority: payload.priority || payload.risk_level || 'High',
    status: 'Waiting Founder Approval',
    due_date: 'Today',
    blocking_reason: payload.summary || requestDetails.risk_reason || 'Approval request is blocking workflow progress.',
    next_action: 'Founder must approve, reject, request revision, or escalate.',
    buyer: payload.buyer_name,
    product: payload.details?.product
  });
  await sendSlackNotification({
    type: 'Founder Approval Required',
    priority: ['Critical', 'High'].includes(request.risk_level) ? 'URGENT' : 'WARNING',
    reference: data.related_record || data.id,
    buyer: request.buyer_name || request.requested_by || 'Founder Office',
    status: request.status,
    eta: 'Today',
    actionRequired: request.summary || requestDetails.operational_impact || 'Founder decision required before workflow can continue.',
    source: request.source_module || 'Approval Workflow'
  });
  const dataWithWhatsApp = await attachWhatsAppApprovalRequest(tenantId, data);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gopu:approval-created', { detail: normalizeApproval(dataWithWhatsApp) }));
  return { ok: true, data: normalizeApproval(dataWithWhatsApp), error: null, backend: backendStatus };
}

export async function requestSensitiveActionApproval(payload = {}) {
  const actionLabel = sensitiveApprovalTypes[payload.action_type] || payload.action_type || payload.request_type || 'Sensitive Action';
  if (!requiresFounderApproval(payload.action_type || actionLabel)) {
    return { ok: true, data: { approval_required: false }, error: null, backend: backendStatus };
  }
  return createApprovalRequest({
    ...payload,
    request_type: actionLabel,
    title: payload.title || actionLabel,
    status: 'Pending Approval',
    reason: payload.reason || `${actionLabel} requires founder approval before execution.`,
    summary: payload.summary || `${actionLabel} is blocked until founder approval is recorded.`,
    risk_level: payload.risk_level || (payload.amount && Number(payload.amount) > 1500 ? 'High' : 'Medium'),
    priority: payload.priority || payload.risk_level || 'High'
  });
}

export async function addApprovalComment(tenantId = demoTenantId, approvalRequestId, comment, author = 'Founder') {
  const payload = { tenant_id: tenantId, approval_request_id: approvalRequestId, author, comment, comment_type: 'Founder Note' };
  const { client, error } = requireSupabase();
  if (error) {
    const local = localInsert(localComments, payload);
    clearCache('approvals:');
    await writeApprovalAudit(tenantId, approvalRequestId, { event: 'founder note added', actor: author, status: 'Comment Added' });
    return { ok: true, data: local, error: null, backend: backendStatus };
  }
  const { data, error: queryError } = await client.from('approval_comments').insert(payload).select('*').single();
  if (queryError) {
    const local = localInsert(localComments, payload);
    clearCache('approvals:');
    await writeApprovalAudit(tenantId, approvalRequestId, { event: 'founder note added', actor: author, status: 'Comment Added', note: comment });
    return { ok: true, data: local, error: null, backend: backendStatus };
  }
  await writeApprovalAudit(tenantId, approvalRequestId, { event: 'founder note added', actor: author, status: 'Comment Added' });
  clearCache('approvals:');
  return { ok: true, data, error: null, backend: backendStatus };
}

export async function writeApprovalAudit(tenantId = demoTenantId, approvalRequestId, event = {}) {
  const payload = {
    tenant_id: tenantId,
    actor_role: event.actor || 'Founder',
    action: event.event || 'approval event',
    module: 'founder_approvals',
    record_type: 'approval',
    record_id: String(approvalRequestId),
    previous_status: event.previous_status || null,
    new_status: event.status,
    notes: event.note || event.reason || '',
    metadata: {
      approval_request_id: approvalRequestId,
      actor: event.actor || 'Founder',
      event: event.event || 'approval event'
    },
    created_at: new Date().toISOString()
  };
  const { client, error } = requireSupabase();
  if (error) return { ok: true, data: localInsert(localAudit, payload), error: null, backend: backendStatus };

  const { data, error: queryError } = await client.from('audit_logs').insert(payload).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  return { ok: true, data, error: null, backend: backendStatus };
}

async function recordApprovalAction(tenantId, request, actionType, nextStatus, reason) {
  const payload = {
    tenant_id: tenantId,
    approval_request_id: request.id,
    action_type: actionType,
    actor: 'Founder',
    action_reason: reason || ''
  };
  const { client, error } = requireSupabase();
  if (error) {
    localInsert(localActions, payload);
  } else {
    await writeApprovalAudit(tenantId, request.id, {
      event: actionType,
      actor: 'Founder',
      status: nextStatus,
      reason
    });
  }
  return syncWorkflowStatus(tenantId, request, nextStatus);
}

export async function syncWorkflowStatus(tenantId = demoTenantId, request, nextStatus) {
  const module = request.source_module || request.details?.workflow_source || inferApprovalCategory(request);
  const releaseStatus = toLegacyReleaseStatus(nextStatus);
  const statusByModule = {
    'pricing-engine': releaseStatus === 'Approved for Release' ? 'Draft Quote Ready' : releaseStatus,
    'invoice-system': releaseStatus === 'Approved for Release' ? 'Approved for Release' : releaseStatus,
    'document-factory': releaseStatus === 'Approved for Release' ? 'Buyer Release Package Enabled' : releaseStatus,
    'task-engine': nextStatus === 'Needs Review' ? 'Revision Required' : releaseStatus,
    'Shipment Tracker': nextStatus === 'Approved' ? 'Delivery Approval Granted' : releaseStatus,
    'Payment Vault': nextStatus === 'Approved' ? 'Payment Action Approved' : releaseStatus
  };
  const syncedStatus = statusByModule[module] || releaseStatus;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gopu:workflow-status-updated', {
    detail: {
      tenant_id: tenantId,
      related_workflow_id: request.related_workflow_id,
      source_module: module,
      status: syncedStatus
    }
  }));
  return { ok: true, data: { source_module: module, status: syncedStatus }, error: null, backend: backendStatus };
}

async function updateApprovalStatus(tenantId, request, nextStatus, actionType, note = '') {
  const previousStatus = request.status;
  const normalizedNextStatus = normalizeApprovalStatus(nextStatus);
  const { client, error } = requireSupabase();
  let updated;
  if (error) {
    updated = localUpdateRequest(request.id, { status: normalizedNextStatus, approval_status: normalizedNextStatus }) || { ...request, status: normalizedNextStatus };
  } else {
    const metadata = {
      ...(request.metadata || {}),
      ...(request.details ? { details: request.details } : {}),
      approval_status: normalizedNextStatus,
      decision_note: note || '',
      decided_by: 'Founder',
      previous_status: previousStatus
    };
    const { data, error: queryError } = await client
      .from('founder_approvals')
      .update({
        status: normalizedNextStatus,
        approval_status: normalizedNextStatus,
        decision_note: note || '',
        decided_by: 'Founder',
        decided_at: ['Approved', 'Rejected'].includes(normalizedNextStatus) ? new Date().toISOString() : null,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();
    if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
    updated = data;
  }
  clearCache('approvals:');
  clearCache('tasks:');
  if (note) await addApprovalComment(tenantId, request.id, note, 'Founder');
  await recordApprovalAction(tenantId, request, actionType, normalizedNextStatus, note || `${previousStatus} -> ${normalizedNextStatus}`);
  await createAuditLog({
    tenant_id: tenantId,
    action_type: normalizedNextStatus === 'Approved' ? 'Approval approved' : normalizedNextStatus === 'Rejected' ? 'Approval rejected' : actionType,
    module: request.source_module || 'Director Queue',
    related_table: 'founder_approvals',
    related_record_id: request.id,
    actor: 'Founder',
    description: note || `${request.title || request.request_type || 'Approval'} changed from ${previousStatus} to ${normalizedNextStatus}.`,
    old_value: { status: previousStatus },
    new_value: { status: normalizedNextStatus },
    risk_level: request.risk_level || request.priority || 'Medium'
  });
  const founderDecision = actionType === 'Approve' ? 'Approve' : actionType === 'Reject' ? 'Reject' : 'Needs Review';
  await updateFounderApprovalDecision(tenantId, request.id, founderDecision, note || `${previousStatus} -> ${normalizedNextStatus}`);
  if (normalizedNextStatus === 'Approved' && isLeadReleaseApproval(request)) {
    try {
      const response = await fetch('/api/director/approve-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: request.id, note })
      });
      const result = await response.json().catch(() => ({}));
      const nextMeta = {
        ...(updated.metadata || {}),
        director_release_result: result,
        stage_after_approval: result.stage?.toStage || result.stage?.stageName || 2
      };
      if (!error && result.ok) {
        await client.from('founder_approvals').update({ metadata: nextMeta, updated_at: new Date().toISOString() }).eq('id', request.id).eq('tenant_id', tenantId);
      }
      updated = { ...updated, metadata: nextMeta };
    } catch (releaseError) {
      updated = {
        ...updated,
        metadata: {
          ...(updated.metadata || {}),
          director_release_result: { ok: false, message: releaseError.message || 'Director release endpoint failed.' }
        }
      };
    }
  }
  if (normalizedNextStatus === 'Needs Review') {
    await createTaskFromWorkflow({
      tenant_id: tenantId,
      title: `Review needed: ${request.title}`,
      description: note || request.summary || 'Approval action requires workflow owner follow-up.',
      workflow_source: 'Director Queue',
      linked_record_id: request.id,
      linked_label: request.request_type,
      linked_route: '/export-os/director',
      department: request.department,
      owner_command: request.executive_owner || 'COO Command',
      assigned_role: request.executive_owner || 'COO',
      priority: request.priority || request.risk_level || 'High',
      status: 'Revision Required',
      due_date: 'Today',
      blocking_reason: note || `${actionType} from Director Command Center.`,
      next_action: 'Originating owner must revise and resubmit for approval.',
      buyer: request.buyer_name,
      product: request.details?.product
    });
  }
  // Send Slack notification back to channel when Director approves or rejects
  if (['Approved', 'Rejected'].includes(normalizedNextStatus)) {
    const botToken = typeof process !== 'undefined' ? process.env?.SLACK_BOT_TOKEN : null;
    const channelId = typeof process !== 'undefined' ? process.env?.SLACK_CHANNEL_ID : null;
    if (botToken && channelId) {
      const emoji = normalizedNextStatus === 'Approved' ? '✅' : '❌';
      const meta = request.metadata || {};
      const lead = meta.lead || {};
      const pricing = meta.pricing || {};
      const amount = request.amount || '';
      const slackMsg = [
        `${emoji} *Director ${normalizedNextStatus}: ${request.title || request.request_type}*`,
        ``,
        `*Buyer:* ${request.buyer_name || lead.company_name || 'N/A'}`,
        `*Product:* ${lead.product || 'N/A'} — ${lead.quantity || ''} ${lead.unit || ''}`.trim(),
        `*Amount:* ${amount}`,
        normalizedNextStatus === 'Approved'
          ? `\n*Next step:* COO to send Proforma Invoice to buyer. CFO to prepare Commercial Invoice.`
          : `*Reason:* ${note || 'Rejected by Director'}`,
        note && normalizedNextStatus === 'Approved' ? `*Note:* ${note}` : '',
      ].filter(Boolean).join('\n');
      const cleanSlackMsg = cleanSlackText(slackMsg);
      fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelId, text: cleanSlackMsg }),
      }).catch(() => null);
    }
  }

  return { ok: true, data: normalizeApproval(updated), error: null, backend: backendStatus };
}

export function approveRequest(tenantId = demoTenantId, request, note = '') {
  return updateApprovalStatus(tenantId, request, 'Approved', 'Approve', note);
}

export function rejectRequest(tenantId = demoTenantId, request, note = '') {
  return updateApprovalStatus(tenantId, request, 'Rejected', 'Reject', note);
}

export function requestRevision(tenantId = demoTenantId, request, note = '') {
  return updateApprovalStatus(tenantId, request, 'Needs Review', 'Request Revision', note);
}

export function escalateRequest(tenantId = demoTenantId, request, note = '') {
  return updateApprovalStatus(tenantId, request, 'Needs Review', 'Escalate', note);
}

export function needsReviewRequest(tenantId = demoTenantId, request, note = '') {
  return updateApprovalStatus(tenantId, request, 'Needs Review', 'Needs Review', note);
}

export async function loadApprovalWall() {
  const [requests, comments, actions, audit] = await Promise.all([
    getApprovalQueue(),
    approvalCommentService.list(),
    approvalActionService.list(),
    approvalAuditService.list()
  ]);

  return { requests, comments, actions, audit };
}

export { backendStatus, demoTenantId };
