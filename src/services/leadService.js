import { createTableService } from './serviceHelpers.js';
import { createAuditLog } from './auditService.js';

export const leadService = createTableService('lead_intake');
export const whatsappIntakeCommandService = createTableService('whatsapp_intake_commands');
export const leadWorkflowEventService = createTableService('lead_workflow_events');

export async function createLeadDraft(payload) {
  const result = await leadService.create({ ...payload, status: payload.status || 'Draft' });
  if (result.ok) {
    await createAuditLog({
      tenant_id: payload.tenant_id,
      action_type: 'Lead created',
      module: 'Lead Intake',
      related_table: 'lead_intake',
      related_record_id: result.data?.id,
      actor: payload.source || 'Director Command',
      description: `Lead created for ${payload.company_name || payload.buyer_name || 'new buyer enquiry'}.`,
      new_value: result.data || payload,
      risk_level: 'Low'
    });
  }
  return result;
}
