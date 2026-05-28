import { createTableService } from './serviceHelpers.js';

export const platformHealthService = createTableService('platform_health');
export const integrationService = createTableService('integration_services');
export const integrationAuditLogService = createTableService('integration_audit_logs');
export const automationQueueService = createTableService('automation_queue');
export const technicalIncidentService = createTableService('technical_incidents');

export async function loadMonitoringWorkspace() {
  const [health, integrations, audits, automations, incidents] = await Promise.all([
    platformHealthService.list(),
    integrationService.list(),
    integrationAuditLogService.list(),
    automationQueueService.list(),
    technicalIncidentService.list()
  ]);

  return { health, integrations, audits, automations, incidents };
}
