import { demoTenantId } from './demoData.js';
import { backendStatus } from '../lib/supabaseClient.js';
import { createTaskFromWorkflow } from './taskService.js';
import { getWorkflowDependencyEngineData, runDependencyScan } from './workflowDependencyService.js';

const demoDelay = 0;
const generatedJourneyEvents = new Set();

function wait() {
  return new Promise((resolve) => setTimeout(resolve, demoDelay));
}

const journeyTemplates = [
  {
    id: 'mwf-uae-black-pepper-001',
    workflow_type: 'UAE Black Pepper Export Journey',
    buyer: 'Gulf Foods LLC',
    country: 'UAE',
    products: 'Black pepper',
    quantity: '12 MT',
    shipment_type: 'CIF Jebel Ali',
    current_stage: 'Invoice Validation',
    owner: 'COO Command',
    shipment_id: 'SHP-UAE-001',
    relatedWorkflowIds: [
      'pricing-gx-qtn-1042',
      'invoice-gopu-draft-001',
      'shipment-uae-001',
      'warehouse-bp-2401',
      'supplier-malabar-confirmation'
    ]
  }
];

const stageBlueprint = [
  ['Lead Created', 'Ready', 'CMO Command', '/export-os/buyer-crm', 'Buyer enquiry captured and ready for verification.'],
  ['Buyer Verification', 'Review Required', 'COO + CMO', '/export-os/customer-verification', 'Confirm buyer completeness, duplicate risk, and communication consistency.'],
  ['Pricing Requested', 'In Progress', 'CFO Command', '/export-os/pricing-engine', 'Commercial pricing has started and requires full cost inputs.'],
  ['CFO Review', 'Review Required', 'CFO Command', '/export-os/executives/cfo', 'Margin, freight, FX, and payment terms require CFO control.'],
  ['Founder Approval', 'Approval Required', 'Founder', '/export-os/director', 'Founder approval is required for low-margin, high-risk, or release actions.'],
  ['Quotation Drafted', 'Ready', 'CFO + CMO', '/export-os/pricing-engine', 'Quote can remain draft-only until approvals and validations pass.'],
  ['Buyer Follow-up', 'In Progress', 'COO Command', '/export-os/tasks', 'COO follow-up task required before order confirmation.'],
  ['Order Confirmed', 'Review Required', 'COO Command', '/export-os/director', 'Order confirmation remains advisory until approval and buyer confirmation are recorded.'],
  ['Invoice Drafted', 'In Progress', 'CFO Command', '/export-os/invoices/new', 'LUT export invoice draft created from Master Data snapshot.'],
  ['Invoice Validation', 'Blocked', 'CFO + Founder', '/export-os/invoices/new', 'Invoice release blocked until LUT, HSN/origin, pricing approval, and founder approval pass.'],
  ['Packing Started', 'Delayed', 'Operations', '/export-os/warehouse', 'Packing cannot progress fully until batch reservation and supplier confirmation are complete.'],
  ['QC Review', 'Review Required', 'Operations', '/export-os/warehouse', 'QC, moisture, and buyer-specific review should be completed before dispatch readiness.'],
  ['Shipment Planning', 'Blocked', 'COO Command', '/export-os/shipments/SHP-UAE-001', 'Shipment planning depends on invoice approval, documents, packing, supplier, and CHA readiness.'],
  ['Container Booking', 'Ready', 'COO Command', '/export-os/shipments/SHP-UAE-001', 'Container booking should be prepared after invoice and packing readiness.'],
  ['CHA Coordination', 'Review Required', 'COO Command', '/export-os/shipments/SHP-UAE-001', 'CHA coordination should start before release-sensitive documentation steps.'],
  ['Dispatch Ready', 'Blocked', 'COO Command', '/export-os/shipments/SHP-UAE-001', 'Dispatch cannot proceed until invoice, documents, stock, packing, and supplier checks pass.'],
  ['Shipment Released', 'Approval Required', 'Founder + COO', '/export-os/director', 'Release remains blocked until founder approval and operational dependencies are complete.'],
  ['In Transit', 'Ready', 'COO Command', '/export-os/shipments/SHP-UAE-001', 'Do not claim in transit until backend shipment confirmation exists.'],
  ['Delivered', 'Completed', 'COO Command', '/export-os/shipments', 'Delivery must be confirmed by backend shipment evidence.']
];

function statusToScore(status) {
  if (status === 'Completed' || status === 'Ready') return 1;
  if (status === 'In Progress') return 0.7;
  if (status === 'Review Required' || status === 'Approval Required') return 0.45;
  if (status === 'Delayed') return 0.25;
  if (status === 'Blocked' || status === 'Escalated') return 0.1;
  return 0.35;
}

