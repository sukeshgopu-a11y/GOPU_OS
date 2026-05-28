import { demoTenantId } from './demoData.js';
import { backendStatus } from '../lib/supabaseClient.js';
import { createTaskFromWorkflow } from './taskService.js';

const demoDelay = 70;
const scanCreated = new Set();

function wait() {
  return new Promise((resolve) => setTimeout(resolve, demoDelay));
}

const workflowDefinitions = [
  {
    id: 'pricing-gx-qtn-1042',
    workflowType: 'Pricing',
    title: 'Black pepper UAE quotation',
    owner: 'CFO Command',
    route: '/export-os/pricing-engine',
    stage: 'Pricing Review',
    dependencyChain: [
      ['buyer_exists', 'Buyer exists', 'Passed', 'COO Command'],
      ['product_selected', 'Product selected', 'Passed', 'CFO Command'],
      ['quantity_valid', 'Quantity valid', 'Passed', 'CFO Command'],
      ['incoterm_selected', 'Incoterm selected', 'Passed', 'CFO Command'],
      ['freight_estimate', 'Freight estimate available', 'Failed', 'CFO Command'],
      ['margin_calculated', 'Margin calculated', 'Passed', 'CFO Command'],
      ['approval_thresholds', 'Approval thresholds checked', 'Failed', 'Founder']
    ],
    guidance: {
      nextAction: 'Add freight estimate, rerun margin check, and route founder approval if margin remains below 20%.',
      recommendedOwner: 'CFO Command',
      timeline: 'Today',
      operationalRisk: 'High margin and freight uncertainty',
      escalation: 'Founder approval if margin is below threshold or freight remains uncertain.',
      shipmentGuidance: 'Freight quotation required before CIF confirmation.',
      certificationGuidance: 'AI Operational Suggestion: verify product HSN and buyer document needs before quote release.'
    }
  },
  {
    id: 'invoice-gopu-draft-001',
    workflowType: 'Invoice',
    title: 'LUT export invoice draft',
    owner: 'CFO + Founder',
    route: '/export-os/invoices/new',
    stage: 'Invoice Release',
    dependencyChain: [
      ['pricing_approved', 'Pricing approved', 'Failed', 'CFO Command'],
      ['founder_approval', 'Founder approval complete', 'Failed', 'Founder'],
      ['lut_valid', 'LUT valid', 'Failed', 'Founder / Finance'],
      ['hsn_reviewed', 'HSN reviewed', 'Failed', 'Documentation'],
      ['origin_reviewed', 'Origin reviewed', 'Failed', 'Documentation'],
      ['buyer_complete', 'Buyer details complete', 'Passed', 'COO Command'],
      ['shipment_linked', 'Shipment linked', 'Failed', 'COO Command']
    ],
    guidance: {
      nextAction: 'Complete LUT, HSN/origin review, pricing approval, and shipment link before final PDF or buyer email release.',
      recommendedOwner: 'CFO + COO Command',
      timeline: 'Today before buyer release',
      operationalRisk: 'Critical invoice release blocker',
      escalation: 'Founder approval required before release.',
      shipmentGuidance: 'CHA coordination recommended before invoice release if shipment date is near.',
      certificationGuidance: 'AI Operational Suggestion: LUT, HSN, origin, and buyer-specific document review required before release.'
    }
  },
  {
    id: 'shipment-uae-001',
    workflowType: 'Shipment',
    title: 'UAE black pepper shipment',
    owner: 'COO Command',
    route: '/export-os/shipments/SHP-UAE-001',
    stage: 'Dispatch Readiness',
    dependencyChain: [
      ['invoice_approved', 'Invoice approved', 'Failed', 'CFO + Founder'],
      ['packing_complete', 'Packing complete', 'Failed', 'Operations'],
      ['documents_ready', 'Documents ready', 'Failed', 'Documentation'],
      ['supplier_confirmed', 'Supplier confirmed', 'Failed', 'COO Command'],
      ['cha_ready', 'CHA coordination ready', 'Failed', 'COO Command'],
      ['dispatch_plan', 'Dispatch plan ready', 'Monitoring', 'Operations']
    ],
    guidance: {
      nextAction: 'Confirm supplier packing, complete document readiness, and create CHA coordination task before dispatch planning.',
      recommendedOwner: 'COO Command',
      timeline: '24-48 hours',
      operationalRisk: 'High shipment commitment risk',
      escalation: 'Escalate to Founder if buyer commitment is impacted.',
      shipmentGuidance: 'Container booking recommended within 3 days after invoice approval and packing readiness.',
      certificationGuidance: 'AI Operational Suggestion: check phytosanitary, moisture test, and buyer document requests based on product/country.'
    }
  },
  {
    id: 'warehouse-bp-2401',
    workflowType: 'Warehouse',
    title: 'Black pepper batch allocation',
    owner: 'Warehouse Ops',
    route: '/export-os/warehouse',
    stage: 'Stock Allocation',
    dependencyChain: [
      ['stock_available', 'Stock available', 'Passed', 'Warehouse Ops'],
      ['batch_reserved', 'Batch reserved', 'Failed', 'Warehouse Ops'],
      ['qc_passed', 'QC passed', 'Monitoring', 'Operations'],
      ['packing_materials', 'Packing materials available', 'Failed', 'COO Command']
    ],
    guidance: {
      nextAction: 'Reserve batch BP2401, confirm QC status, and verify export packing material availability.',
      recommendedOwner: 'COO + Warehouse Ops',
      timeline: 'Today',
      operationalRisk: 'Attention: dispatch allocation pressure',
      escalation: 'Escalate to COO if packing materials are below threshold.',
      shipmentGuidance: 'Dispatch cannot move forward until batch and packing materials are confirmed.',
      certificationGuidance: 'AI Operational Suggestion: keep QC sample and moisture review aligned with buyer requirements.'
    }
  },
  {
    id: 'supplier-malabar-confirmation',
    workflowType: 'Supplier',
    title: 'Malabar supplier packing confirmation',
    owner: 'COO Command',
    route: '/export-os/suppliers/supplier-malabar-spice',
    stage: 'Procurement Confirmation',
    dependencyChain: [
      ['supplier_confirmed', 'Supplier confirmed', 'Failed', 'COO Command'],
      ['pricing_confirmed', 'Pricing confirmed', 'Monitoring', 'CFO Command'],
      ['availability_confirmed', 'Availability confirmed', 'Failed', 'Supplier Follow-up'],
      ['quality_review', 'Quality review complete', 'Failed', 'Operations']
    ],
    guidance: {
      nextAction: 'Confirm availability, packing type, pricing validity, and quality review before procurement finalization.',
      recommendedOwner: 'COO Command',
      timeline: 'Today 18:00',
      operationalRisk: 'High supplier confirmation delay',
      escalation: 'Escalate to Founder if supplier delay blocks buyer commitment.',
      shipmentGuidance: 'Hold buyer-facing shipment commitment until supplier confirmation is logged.',
      certificationGuidance: 'AI Operational Suggestion: request supplier quality documents or lab test if buyer requires proof.'
    }
  }
];

