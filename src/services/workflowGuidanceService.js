import { demoTenantId } from './demoData.js';
import { createTaskFromWorkflow } from './taskService.js';
import { createApprovalRequest } from './approvalService.js';

const demoDelay = 80;

function wait() {
  return new Promise((resolve) => setTimeout(resolve, demoDelay));
}

export const workflowStages = [
  'Lead',
  'Lead Qualification',
  'Commercial Feasibility',
  'Operational Feasibility',
  'Customer Verification',
  'Pricing Review',
  'Founder Approval if needed',
  'Quotation Draft',
  'Buyer Communication',
  'Order Confirmation',
  'Invoice + Documents',
  'Packing + QC',
  'Shipment Planning',
  'CHA + Logistics Coordination',
  'Dispatch Readiness',
  'Shipment Execution',
  'Buyer Updates',
  'Closure / Repeat Buyer'
];

const customerVerificationChecks = [
  ['Buyer Information Completeness', 'Attention', 'Company name and destination exist; contact person, website/profile, and complete buyer address still need review.', ['company name', 'contact person', 'email', 'phone', 'destination country', 'company profile']],
  ['Communication Validation', 'Monitoring', 'Email format and WhatsApp/phone presence are advisory checks. Duplicate buyer check should run before quote release.', ['email format', 'WhatsApp/phone exists', 'response consistency', 'duplicate buyer check']],
  ['Commercial Plausibility', 'Commercial Review Required', 'Quantity and shipment expectations must be checked against product availability, freight, and payment terms.', ['quantity realistic', 'product-country match', 'payment terms', 'shipping expectations']],
  ['Country / Market Risk', 'Founder Review Required', 'Destination complexity, sanctions placeholder, and documentation risk require human review for sensitive regions.', ['destination complexity', 'sanctions placeholder', 'trade-region placeholder', 'documentation complexity']],
  ['Relationship Intelligence', 'Monitoring', 'Previous enquiries, quotes, invoice, shipment, approvals, and payment behavior are advisory until connected history is complete.', ['previous enquiries', 'quote history', 'invoice history', 'shipment history', 'payment behavior placeholder']]
];

const stageGuidance = [
  ['Pricing Review', 'Blocked', 'Buyer verification, product availability, Incoterm, freight estimate, and margin >= 20% must be checked before quote generation.', 'CFO Command', 'Today', 'Create pricing blocker task and route low-margin review.'],
  ['Invoice + Documents', 'Critical', 'Pricing approval, founder approval, LUT validity, HSN/origin review, buyer details, shipment link, and packing status are required before release.', 'CFO + COO Command', 'Today', 'Block release, create task, and create alert for CFO/COO.'],
  ['Packing + QC', 'Attention', 'Packing cannot move to dispatch readiness unless invoice, shipment, allocation, QC, and documents are ready.', 'COO Command', '24-48 hours', 'Prepare packing/QC checklist and supplier follow-up.'],
  ['Shipment Planning', 'High Risk', 'Shipment cannot move to dispatch unless CHA, packing, buyer docs, founder approvals, and logistics readiness are complete.', 'COO Command', '48-72 hours', 'Create CHA coordination task and freight quote workflow.'],
  ['Buyer Communication', 'Review Required', 'Quotation, invoice, shipment, and document emails require validation and approval gates before release.', 'CMO + COO + CFO', 'Before buyer release', 'Prepare draft only; do not send externally without backend and approvals.']
];

const communicationRules = [
  ['Quotation Email', 'Approval Required', 'Send only when pricing is approved, CFO review is complete, founder approval is complete if required, and quotation validation passed.', 'CFO + Founder if sensitive'],
  ['Proforma Invoice Email', 'Review Required', 'Send only when buyer confirmed intention, pricing locked, founder approval complete if required, and invoice validation passed.', 'CFO + COO'],
  ['Commercial Invoice Email', 'Approval Required', 'Send only when invoice approved for release, LUT validation passed, HSN/origin review complete, and shipment workflow linked.', 'Founder + CFO'],
  ['Shipment Update Email', 'Review Required', 'Send for dispatch planned, ETA changed, shipment delayed, or documents ready after operational validation.', 'COO'],
  ['Document Request Email', 'Monitoring', 'Send when COO identifies missing buyer/supplier documents. Draft should be operational and specific.', 'COO']
];

const certificationGuidance = [
  ['Product / country selected', 'Suggest phytosanitary certificate, Spice Board reminder, export certification reminder, and buyer-specific document request.'],
  ['Food/spice shipment', 'Suggest moisture testing, QC sample reminder, lab test reminder, packing label review, and origin/HSN human review.'],
  ['Packing stage', 'Suggest labels, palletization, moisture protection, QC sampling, and export packaging recommendation.'],
  ['Shipment planning', 'Suggest container booking timing, vessel cut-off reminder, freight quote reminder, CHA coordination timing, and dispatch readiness checklist.']
];