function healthFromPercent(percent) {
  if (percent >= 85) return 'Healthy';
  if (percent >= 70) return 'Monitoring';
  if (percent >= 55) return 'Attention';
  if (percent >= 38) return 'High Risk';
  return 'Critical';
}

function buildEvent(template, stage, index, dependencyMap) {
  const [stage_name, status, owner, linked_route, note] = stage;
  const linkedDependency = dependencyMap.get(stage_name) || dependencyMap.get(owner) || null;
  const blocker = status === 'Blocked'
    ? linkedDependency?.blocker_reason || `${stage_name} has unresolved dependency blockers.`
    : linkedDependency?.status === 'Failed'
      ? `${linkedDependency.dependency_name} requires review.`
      : '';
  return {
    id: `${template.id}-event-${index + 1}`,
    workflow_id: template.id,
    stage_name,
    status,
    owner,
    timestamp: new Date(Date.now() - (stageBlueprint.length - index) * 3600000).toISOString(),
    blocker,
    approvals: status === 'Approval Required' ? ['Director Command Center'] : stage_name.includes('CFO') ? ['CFO Review'] : [],
    linked_documents: ['Invoice Validation', 'Quotation Drafted', 'Shipment Released'].includes(stage_name) ? ['Export Invoice Draft', 'Quote Draft', 'Buyer Release Package'] : [],
    linked_tasks: blocker ? [`Resolve ${stage_name}`] : [],
    next_action: blocker || note,
    escalation_state: status === 'Blocked' || status === 'Escalated' ? 'Escalate to owner command' : 'Monitoring',
    linked_route,
    linked_record: linkedDependency?.linked_record_id || template.shipment_id
  };
}

function buildMasterWorkflow(template, dependencyWorkflows) {
  const related = dependencyWorkflows.filter((workflow) => template.relatedWorkflowIds.includes(workflow.id));
  const blockers = related.flatMap((workflow) => workflow.blockers);
  const dependencyMap = new Map();
  related.forEach((workflow) => {
    workflow.dependencies.forEach((dependency) => {
      dependencyMap.set(dependency.dependency_name, dependency);
      dependencyMap.set(workflow.owner, dependency);
    });
  });
  blockers.forEach((blocker) => dependencyMap.set(blocker.workflow_type, blocker));

  const timeline = stageBlueprint.map((stage, index) => buildEvent(template, stage, index, dependencyMap));
  const completion = timeline.length ? Math.round((timeline.reduce((sum, event) => sum + statusToScore(event.status), 0) / timeline.length) * 100) : 0;
  const dependencyCompletion = related.length ? Math.round(related.reduce((sum, workflow) => sum + workflow.health.dependencyCompletion, 0) / related.length) : 0;
  const approvalCompletion = timeline.length ? Math.round((timeline.filter((event) => event.status !== 'Approval Required').length / timeline.length) * 100) : 0;
  const shipmentReadiness = Math.round((timeline.filter((event) => ['Shipment Planning', 'Container Booking', 'CHA Coordination', 'Dispatch Ready', 'Shipment Released'].includes(event.stage_name) && event.status !== 'Blocked').length / 5) * 100);
  const documentationReadiness = Math.round((timeline.filter((event) => ['Invoice Drafted', 'Invoice Validation', 'QC Review', 'Shipment Released'].includes(event.stage_name) && event.status !== 'Blocked').length / 4) * 100);
  const risk_level = blockers.some((blocker) => blocker.severity === 'Critical') ? 'Critical' : healthFromPercent(Math.min(completion, dependencyCompletion));

  return {
    ...template,
    tenant_id: demoTenantId,
    operational_health: healthFromPercent(completion),
    risk_level,
    created_at: new Date().toISOString(),
    related,
    blockers,
    timeline,
    scores: {
      workflowCompletion: completion,
      dependencyCompletion,
      approvalCompletion,
      shipmentReadiness,
      documentationReadiness
    },
    executiveNotes: [
      ['COO', 'Resolve invoice, supplier, and dispatch blockers before buyer-facing shipment commitment.', blockers.length ? 'High' : 'Monitoring'],
      ['CFO', 'Do not release quote or invoice until margin, freight, and approval gates are complete.', blockers.some((blocker) => blocker.workflow_type === 'Pricing' || blocker.workflow_type === 'Invoice') ? 'High' : 'Monitoring'],
      ['CTO', 'Monitor workflow automation and notification generation; no external execution is claimed.', 'Monitoring'],
      ['CMO', 'Keep buyer communication in draft/review until approvals pass.', 'Attention'],
      ['CIO', 'UAE black pepper opportunity remains strategically useful if operational risk is controlled.', 'Medium']
    ],
    communicationTimeline: [
      ['Quotation Draft', 'Draft', 'CFO + CMO', 'Buyer-facing quote remains draft-only until approval gates pass.'],
      ['Invoice Email', 'Blocked', 'CFO Command', 'Final PDF and buyer email blocked before invoice approval.'],
      ['Shipment Update', 'Review Required', 'COO Command', 'Prepare update only after dispatch readiness is validated.'],
      ['Supplier Coordination', 'In Progress', 'COO Command', 'Supplier confirmation follow-up is required today.'],
      ['Founder Summary', 'Ready', 'COO Command', 'Founder summary can be prepared as internal preview only.']
    ],
    approvalTimeline: [
      ['Quote approval', 'Approval Required', 'Founder / CFO'],
      ['Invoice release approval', 'Approval Required', 'Founder'],
      ['Shipment risk approval', 'Review Required', 'Founder / COO'],
      ['Payment approval', 'Monitoring', 'CFO / Founder if required'],
      ['Revision requests', 'Monitoring', 'Director Queue']
    ],
    shipmentTimeline: [
      ['Packing', 'Delayed', 'Warehouse Ops'],
      ['QC', 'Review Required', 'Operations'],
      ['Dispatch', 'Blocked', 'COO Command'],
      ['Container booking', 'Ready', 'COO Command'],
      ['CHA coordination', 'Review Required', 'COO Command'],
      ['ETA placeholder', 'Monitoring', 'Logistics']
    ]
  };
}