function statusWeight(status) {
  if (status === 'Passed') return 1;
  if (status === 'Monitoring') return 0.5;
  return 0;
}

function riskFromScore(score, failedCount) {
  if (failedCount >= 4 || score < 35) return 'Critical';
  if (failedCount >= 3 || score < 55) return 'High Risk';
  if (failedCount >= 2 || score < 75) return 'Attention';
  if (failedCount >= 1 || score < 90) return 'Monitoring';
  return 'Healthy';
}

function severityForWorkflow(workflow, failedCount) {
  if (workflow.workflowType === 'Invoice' && failedCount) return 'Critical';
  if (workflow.workflowType === 'Shipment' && failedCount >= 3) return 'High Risk';
  if (failedCount >= 2) return 'High';
  return 'Attention';
}

function routeForDependency(workflow, dependencyName = '') {
  const text = `${workflow.workflowType} ${dependencyName}`.toLowerCase();
  if (text.includes('lut')) return '/export-os/company-master-data';
  if (text.includes('pricing') || text.includes('margin') || text.includes('freight')) return '/export-os/pricing-engine';
  if (text.includes('invoice')) return '/export-os/invoices/new';
  if (text.includes('approval') || text.includes('founder')) return '/export-os/director';
  if (text.includes('document') || text.includes('hsn') || text.includes('origin')) return '/export-os/document-factory';
  if (text.includes('supplier')) return '/export-os/suppliers/supplier-malabar-spice';
  if (text.includes('warehouse') || text.includes('stock') || text.includes('batch') || text.includes('packing material')) return '/export-os/warehouse';
  if (text.includes('shipment') || text.includes('cha') || text.includes('dispatch')) return workflow.route;
  return workflow.route;
}

