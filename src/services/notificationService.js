import { getApprovalQueue } from './approvalService.js';
import { getTasks } from './taskService.js';
import { demoTenantId } from './demoData.js';
import { isSupabaseConfigured, requireSupabase, requireSupabaseSession } from '../lib/supabaseClient.js';

const demoDelay = 0;
const localViewed = new Set();
const localEscalated = new Set();

function wait() {
  return new Promise((resolve) => setTimeout(resolve, demoDelay));
}

function notification(id, type, severity, title, message, sourceModule, route, status = 'Monitoring') {
  return {
    id,
    tenant_id: demoTenantId,
    notification_type: type,
    severity,
    title,
    message,
    source_module: sourceModule,
    linked_record_id: id,
    linked_route: route,
    status: localEscalated.has(id) ? 'Escalated' : status,
    viewed_by_founder: localViewed.has(id),
    created_at: 'Today'
  };
}

const baseAlerts = [];

const auditSeed = [];

function approvalToNotification(approval) {
  return {
    id: `notif-${approval.id}`,
    tenant_id: approval.tenant_id || demoTenantId,
    notification_type: 'Approval',
    severity: approval.risk_level || approval.priority || 'Attention',
    title: approval.title || approval.summary || `${approval.request_type} requires review`,
    message: approval.summary || 'Founder approval is required before workflow release.',
    source_module: approval.source_module || approval.department || 'Director Queue',
    linked_record_id: approval.id,
    linked_route: '/export-os/director',
    status: localEscalated.has(`notif-${approval.id}`) ? 'Escalated' : approval.status || 'Approval Needed',
    viewed_by_founder: localViewed.has(`notif-${approval.id}`),
    created_at: approval.created_at || 'Today',
    approval
  };
}

function taskToNotification(task) {
  const severity = task.priority === 'Critical' ? 'Critical' : task.priority === 'High' ? 'High Risk' : 'Attention';
  return {
    id: `notif-${task.id}`,
    tenant_id: task.tenant_id || demoTenantId,
    notification_type: task.workflow_source === 'COO Command' ? 'Information' : 'Warning',
    severity,
    title: task.title,
    message: task.blocking_reason || task.next_action || task.description || 'Workflow requires attention.',
    source_module: task.workflow_source || 'Task Engine',
    linked_record_id: task.id,
    linked_route: task.linked_route || '/export-os/tasks',
    status: localEscalated.has(`notif-${task.id}`) ? 'Escalated' : task.status || 'Review Required',
    viewed_by_founder: localViewed.has(`notif-${task.id}`),
    created_at: task.created_at || 'Today',
    task
  };
}

export async function getNotificationCenterData(tenantId = demoTenantId) {
  await wait();
  if (isSupabaseConfigured) {
    const { client, error } = await requireSupabaseSession();
    if (!error) {
      const [{ data: liveNotifications, error: notificationError }, { data: auditRows }] = await Promise.all([
        client.from('notifications').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
        client.from('audit_logs').select('*').eq('tenant_id', tenantId).eq('module', 'notifications').order('created_at', { ascending: false }).limit(20)
      ]);
      if (!notificationError) {
        const notifications = (liveNotifications || []).map((item) => ({
          ...item,
          notification_type: item.notification_type || item.source_module || 'Notification',
          severity: item.severity || item.priority || 'Attention',
          linked_route: item.linked_route || item.metadata?.linked_route || '/export-os/notifications',
          viewed_by_founder: item.status === 'Viewed' || Boolean(item.read_at)
        }));
        return {
          data: {
            notifications,
            audit: auditRows || [],
            counts: {
              critical: notifications.filter((item) => item.severity === 'Critical').length,
              pendingReviews: notifications.filter((item) => ['Approval Needed', 'Review Required', 'Verification Required', 'Attention Required'].includes(item.status)).length,
              escalated: notifications.filter((item) => item.status === 'Escalated').length
            }
          },
          error: null
        };
      }
    }
  }

  const [approvalResponse, taskResponse] = await Promise.all([
    getApprovalQueue(tenantId),
    getTasks(tenantId)
  ]);
  const approvalNotifications = (approvalResponse.data || []).map(approvalToNotification);
  const operationsNotifications = (taskResponse.data || [])
    .filter((task) => ['Blocked', 'Escalated', 'Waiting Founder Approval', 'Waiting Review'].includes(task.status) || ['Critical', 'High'].includes(task.priority))
    .map(taskToNotification);
  const notifications = [...approvalNotifications, ...operationsNotifications, ...baseAlerts];
  const priorityOrder = { Critical: 0, 'High Risk': 1, High: 1, Attention: 2, 'Review Required': 2, Monitoring: 3 };
  notifications.sort((a, b) => (priorityOrder[a.severity] ?? 4) - (priorityOrder[b.severity] ?? 4));
  return {
    data: {
      notifications,
      audit: auditSeed,
      counts: {
        critical: notifications.filter((item) => item.severity === 'Critical').length,
        pendingReviews: notifications.filter((item) => ['Approval Needed', 'Review Required', 'Founder Review Required', 'Attention Required'].includes(item.status)).length,
        escalated: notifications.filter((item) => item.status === 'Escalated').length
      }
    },
    error: null
  };
}

export async function markNotificationViewed(notificationId) {
  localViewed.add(notificationId);
  if (isSupabaseConfigured) {
    const { client, error } = requireSupabase();
    if (error) return { ok: false, data: null, error };
    const { data, error: queryError } = await client.from('notifications').update({ status: 'Viewed', read_at: new Date().toISOString() }).eq('id', notificationId).select('*').maybeSingle();
    return { ok: !queryError, data, error: queryError };
  }
  await wait();
  return { ok: true, data: { notification_id: notificationId, viewed_by_founder: true }, error: null };
}

export async function escalateNotification(notificationId) {
  localEscalated.add(notificationId);
  if (isSupabaseConfigured) {
    const { client, error } = requireSupabase();
    if (error) return { ok: false, data: null, error };
    const { data, error: queryError } = await client.from('notifications').update({ status: 'Escalated' }).eq('id', notificationId).select('*').maybeSingle();
    return { ok: !queryError, data, error: queryError };
  }
  await wait();
  return { ok: true, data: { notification_id: notificationId, status: 'Escalated' }, error: null };
}