export async function getWorkflowJourneyDashboard() {
  await wait();
  const dependencyEngine = await getWorkflowDependencyEngineData();
  const workflows = journeyTemplates.map((template) => buildMasterWorkflow(template, dependencyEngine.data.workflows));
  const timelineEvents = workflows.flatMap((workflow) => workflow.timeline);
  return {
    ok: true,
    backend: backendStatus,
    data: {
      workflows,
      timelineEvents,
      summary: {
        workflowCount: workflows.length,
        blockedStages: timelineEvents.filter((event) => event.status === 'Blocked').length,
        approvalsRequired: timelineEvents.filter((event) => event.status === 'Approval Required').length,
        averageHealth: workflows.length ? Math.round(workflows.reduce((sum, workflow) => sum + workflow.scores.workflowCompletion, 0) / workflows.length) : 0,
        nextAction: 'Open blocked stages, resolve dependency tasks, and rerun journey scan before buyer-facing release.'
      }
    },
    error: null
  };
}

export async function getMasterWorkflowById(workflowId) {
  const dashboard = await getWorkflowJourneyDashboard();
  const workflow = dashboard.data.workflows.find((item) => item.id === workflowId) || dashboard.data.workflows[0];
  return {
    ok: true,
    backend: backendStatus,
    data: workflow,
    error: null
  };
}

export async function generateTimelineTasksAndAlerts(workflowId, tenantId = demoTenantId) {
  const workflowResponse = await getMasterWorkflowById(workflowId);
  const workflow = workflowResponse.data;
  const createdTasks = [];
  const createdAlerts = [];
  for (const event of workflow.timeline.filter((item) => ['Blocked', 'Approval Required', 'Delayed'].includes(item.status))) {
    if (!generatedJourneyEvents.has(event.id)) {
      generatedJourneyEvents.add(event.id);
      const task = await createTaskFromWorkflow({
        tenant_id: tenantId,
        title: `Journey action: ${event.stage_name}`,
        description: event.next_action,
        workflow_source: 'Operational Timeline',
        linked_record_id: workflow.id,
        linked_label: workflow.buyer,
        linked_route: event.linked_route,
        department: event.owner,
        owner_command: event.owner,
        assigned_role: event.owner,
        priority: event.status === 'Blocked' ? 'Critical' : event.status === 'Approval Required' ? 'High' : 'Medium',
        status: event.status === 'Approval Required' ? 'Waiting Founder Approval' : 'Blocked',
        due_date: 'Today',
        escalation_level: event.escalation_state,
        blocking_reason: event.blocker || event.next_action,
        next_action: event.next_action
      });
      createdTasks.push(task.data);
      createdAlerts.push({
        id: `timeline-alert-${event.id}`,
        severity: event.status === 'Blocked' ? 'Critical' : 'Attention',
        title: `${workflow.buyer}: ${event.stage_name}`,
        message: event.next_action,
        source_module: 'Operational Timeline',
        linked_route: event.linked_route,
        status: 'Review Required'
      });
    }
  }
  await runDependencyScan(tenantId);
  return {
    ok: true,
    backend: backendStatus,
    data: {
      workflow,
      createdTasks,
      createdAlerts,
      message: createdTasks.length
        ? `${createdTasks.length} timeline task(s) and ${createdAlerts.length} alert(s) generated.`
        : 'Timeline scan complete. Existing journey tasks already created in this session.'
    },
    error: null
  };
}