function buildWorkflowHealth(workflow) {
  const total = workflow.dependencyChain.length;
  const completion = Math.round((workflow.dependencyChain.reduce((sum, [, , status]) => sum + statusWeight(status), 0) / total) * 100);
  const failed = workflow.dependencyChain.filter(([, , status]) => status === 'Failed').length;
  const riskLevel = riskFromScore(completion, failed);
  return {
    workflowId: workflow.id,
    healthScore: completion,
    riskLevel,
    dependencyCompletion: completion,
    status: riskLevel
  };
}

function buildBlockers(workflow) {
  const health = buildWorkflowHealth(workflow);
  return workflow.dependencyChain
    .filter(([, , status]) => status === 'Failed')
    .map(([key, dependencyName, status, owner], index) => ({
      id: `blocker-${workflow.id}-${key}`,
      tenant_id: demoTenantId,
      blocker_type: dependencyName,
      severity: severityForWorkflow(workflow, index + 1),
      workflow_id: workflow.id,
      workflow_type: workflow.workflowType,
      workflow_title: workflow.title,
      owner,
      escalation_target: workflow.guidance.escalation,
      status: 'Blocked',
      blocker_reason: `${dependencyName} is missing or incomplete.`,
      business_impact: workflow.workflowType === 'Invoice'
        ? 'Final PDF, buyer email, and release remain blocked.'
        : workflow.workflowType === 'Shipment'
          ? 'Dispatch and buyer shipment commitment cannot progress safely.'
          : workflow.workflowType === 'Pricing'
            ? 'Quote cannot move to buyer-facing draft until commercial checks pass.'
            : 'Workflow cannot advance until dependency is resolved.',
      next_action: workflow.guidance.nextAction,
      linked_route: routeForDependency(workflow, dependencyName),
      health
    }));
}

function buildGuidance(workflow) {
  return {
    id: `guidance-${workflow.id}`,
    tenant_id: demoTenantId,
    workflow_id: workflow.id,
    workflow_type: workflow.workflowType,
    next_action: workflow.guidance.nextAction,
    recommended_owner: workflow.guidance.recommendedOwner,
    suggested_timeline: workflow.guidance.timeline,
    operational_risk: workflow.guidance.operationalRisk,
    suggested_escalation: workflow.guidance.escalation,
    shipment_guidance: workflow.guidance.shipmentGuidance,
    certification_guidance: workflow.guidance.certificationGuidance,
    created_at: new Date().toISOString()
  };
}

function normalizeWorkflow(workflow) {
  const health = buildWorkflowHealth(workflow);
  const blockers = buildBlockers(workflow);
  return {
    ...workflow,
    dependencies: workflow.dependencyChain.map(([key, dependencyName, status, owner]) => ({
      id: `dependency-${workflow.id}-${key}`,
      tenant_id: demoTenantId,
      workflow_type: workflow.workflowType,
      workflow_id: workflow.id,
      dependency_name: dependencyName,
      status,
      linked_record_id: workflow.id,
      owner,
      linked_route: routeForDependency(workflow, dependencyName),
      created_at: new Date().toISOString()
    })),
    blockers,
    guidance: buildGuidance(workflow),
    health
  };
}

