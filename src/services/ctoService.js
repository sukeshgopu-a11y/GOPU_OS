import { backendStatus, checkSupabaseConnection } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { sendSlackNotification } from './slackNotificationService.js';
import { createTaskFromWorkflow } from './taskService.js';
import { getIntegrations } from './integrationService.js';
import { automationQueueService, platformHealthService, technicalIncidentService } from './monitoringService.js';

const platformHealthFallback = [];

const apiHealthFallback = [];

const automationQueueFallback = [];

const incidentFallback = [];

const subscriptionWatchFallback = [];

const deploymentStatusFallback = [];

const architectureMapFallback = [];

const technicalAuditFallback = [];

const cmoMediaStackFallback = [];

const cmoSocialIntegrationFallback = [];

const cmoPublishingWorkflowFallback = [];

function liveRows(result, fallback = []) {
  return result.backend?.mode === 'Connected' ? (result.data || []) : [];
}

function staticRows(fallback = []) {
  return [];
}

export async function getPlatformHealth(tenantId = demoTenantId) {
  const result = await platformHealthService.list({ tenant_id: tenantId });
  return { ok: true, backend: result.backend || backendStatus, data: liveRows(result, platformHealthFallback) };
}

export async function getApiHealth() {
  const supabaseConnection = await checkSupabaseConnection();
  const rows = [{
    id: 'api-health-supabase',
    service: 'Supabase',
    status: supabaseConnection.status,
    latency: supabaseConnection.live ? 'Verified' : 'N/A',
    failures: supabaseConnection.live ? 0 : 1,
    last_success: supabaseConnection.live ? supabaseConnection.lastChecked : 'Not connected',
    recommended_action: supabaseConnection.live ? 'Supabase is live. Keep RLS and tenant filters active.' : supabaseConnection.message
  }];
  return { ok: true, backend: backendStatus, data: rows };
}

export async function getAutomationQueue(tenantId = demoTenantId) {
  const result = await automationQueueService.list({ tenant_id: tenantId });
  return { ok: true, backend: result.backend || backendStatus, data: liveRows(result, automationQueueFallback) };
}

export async function getIncidents(tenantId = demoTenantId) {
  const result = await technicalIncidentService.list({ tenant_id: tenantId });
  return { ok: true, backend: result.backend || backendStatus, data: liveRows(result, incidentFallback) };
}

export async function createIncident(payload = {}) {
  return { ok: true, backend: backendStatus, data: { id: `incident-created-${Date.now()}`, status: 'Attention', ...payload, created_at: new Date().toISOString() } };
}

export async function createPaymentRequirement(payload = {}) {
  const result = await createTaskFromWorkflow({
    tenant_id: payload.tenant_id || demoTenantId,
    title: payload.title || 'Create payment requirement for infrastructure renewal',
    description: 'CTO detected technical renewal/credit need. CTO does not execute payment.',
    workflow_source: 'CTO Command',
    linked_record_id: payload.linked_record_id || 'PAYMENT-REQ-TECH',
    linked_label: payload.vendor || 'Infrastructure vendor',
    linked_route: '/export-os/payment-vault',
    department: 'Technical / Finance',
    owner_command: 'CTO Command',
    assigned_role: 'CTO',
    priority: payload.priority || 'High',
    status: 'Waiting Review',
    due_date: 'Today',
    blocking_reason: payload.reason || 'Credit/renewal risk detected.',
    next_action: 'COO confirms operational need, CFO validates and executes, Founder approves/owns OTP if required.',
    buyer: payload.vendor || 'Infrastructure vendor',
    product: payload.category || 'Trusted infrastructure'
  });
  await sendSlackNotification({
    type: payload.expired ? 'Renewal Expired' : 'Renewal Expiring Soon',
    priority: payload.priority === 'Critical' || payload.expired ? 'URGENT' : 'WARNING',
    reference: result.data?.id || payload.linked_record_id || 'PAYMENT-REQ-TECH',
    buyer: payload.vendor || 'Infrastructure vendor',
    status: result.data?.status || 'Waiting Review',
    eta: payload.due_date || 'Today',
    actionRequired: payload.reason || 'CFO validates renewal need and executes through tokenized Payment Vault if approved.',
    source: 'CTO Command'
  });
  return result;
}

