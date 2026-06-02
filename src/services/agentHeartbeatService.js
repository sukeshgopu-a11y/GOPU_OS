import { demoTenantId } from './demoData.js';

const tomorrow = '2026-06-02';

export const agentHeartbeatJobs = Object.freeze([
  {
    id: 'slack-lead-sync',
    agent: 'COO',
    label: 'Slack lead intake sync',
    cadence: 'Every 5 minutes',
    endpoint: '/api/slack/sync-leads',
    route: '/export-os/leads',
    status: 'Active',
    purpose: 'Convert Slack lead messages into COO lead intake records.'
  },
  {
    id: 'cfo-market-prices',
    agent: 'CFO',
    label: 'APEDA/Spice Board market-rate refresh',
    cadence: 'Daily 8:00 AM IST',
    endpoint: '/api/cron/morning-price-fetch',
    route: '/export-os/executives/cfo',
    status: 'Active',
    purpose: 'Refresh CFO commodity prices for every configured export product.'
  },
  {
    id: 'cmo-social-trigger',
    agent: 'CMO',
    label: 'CMO content schedule trigger',
    cadence: 'Every 10 minutes',
    endpoint: '/api/cron/daily-social-trigger',
    route: '/export-os/executives/cmo',
    status: 'Approval gated',
    purpose: 'Queue content only after Founder/Director approval is present.'
  },
  {
    id: 'cmo-followup-email',
    agent: 'CMO',
    label: 'Buyer follow-up email check',
    cadence: 'Daily 10:00 AM IST',
    endpoint: '/api/cmo/email/followup-check',
    route: '/export-os/buyer-crm',
    status: 'Active',
    purpose: 'Send due buyer follow-ups and report activity to Slack.'
  },
  {
    id: 'cto-credit-health',
    agent: 'CTO',
    label: 'Provider credit/API health check',
    cadence: 'Daily 9:30 AM IST',
    endpoint: '/api/cron/cto-credit-check',
    route: '/export-os/executives/cto',
    status: 'Active',
    purpose: 'Check API credits, integration health, and production risk.'
  },
  {
    id: 'director-briefings',
    agent: 'Director',
    label: 'Founder operating briefings',
    cadence: '9 AM, 2 PM, 9 PM IST',
    endpoint: '/api/cron/briefing-9am + /api/cron/briefing-2pm + /api/cron/briefing-9pm',
    route: '/export-os/director',
    status: 'Active',
    purpose: 'Summarize leads, approvals, payments, shipments, CMO, CTO, and open risks.'
  }
]);

export const agentLinkMap = Object.freeze([
  ['Website/Slack/WhatsApp Lead', 'COO Lead Intake', '/export-os/leads'],
  ['COO Lead Intake', 'CFO Pricing', '/export-os/executives/cfo'],
  ['CFO Pricing', 'Director Approval', '/export-os/director'],
  ['Director Approval', 'Proforma Invoice + Buyer Email', '/export-os/coo/leads/demo-sukesh-turmeric-australia'],
  ['Proforma Invoice', 'CFO Payment Vault', '/export-os/payment-vault'],
  ['Payment Confirmed', 'COO Documents/Certificates', '/export-os/document-factory'],
  ['Documents Ready', 'COO Shipment Booking', '/export-os/shipments'],
  ['CMO Content', 'Director Approval Before Publish', '/export-os/executives/cmo'],
  ['CTO Health', 'All Agent Automation Safety', '/export-os/executives/cto']
]);

export const tomorrowReminders = Object.freeze([
  {
    id: 'dns-os-domain',
    dueDate: tomorrow,
    owner: 'CTO',
    title: 'Fix os.gopuexports.com DNS',
    route: '/export-os/executives/cto',
    status: 'Tomorrow'
  },
  {
    id: 'canva-template-ids',
    dueDate: tomorrow,
    owner: 'CMO + CTO',
    title: 'Confirm Canva template IDs in production config',
    route: '/export-os/executives/cmo',
    status: 'Tomorrow'
  }
]);

export function getAgentHeartbeatSummary(tenantId = demoTenantId) {
  const byAgent = agentHeartbeatJobs.reduce((acc, job) => {
    acc[job.agent] = (acc[job.agent] || 0) + 1;
    return acc;
  }, {});

  return {
    tenantId,
    mode: 'Vercel cron + webhook heartbeat',
    generatedAt: new Date().toISOString(),
    totalJobs: agentHeartbeatJobs.length,
    byAgent,
    jobs: agentHeartbeatJobs,
    links: agentLinkMap,
    reminders: tomorrowReminders
  };
}