export async function getWorkflowDependencyEngineData() {
  await wait();
  const workflows = workflowDefinitions.map(normalizeWorkflow);
  const blockers = workflows.flatMap((workflow) => workflow.blockers);
  const guidance = workflows.map((workflow) => workflow.guidance);
  const health = workflows.map((workflow) => workflow.health);
  return {
    ok: true,
    backend: backendStatus,
    data: {
      workflows,
      blockers,
      guidance,
      health,
      shipmentGuidance: guidance.filter((item) => item.shipment_guidance).map((item) => [item.workflow_type, item.shipment_guidance, item.suggested_timeline, item.recommended_owner]),
      certificationReminders: guidance.map((item) => [item.workflow_type, item.certification_guidance, item.operational_risk]),
      summary: {
        workflowCount: workflows.length,
        blockerCount: blockers.length,
        criticalCount: blockers.filter((item) => item.severity === 'Critical').length,
        averageHealth: Math.round(health.reduce((sum, item) => sum + item.healthScore, 0) / health.length),
        nextAction: 'Resolve invoice and shipment blockers first, then rerun dependency validation before buyer-facing release.'
      }
    },
    error: null
  };
}

export async function validateWorkflowDependencies(workflowId) {
  await wait();
  const workflow = normalizeWorkflow(workflowDefinitions.find((item) => item.id === workflowId) || workflowDefinitions[0]);
  return {
    ok: true,
    backend: backendStatus,
    data: {
      workflow,
      passed: workflow.dependencies.filter((item) => item.status === 'Passed'),
      pending: workflow.dependencies.filter((item) => item.status !== 'Passed'),
      blockers: workflow.blockers,
      health: workflow.health,
      guidance: workflow.guidance
    },
    error: null
  };
}

export async function runDependencyScan(tenantId = demoTenantId) {
  const engine = await getWorkflowDependencyEngineData();
  const createdTasks = [];
  const createdAlerts = [];
  for (const blocker of engine.data.blockers) {
    if (!scanCreated.has(blocker.id)) {
      scanCreated.add(blocker.id);
      const task = await createTaskFromWorkflow({
        tenant_id: tenantId,
        title: `Resolve blocker: ${blocker.blocker_type}`,
        description: blocker.business_impact,
        workflow_source: 'Workflow Dependency Engine',
        linked_record_id: blocker.workflow_id,
        linked_label: blocker.workflow_title,
        linked_route: blocker.linked_route,
        department: blocker.owner,
        owner_command: blocker.owner,
        assigned_role: blocker.owner,
        priority: blocker.severity === 'Critical' ? 'Critical' : blocker.severity === 'High Risk' || blocker.severity === 'High' ? 'High' : 'Medium',
        status: 'Blocked',
        due_date: 'Today',
        escalation_level: blocker.escalation_target,
        blocking_reason: blocker.blocker_reason,
        next_action: blocker.next_action
      });
      createdTasks.push(task.data);
      createdAlerts.push({
        id: `alert-${blocker.id}`,
        severity: blocker.severity,
        title: blocker.blocker_reason,
        message: blocker.business_impact,
        source_module: 'Workflow Dependency Engine',
        linked_route: blocker.linked_route,
        status: 'Review Required'
      });
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gopu:workflow-dependency-scan', { detail: { createdTasks, createdAlerts } }));
  }
  return {
    ok: true,
    backend: backendStatus,
    data: {
      createdTasks,
      createdAlerts,
      blockers: engine.data.blockers,
      message: createdTasks.length
        ? `${createdTasks.length} blocker task(s) and ${createdAlerts.length} alert(s) created.`
        : 'Dependency scan complete. Existing blocker tasks already created in this session.'
    },
    error: null
  };
}

export async function escalateWorkflowBlocker(blocker) {
  await wait();
  return {
    ok: true,
    backend: backendStatus,
    data: {
      ...blocker,
      status: 'Escalated',
      escalation_note: `${blocker.blocker_type} escalated to ${blocker.escalation_target}.`,
      updated_at: new Date().toISOString()
    },
    error: null
  };
}
