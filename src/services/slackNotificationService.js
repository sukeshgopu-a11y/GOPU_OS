export const slackNotificationTypes = [
  'New Lead',
  'New Shipment Created',
  'Shipment Delayed',
  'Renewal Expiring Soon',
  'Renewal Expired',
  'Payment Received',
  'High Priority Alert',
  'Founder Approval Required',
  'Task Blocked',
  'Task Escalated',
  'COO Daily Plan',
  'Supplier Follow-up Required'
];

export const slackPriorities = ['INFO', 'WARNING', 'URGENT'];

const activityKey = 'gopuSlackNotificationActivity';

const seedActivity = [];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePriority(priority) {
  const value = String(priority || 'INFO').toUpperCase();
  return slackPriorities.includes(value) ? value : 'INFO';
}

function normalizeType(type) {
  return slackNotificationTypes.includes(type) ? type : 'High Priority Alert';
}

function normalizePayload(payload = {}) {
  return {
    type: normalizeType(payload.type),
    priority: normalizePriority(payload.priority),
    reference: payload.reference || payload.referenceId || 'GOPU-OS',
    buyer: payload.buyer || payload.company || payload.vendor || '',
    status: payload.status || 'Monitoring',
    eta: payload.eta || '',
    actionRequired: payload.actionRequired || payload.nextAction || 'Review in GOPU OS.',
    source: payload.source || 'GOPU OS',
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

export function getSlackNotificationActivity() {
  if (!canUseStorage()) return seedActivity;
  const rows = safeJsonParse(window.localStorage.getItem(activityKey), []);
  return Array.isArray(rows) && rows.length ? rows : seedActivity;
}

function recordSlackNotification(alert, status, note = '') {
  const record = {
    id: `slack-alert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: alert.type,
    reference: alert.reference,
    status,
    priority: alert.priority,
    timestamp: new Date().toISOString(),
    note
  };
  if (canUseStorage()) {
    const rows = getSlackNotificationActivity().filter((item) => !String(item.id).startsWith('slack-seed-'));
    window.localStorage.setItem(activityKey, JSON.stringify([record, ...rows].slice(0, 20)));
    window.dispatchEvent(new CustomEvent('gopu:slack-notification-activity', { detail: record }));
  }
  return record;
}

export async function sendSlackNotification(payload = {}) {
  const alert = normalizePayload(payload);
  try {
    const response = await fetch('/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    const result = await response.json().catch(() => ({}));
    const status = result.ok ? 'Sent' : result.status === 'not_configured' ? 'Provider Not Connected' : 'Failed';
    return { ok: Boolean(result.ok), data: recordSlackNotification(alert, status, result.message || ''), error: null };
  } catch (error) {
    console.error('[slack] notification request failed', {
      type: alert.type,
      reference: alert.reference,
      message: error?.message || 'Unknown Slack request failure'
    });
    return { ok: false, data: recordSlackNotification(alert, 'Failed', 'Slack request failed safely.'), error };
  }
}
