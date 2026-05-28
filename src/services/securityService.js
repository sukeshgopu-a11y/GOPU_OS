import { backendStatus } from '../lib/supabaseClient.js';
import { demoData, demoTenantId } from './demoData.js';
import { createTableService } from './serviceHelpers.js';

export const roleService = createTableService('roles', demoData.roles);
export const permissionService = createTableService('permissions', demoData.permissions);
export const userProfileService = createTableService('user_profiles', demoData.user_profiles);
export const userSessionService = createTableService('user_sessions', demoData.user_sessions);
export const securityIncidentService = createTableService('security_incidents', demoData.security_incidents);
export const securityAuditLogService = createTableService('security_audit_log', demoData.security_audit_log);

export async function loadSecurityDashboard(tenantId = demoTenantId) {
  const [roles, permissions, users, sessions, incidents, audit] = await Promise.all([
    roleService.list({ tenant_id: tenantId }),
    permissionService.list(),
    userProfileService.list({ tenant_id: tenantId }),
    userSessionService.list(),
    securityIncidentService.list({ tenant_id: tenantId }),
    securityAuditLogService.list({ tenant_id: tenantId })
  ]);

  return {
    ok: true,
    data: {
      roles: roles.data || [],
      permissions: permissions.data || [],
      users: users.data || [],
      sessions: sessions.data || [],
      incidents: incidents.data || [],
      audit: audit.data || []
    },
    error: roles.error || permissions.error || users.error || sessions.error || incidents.error || audit.error || null,
    backend: backendStatus
  };
}

export function createSecurityAuditEvent(action, module = 'Security', severity = 'Medium', notes = 'Governance event recorded locally.') {
  return {
    id: `security-audit-${Date.now()}`,
    tenant_id: demoTenantId,
    actor: 'Founder',
    action,
    module,
    severity,
    notes,
    created_at: new Date().toISOString()
  };
}