export async function getWorkflowGuidanceDashboard() {
  await wait();
  return {
    data: {
      stages: workflowStages,
      customerChecks: customerVerificationChecks,
      stageGuidance,
      communicationRules,
      certificationGuidance,
      summary: {
        currentStage: 'Customer Verification',
        buyerStatus: 'Commercial Review Required',
        riskLevel: 'High',
        nextAction: 'Complete buyer profile, confirm payment terms, and verify shipment expectations before pricing.',
        owner: 'COO + CMO, CFO for commercial risk',
        missingDependencies: 6,
        approvalsRecommended: 3,
        communicationDrafts: 2
      }
    },
    error: null
  };
}

export async function runCustomerVerification() {
  await wait();
  const missing = ['contact person', 'website/company profile', 'destination port', 'payment terms', 'buyer address'];
  return {
    data: {
      status: 'Commercial Review Required',
      riskLevel: 'High',
      score: 68,
      missing,
      reasons: [
        'Buyer data is incomplete.',
        'Payment terms are not confirmed.',
        'Destination/port and shipment expectation need validation.',
        'Duplicate buyer and previous history checks are advisory until backend history is connected.'
      ],
      recommendation: 'Create COO/CMO follow-up task and hold pricing release until missing buyer fields are clarified.'
    },
    error: null
  };
}

export async function runWorkflowCrossCheck(stage = 'Pricing Review') {
  await wait();
  const stageMap = {
    'Pricing Review': ['buyer verified', 'product available', 'Incoterm selected', 'freight estimate', 'margin >= 20%', 'approval needed'],
    'Invoice + Documents': ['pricing approved', 'founder approval complete', 'LUT valid', 'HSN reviewed', 'origin reviewed', 'buyer details complete', 'shipment linked', 'packing status ready'],
    'Dispatch Readiness': ['invoice approved', 'shipment linked', 'product allocated', 'QC passed', 'required documents ready', 'CHA coordination done']
  };
  const checks = stageMap[stage] || stageMap['Pricing Review'];
  return {
    data: {
      stage,
      status: 'Blocked',
      missing: checks.slice(1, 4),
      passed: checks.slice(0, 1),
      nextAction: `Resolve missing ${stage} dependencies before workflow can advance.`,
      escalationRule: 'Escalate to Founder if blocker impacts buyer release, high-value quote, invoice release, or shipment commitment.'
    },
    error: null
  };
}

export async function generateCommunicationDraft(type = 'Quotation Email') {
  await wait();
  return {
    data: {
      type,
      status: 'Approval Required',
      approvalChain: ['Validation Check', 'Executive Approval', 'Founder Approval if sensitive', 'Ready for Release'],
      draft: [
        'Dear Buyer,',
        'Thank you for sharing your export requirement. We are preparing a controlled quotation after validating product, quantity, destination, Incoterm, freight assumptions, and document requirements.',
        'Please confirm destination port, preferred payment terms, and any buyer-specific document requirements before release.',
        'Regards,',
        'GOPU Exports'
      ].join('\n')
    },
    error: null
  };
}

export function createGuidanceTask(payload = {}) {
  return createTaskFromWorkflow({
    tenant_id: demoTenantId,
    title: payload.title || 'Resolve workflow guidance dependency',
    description: payload.description || 'Workflow Guidance Engine detected missing dependency before stage advancement.',
    workflow_source: 'Workflow Guidance Engine',
    linked_record_id: payload.linked_record_id || 'guided-workflow-local',
    linked_label: payload.linked_label || 'Guided export workflow',
    linked_route: payload.linked_route || '/export-os/workflow-guidance',
    department: payload.department || 'Operations',
    owner_command: payload.owner_command || 'COO Command',
    assigned_role: payload.assigned_role || 'COO',
    priority: payload.priority || 'High',
    status: payload.status || 'Blocked',
    due_date: payload.due_date || 'Today',
    blocking_reason: payload.blocking_reason || 'Previous workflow stage dependency is incomplete.',
    next_action: payload.next_action || 'Complete missing dependency and rerun guidance cross-check.'
  });
}

export function createGuidanceApproval(payload = {}) {
  return createApprovalRequest({
    tenant_id: demoTenantId,
    request_type: payload.request_type || 'Workflow Guidance Approval',
    title: payload.title || 'Founder review required by workflow guidance',
    department: payload.department || 'Operations',
    executive_owner: payload.executive_owner || 'Workflow Guidance Engine',
    buyer_name: payload.buyer_name || 'Guided workflow buyer',
    risk_level: payload.risk_level || 'High',
    priority: payload.priority || 'High',
    status: 'Founder Review Required',
    summary: payload.summary || 'Workflow guidance detected a sensitive approval dependency before release.',
    source_module: 'workflow-guidance',
    category: payload.category || 'Operational',
    details: {
      workflow_source: 'Workflow Guidance Engine',
      operational_impact: 'Workflow cannot advance to buyer-facing release until approval dependency is cleared.',
      guidance_note: payload.guidance_note || 'AI suggestions are advisory only and do not replace legal/export compliance review.'
    }
  });
}
