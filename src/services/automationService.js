import { backendStatus } from '../lib/supabaseClient.js';
import { demoData, demoTenantId } from './demoData.js';
import { createTableService } from './serviceHelpers.js';

const timestamp = () => new Date().toISOString();

export const workflowAutomationService = createTableService('workflow_automations', demoData.workflow_automations);
export const workflowEventService = createTableService('workflow_events', demoData.workflow_events);
export const automationLogService = createTableService('automation_logs', demoData.automation_logs);
export const automationFailureService = createTableService('automation_failures', demoData.automation_failures);
export const automationRuleService = createTableService('automation_rules', demoData.automation_rules);
export const workflowMemoryService = createTableService('workflow_memory', demoData.workflow_memory);

export async function loadAutomationCenter(tenantId = demoTenantId) {
  const [automations, events, logs, failures, rules, memory] = await Promise.all([
    workflowAutomationService.list({ tenant_id: tenantId }),
    workflowEventService.list({ tenant_id: tenantId }),
    automationLogService.list({ tenant_id: tenantId }),
    automationFailureService.list({ tenant_id: tenantId }),
    automationRuleService.list({ tenant_id: tenantId }),
    workflowMemoryService.list({ tenant_id: tenantId })
  ]);

  return {
    ok: true,
    data: {
      automations: automations.data || [],
      events: events.data || [],
      logs: logs.data || [],
      failures: failures.data || [],
      rules: rules.data || [],
      memory: memory.data || []
    },
    error: automations.error || events.error || logs.error || failures.error || rules.error || memory.error || null,
    backend: backendStatus
  };
}

export function createAutomationLogEntry(workflowName, status = 'Monitoring', affectedModule = 'Automation Center') {
  return {
    id: `log-${Date.now()}`,
    tenant_id: demoTenantId,
    workflow_name: workflowName,
    execution_time: timestamp(),
    status,
    retry_count: status === 'Retrying' ? 1 : 0,
    failure_reason: status === 'Failed' ? 'Failure state created for review.' : null,
    affected_module: affectedModule,
    created_at: timestamp()
  };
}
