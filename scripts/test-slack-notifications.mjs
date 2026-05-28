import fs from 'node:fs';
import path from 'node:path';

function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const target = path.resolve(process.cwd(), file);
    if (!fs.existsSync(target)) continue;
    const rows = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    for (const row of rows) {
      const match = row.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

function isValidSlackWebhook(url = '') {
  return /^https:\/\/hooks\.slack(?:-gov)?\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9_-]+$/i.test(url);
}

function formatSlackText(alert) {
  return [
    '━━━━━━━━━━━━━━',
    'GOPU OS ALERT',
    '',
    `Priority: ${alert.priority}`,
    `Type: ${alert.type}`,
    `Reference: ${alert.reference}`,
    `Buyer: ${alert.buyer}`,
    `Status: ${alert.status}`,
    `ETA: ${alert.eta}`,
    '',
    'Action Required:',
    alert.actionRequired,
    '━━━━━━━━━━━━━━'
  ].join('\n');
}

async function sendTestAlert(webhookUrl, alert) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: formatSlackText(alert) })
  });
  const responseText = await response.text().catch(() => '');
  if (!response.ok || responseText.trim() !== 'ok') {
    throw new Error(`Slack test failed for ${alert.type}: HTTP ${response.status}`);
  }
  return { type: alert.type, reference: alert.reference, status: 'sent' };
}

loadLocalEnv();
const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim() || '';

if (!webhookUrl || webhookUrl === 'NEW_REAL_WEBHOOK') {
  console.error('[slack:test] SLACK_WEBHOOK_URL is not configured with a real webhook value.');
  process.exit(1);
}

if (!isValidSlackWebhook(webhookUrl)) {
  console.error('[slack:test] SLACK_WEBHOOK_URL is not a valid Slack incoming webhook URL.');
  process.exit(1);
}

const alerts = [
  {
    type: 'New Shipment Created',
    priority: 'INFO',
    reference: 'GOPU-SHIP-TEST-20260527-0001',
    buyer: 'ABC Imports',
    status: 'Order Confirmed',
    eta: '2026-06-05',
    actionRequired: 'Monitor customs clearance and keep buyer update ready.'
  },
  {
    type: 'Founder Approval Required',
    priority: 'URGENT',
    reference: 'GOPU-APPROVAL-TEST-20260527',
    buyer: 'Founder Office',
    status: 'Waiting Founder Approval',
    eta: 'Today',
    actionRequired: 'Founder must approve, reject, request revision, or escalate.'
  },
  {
    type: 'Renewal Expiring Soon',
    priority: 'WARNING',
    reference: 'GOPU-RENEWAL-TEST-20260527',
    buyer: 'Payment Vault',
    status: 'Renewal Review Required',
    eta: '7 days',
    actionRequired: 'CFO should review renewal status and route founder approval if required.'
  }
];

try {
  const results = [];
  for (const alert of alerts) {
    results.push(await sendTestAlert(webhookUrl, alert));
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} catch (error) {
  console.error('[slack:test] notification failed safely', {
    message: error?.message || 'Unknown Slack test failure'
  });
  process.exit(1);
}