export async function getSubscriptionWatch() {
  return { ok: true, backend: backendStatus, data: staticRows(subscriptionWatchFallback) };
}

export async function getDeploymentStatus() {
  return { ok: true, backend: backendStatus, data: staticRows(deploymentStatusFallback) };
}

export async function getArchitectureMap() {
  return { ok: true, backend: backendStatus, data: staticRows(architectureMapFallback) };
}

export async function getTechnicalAuditLog() {
  return { ok: true, backend: backendStatus, data: staticRows(technicalAuditFallback) };
}

export async function getCMOMediaStack() {
  return { ok: true, backend: backendStatus, data: staticRows(cmoMediaStackFallback) };
}

export async function getCMOSocialIntegrations() {
  return { ok: true, backend: backendStatus, data: staticRows(cmoSocialIntegrationFallback) };
}

export async function getCMOPublishingWorkflow() {
  return { ok: true, backend: backendStatus, data: staticRows(cmoPublishingWorkflowFallback) };
}

export async function getCTODashboard(tenantId = demoTenantId) {
  const [health, integrations, apiHealth, automationQueue, incidents, subscriptionWatch, deploymentStatus, architectureMap, auditLog, cmoMediaStack, cmoSocialIntegrations, cmoPublishingWorkflow, supabaseConnection] = await Promise.all([
    getPlatformHealth(tenantId),
    getIntegrations(tenantId),
    getApiHealth(),
    getAutomationQueue(tenantId),
    getIncidents(tenantId),
    getSubscriptionWatch(),
    getDeploymentStatus(),
    getArchitectureMap(),
    getTechnicalAuditLog(),
    getCMOMediaStack(),
    getCMOSocialIntegrations(),
    getCMOPublishingWorkflow(),
    checkSupabaseConnection()
  ]);
  return {
    ok: true,
    backend: backendStatus,
    data: {
      health: health.data,
      integrations: backendStatus.mode === 'Connected' ? (integrations.data || []) : (integrations.data || []),
      apiHealth: apiHealth.data,
      automationQueue: automationQueue.data,
      incidents: incidents.data,
      subscriptionWatch: subscriptionWatch.data,
      deploymentStatus: deploymentStatus.data,
      architectureMap: architectureMap.data,
      auditLog: auditLog.data,
      cmoMediaStack: cmoMediaStack.data,
      cmoSocialIntegrations: cmoSocialIntegrations.data,
      cmoPublishingWorkflow: cmoPublishingWorkflow.data,
      supabaseConnection,
      summary: {
        activeIncidents: incidents.data.filter((item) => ['High', 'Critical'].includes(item.severity)).length,
        failedWorkflows: automationQueue.data.filter((item) => ['Failed', 'Retry Pending', 'Attention'].includes(item.queue_status || item.status)).length,
        creditRisks: subscriptionWatch.data.filter((item) => item.usage >= 70).length,
        cmoIntegrationReadiness: cmoMediaStack.data.filter((item) => ['Setup Required', 'Not Connected'].includes(item.status)).length
      }
    }
  };
}

export async function generateFounderTechnicalSummary(tenantId = demoTenantId) {
  const dashboard = await getCTODashboard(tenantId);
  const { summary } = dashboard.data;
  return {
    ok: true,
    backend: backendStatus,
    data: [
      '1. Platform status: Core app routes are monitoring; backend fallback remains active if env vars are missing.',
      `2. Active incidents: ${summary.activeIncidents} high/critical technical items require CTO review.`,
      `3. Failed workflows: ${summary.failedWorkflows} workflow or retry queues need controlled action.`,
      `4. Credit/subscription risks: ${summary.creditRisks} services are above attention thresholds.`,
      `5. CMO media stack readiness: ${summary.cmoIntegrationReadiness} media/design/scheduling items still need setup before live publishing.`,
      '6. Payment renewal requirements: CTO may create requirements only; COO validates need, CFO pays, Founder owns OTP/approval.',
      '7. CTO recommendations: connect provider records before claiming external publishing or analytics.',
      '8. Escalations needed: founder attention if credits, deployment, public workflow reliability, or AI/avatar use affects buyer-facing operations.'
    ].join('\n')
  };
}
