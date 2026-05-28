import { backendStatus, checkSupabaseConnection, supabaseConfigStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { integrationAuditLogService, integrationService as integrationTableService } from './monitoringService.js';

export const integrationFallbackServices = [];

const vercelFallbackIntegration = {
  id: 'vercel',
  service_name: 'Vercel',
  environment: 'Production',
  masked_key: 'token_****server',
  status: 'Backend Verification Required',
  usage_percentage: 0,
  quota_remaining: 'Set VERCEL_TOKEN server-side or deploy on Vercel runtime',
  last_verified: 'Pending CTO check',
  health_status: 'Monitoring',
  request_volume: 'No Vercel API check yet',
  last_request: 'Not verified',
  estimated_exhaustion: 'N/A',
  connection_message: 'Vercel must be verified from a backend route. Never paste a Vercel token into the browser.'
};

function supabaseIntegrationFromCheck(connection) {
  return {
    id: 'supabase',
    service_name: 'Supabase',
    environment: supabaseConfigStatus.projectRef ? `Project ${supabaseConfigStatus.projectRef}` : 'Production',
    masked_key: supabaseConfigStatus.hasAnonKey ? 'anon_****configured' : 'anon_****missing',
    status: connection.status,
    usage_percentage: connection.live ? 46 : 0,
    quota_remaining: connection.live ? 'Live Data API responding' : connection.message,
    last_verified: connection.lastChecked,
    health_status: connection.health,
    request_volume: connection.live ? 'Live query verified' : 'No live query',
    last_request: connection.live ? 'Just checked' : 'Not connected',
    estimated_exhaustion: connection.live ? 'Stable' : 'N/A',
    connection_message: connection.message
  };
}

async function getVercelIntegrationStatus() {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const response = await fetch('/api/integrations/vercel/status', {
      cache: 'no-store',
      signal: controller.signal
    });
    window.clearTimeout(timeout);
    if (!response.ok) return vercelFallbackIntegration;
    const row = await response.json();
    return { ...vercelFallbackIntegration, ...row, id: 'vercel', service_name: 'Vercel' };
  } catch (error) {
    return {
      ...vercelFallbackIntegration,
      status: 'Backend Verification Required',
      last_verified: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      last_request: error?.name === 'AbortError' ? 'Vercel status check timed out under 8 seconds' : 'Vercel status endpoint unavailable',
      connection_message: 'Start the local integration server or deploy the /api/integrations/vercel/status route, then configure VERCEL_TOKEN server-side.'
    };
  }
}

export const integrationFallbackAudit = [
];

export async function getIntegrations(tenantId = demoTenantId) {
  const [result, supabaseConnection, vercelStatus] = await Promise.all([
    integrationTableService.list({ tenant_id: tenantId }),
    checkSupabaseConnection(),
    getVercelIntegrationStatus()
  ]);
  const sourceRows = result.backend?.mode === 'Connected' && result.ok ? (result.data || []) : [];
  const supabaseRow = supabaseIntegrationFromCheck(supabaseConnection);
  const rowsWithSupabase = sourceRows.some((row) => row.id === 'supabase')
    ? sourceRows.map((row) => row.id === 'supabase' ? { ...row, ...supabaseRow } : row)
    : [supabaseRow, ...sourceRows];
  const rows = rowsWithSupabase.some((row) => row.id === 'vercel')
    ? rowsWithSupabase.map((row) => row.id === 'vercel' ? { ...row, ...vercelStatus } : row)
    : [...rowsWithSupabase, vercelStatus];
  return { ok: true, data: rows, error: null, backend: result.backend || backendStatus };
}

export async function verifyIntegration(serviceId, status = 'Verification Success') {
  return {
    ok: true,
    backend: backendStatus,
    data: {
      id: serviceId,
      status: status === 'Verification Success' ? 'Connected' : 'Verification Pending',
      health_status: status === 'Verification Success' ? 'Healthy' : 'Monitoring',
      last_verified: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }
  };
}

export async function getIntegrationAudit(tenantId = demoTenantId) {
  const result = await integrationAuditLogService.list({ tenant_id: tenantId });
  const rows = result.backend?.mode === 'Connected' ? (result.data || []) : (result.data?.length ? result.data : integrationFallbackAudit);
  return { ok: true, data: rows, error: null, backend: result.backend || backendStatus };
}
