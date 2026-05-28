import { backendStatus, isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { createTableService } from './serviceHelpers.js';

export const taskService = createTableService('tasks');
export const taskCommentService = createTableService('task_comments');
export const taskStatusHistoryService = createTableService('task_status_history');
export const taskEscalationService = createTableService('task_escalations');

const nowLabel = () => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const workflowRouteMap = {
  'Pricing Engine': '/export-os/pricing-engine',
  'Invoice System': '/export-os/invoices/new',
  'Director Queue': '/export-os/director',
  'Document Factory': '/export-os/document-factory',
  Documents: '/export-os/document-factory',
  'COO Command': '/export-os/executives/coo',
  'Lead Intake': '/export-os/lead-intake',
  Shipments: '/export-os/shipments',
  'Company Master Data': '/export-os/company-master-data'
};

const localTasks = [];

const localComments = [];
const localHistory = [];
const localEscalations = [];
const localTaskStorageKey = 'gopu-export-os-local-tasks';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function hydrateLocalTasks() {
  if (!canUseLocalStorage()) return;
  try {
    const saved = JSON.parse(window.localStorage.getItem(localTaskStorageKey) || '[]');
    saved.forEach((task) => {
      if (task?.id && !localTasks.some((item) => item.id === task.id)) localTasks.unshift(normalizeTask(task));
    });
  } catch {
    window.localStorage.removeItem(localTaskStorageKey);
  }
}

function persistLocalTasks() {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(localTaskStorageKey, JSON.stringify(localTasks.map(normalizeTask)));
}

function inferPriority(payload = {}) {
  const text = `${payload.title} ${payload.blocking_reason} ${payload.workflow_source}`.toLowerCase();
  if (payload.priority) return payload.priority;
  if (text.includes('invoice release blocked') || text.includes('critical') || text.includes('buyer release')) return 'Critical';
  if (text.includes('lut') || text.includes('hsn') || text.includes('origin') || text.includes('cfo review') || text.includes('approval')) return 'High';
  if (text.includes('supplier') || text.includes('document field') || text.includes('tomorrow')) return 'Medium';
  return 'Low';
}

function normalizeStatus(status) {
  if (status === 'Done') return 'Done';
  return status || 'New';
}

function normalizeTask(task = {}) {
  const workflowSource = task.workflow_source || task.source_module || 'Task Engine';
  return {
    ...task,
    id: task.id || `task-local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tenant_id: task.tenant_id || demoTenantId,
    workflow_source: workflowSource,
    linked_label: task.linked_label || task.linked_record_id || 'Workflow record',
    linked_route: task.linked_route || workflowRouteMap[workflowSource] || '/export-os/tasks',
    assigned_role: task.assigned_role || task.assigned_to || task.owner_command || 'Operations',
    priority: inferPriority(task),
    status: normalizeStatus(task.status),
    due_date: task.due_date || 'Today',
    escalation_level: task.escalation_level || 'COO review if unresolved',
    blocking_reason: task.blocking_reason || '',
    next_action: task.next_action || 'Review workflow blocker and update owner.',
    created_at: task.created_at || nowLabel(),
    updated_at: task.updated_at || nowLabel()
  };
}

function dispatchTaskEvent(name, detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail }));
}

function localInsert(collection, payload) {
  const record = normalizeTask(payload);
  collection.unshift(record);
  return record;
}

function findLocalTask(id) {
  return localTasks.find((task) => task.id === id);
}

export async function getTasks(tenantId = demoTenantId, filters = {}) {
  const { client, error } = requireSupabase();
  if (error) {
    hydrateLocalTasks();
    return { ok: true, data: localTasks.map(normalizeTask), error: null, backend: backendStatus };
  }

  let query = client.from('tasks').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== 'All') query = query.eq(key, value);
  });
  const { data, error: queryError } = await query;
  if (queryError) return { ok: false, data: isSupabaseConfigured ? [] : localTasks.map(normalizeTask), error: queryError, backend: backendStatus };
  return { ok: true, data: (data || []).map(normalizeTask), error: null, backend: backendStatus };
}

export async function getTaskById(tenantId = demoTenantId, taskId) {
  const { client, error } = requireSupabase();
  if (error) {
    const local = findLocalTask(taskId);
    return { ok: true, data: local ? normalizeTask(local) : null, error: null, backend: backendStatus };
  }
  const { data, error: queryError } = await client.from('tasks').select('*').eq('tenant_id', tenantId).eq('id', taskId).maybeSingle();
  if (queryError) return { ok: false, data: normalizeTask(findLocalTask(taskId)), error: queryError, backend: backendStatus };
  return { ok: true, data: data ? normalizeTask(data) : null, error: null, backend: backendStatus };
}

export async function createTaskFromWorkflow(payload = {}) {
  const tenantId = payload.tenant_id || demoTenantId;
  const task = normalizeTask({
    tenant_id: tenantId,
    title: payload.title,
    description: payload.description || payload.blocking_reason || payload.next_action,
    workflow_source: payload.workflow_source,
    linked_record_id: payload.linked_record_id || payload.related_workflow_id || null,
    linked_label: payload.linked_label,
    linked_route: payload.linked_route,
    department: payload.department,
    owner_command: payload.owner_command,
    assigned_to: payload.assigned_to || payload.assigned_role,
    assigned_role: payload.assigned_role,
    priority: payload.priority,
    status: payload.status,
    due_date: payload.due_date,
    escalation_level: payload.escalation_level,
    blocking_reason: payload.blocking_reason,
    next_action: payload.next_action,
    buyer: payload.buyer,
    product: payload.product
  });

  const { client, error } = requireSupabase();
  if (error) {
    const local = localInsert(localTasks, task);
    persistLocalTasks();
    await writeTaskAuditLog(tenantId, local.id, { actor: task.workflow_source, event: 'task created', previous_status: '-', new_status: local.status, notes: local.blocking_reason });
    dispatchTaskEvent('gopu:task-created', local);
    return { ok: true, data: local, error: null, backend: backendStatus };
  }

  const { data, error: queryError } = await client.from('tasks').insert(task).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  await writeTaskAuditLog(tenantId, data.id, { actor: task.workflow_source, event: 'task created', previous_status: '-', new_status: data.status, notes: data.blocking_reason });
  dispatchTaskEvent('gopu:task-created', normalizeTask(data));
  return { ok: true, data: normalizeTask(data), error: null, backend: backendStatus };
}

export async function updateTaskStatus(tenantId = demoTenantId, taskId, status, notes = '', actor = 'COO Command') {
  const previous = findLocalTask(taskId)?.status || 'Unknown';
  const nextStatus = normalizeStatus(status);
  const payload = { status: nextStatus, updated_at: new Date().toISOString() };
  const { client, error } = requireSupabase();
  let updated;
  if (error) {
    const task = findLocalTask(taskId);
    if (task) Object.assign(task, payload, { blocking_reason: nextStatus === 'Blocked' ? (task.blocking_reason || notes || 'Blocked pending owner input.') : task.blocking_reason });
    persistLocalTasks();
    updated = normalizeTask(task);
  } else {
    const { data, error: queryError } = await client.from('tasks').update(payload).eq('tenant_id', tenantId).eq('id', taskId).select('*').single();
    if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
    updated = normalizeTask(data);
  }
  await writeTaskAuditLog(tenantId, taskId, { actor, event: 'status changed', previous_status: previous, new_status: nextStatus, notes });
  dispatchTaskEvent('gopu:task-updated', updated);
  return { ok: true, data: updated, error: null, backend: backendStatus };
}

export async function addTaskComment(tenantId = demoTenantId, taskId, comment, author = 'COO Command') {
  const payload = { tenant_id: tenantId, task_id: taskId, author, comment, comment_type: 'Workflow Note', created_at: new Date().toISOString() };
  const { client, error } = requireSupabase();
  if (error) {
    localComments.unshift(payload);
    await writeTaskAuditLog(tenantId, taskId, { actor: author, event: 'note added', previous_status: '', new_status: '', notes: comment });
    return { ok: true, data: payload, error: null, backend: backendStatus };
  }
  const { data, error: queryError } = await client.from('task_comments').insert(payload).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  await writeTaskAuditLog(tenantId, taskId, { actor: author, event: 'note added', previous_status: '', new_status: '', notes: 'Founder/COO note stored.' });
  return { ok: true, data, error: null, backend: backendStatus };
}

export async function escalateTask(tenantId = demoTenantId, taskId, reason = 'Workflow escalation required', escalatedTo = 'Founder') {
  const payload = { tenant_id: tenantId, task_id: taskId, escalation_level: escalatedTo, escalation_reason: reason, escalated_to: escalatedTo, status: 'Escalated', created_at: new Date().toISOString() };
  const { client, error } = requireSupabase();
  if (error) {
    localEscalations.unshift(payload);
    persistLocalTasks();
  }
  else {
    const { error: queryError } = await client.from('task_escalations').insert(payload);
    if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  }
  const statusResult = await updateTaskStatus(tenantId, taskId, 'Escalated', reason, 'COO Command');
  await writeTaskAuditLog(tenantId, taskId, { actor: 'COO Command', event: 'escalated', previous_status: '', new_status: 'Escalated', notes: reason });
  return { ok: true, data: statusResult.data, error: null, backend: backendStatus };
}

export async function getTasksBySource(tenantId = demoTenantId, source) {
  const result = await getTasks(tenantId);
  return { ...result, data: result.data.filter((task) => task.workflow_source === source) };
}

export async function getCOOTaskSummary(tenantId = demoTenantId) {
  const result = await getTasks(tenantId);
  const tasks = result.data;
  return {
    ok: result.ok,
    data: {
      open: tasks.filter((task) => task.status !== 'Done').length,
      blocked: tasks.filter((task) => task.status === 'Blocked').length,
      dueToday: tasks.filter((task) => task.due_date === 'Today').length,
      overdue: tasks.filter((task) => task.due_date === 'Overdue').length,
      founderWaiting: tasks.filter((task) => task.status === 'Waiting Founder Approval' || task.escalation_level?.includes('Founder')).length,
      supplierFollowups: tasks.filter((task) => `${task.title} ${task.workflow_source}`.toLowerCase().includes('supplier')).length,
      invoiceDocumentBlockers: tasks.filter((task) => ['Invoice System', 'Document Factory', 'Documents'].includes(task.workflow_source) && ['Blocked', 'Escalated', 'Waiting Review'].includes(task.status)).length,
      tasks
    },
    error: result.error,
    backend: result.backend
  };
}

export async function writeTaskAuditLog(tenantId = demoTenantId, taskId, event = {}) {
  const payload = {
    tenant_id: tenantId,
    task_id: taskId,
    previous_status: event.previous_status || null,
    new_status: event.new_status || null,
    actor: event.actor || 'Workflow Engine',
    notes: `${event.event || 'task event'}${event.notes ? ` - ${event.notes}` : ''}`,
    created_at: new Date().toISOString()
  };
  const { client, error } = requireSupabase();
  if (error) {
    const local = { id: `task-history-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...payload };
    localHistory.unshift(local);
    dispatchTaskEvent('gopu:task-audit', local);
    return { ok: true, data: local, error: null, backend: backendStatus };
  }
  const { data, error: queryError } = await client.from('task_status_history').insert(payload).select('*').single();
  if (queryError) return { ok: false, data: null, error: queryError, backend: backendStatus };
  dispatchTaskEvent('gopu:task-audit', data);
  return { ok: true, data, error: null, backend: backendStatus };
}

export async function loadTaskEngine() {
  const [tasks, comments, history, escalations] = await Promise.all([
    getTasks(),
    taskCommentService.list(),
    taskStatusHistoryService.list(),
    taskEscalationService.list()
  ]);

  return {
    tasks: tasks.data,
    comments: comments.data?.length ? comments.data : localComments,
    history: history.data?.length ? history.data : localHistory,
    escalations: escalations.data?.length ? escalations.data : localEscalations
  };
}

export { backendStatus, demoTenantId };
