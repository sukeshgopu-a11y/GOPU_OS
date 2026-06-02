import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  PackageCheck,
  Route,
  Send,
  Settings,
  ShieldCheck,
  Target,
  TriangleAlert,
  Workflow,
  Zap
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import {
  Breadcrumb,
  EmptyState,
  MetricSkeletonGrid,
  PriorityBadge,
  StateChip,
  StatusBadge,
  StatusPulse,
  TrendIndicator
} from '../shared/uiPrimitives.jsx';
import { displayDateTime } from '../utils/dateTime.js';
import { ProgressBar } from '../shared/dashboardPrimitives.jsx';
import { backendStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from '../services/companyService.js';
import {
  createCOOFollowupTask,
  generateCOODailyPlan,
  generateFounderOperationsSummary,
  getApprovalDependencies,
  getBlockedWorkflows,
  getCOOSummary,
  getInvoiceDocumentReadiness,
  getOperationsControlBoard,
  getSOPImprovementWatch,
  getSupplierShipmentFollowups,
  getTodayPriorities
} from '../services/cooService.js';
import {
  escalateTask as escalateWorkflowTask,
  updateTaskStatus as updateWorkflowTaskStatus
} from '../services/taskService.js';
import {
  getSlackNotificationActivity,
  sendSlackNotification
} from '../services/slackNotificationService.js';
import { getDemoLeadProfile } from '../config/demoLeadProfile.js';

const executiveCommands = [
  {
    id: 'coo-command',
    name: 'COO Command',
    role: 'Chief Operating Officer',
    status: 'Online',
    current_focus: 'Shipment execution, document accuracy, supplier follow-up, and operational bottleneck prevention.',
    last_checked_at: new Date().toISOString()
  }
];

const cooTasks = [
  {
    id: 'task-co-fields',
    title: 'Verify pending CO document fields',
    owner: 'Documentation',
    priority: 'High',
    deadline: 'Today',
    status: 'Review Required',
    escalation_level: 'COO -> Founder if data mismatch remains',
    created_at: new Date().toISOString()
  },
  {
    id: 'task-supplier-packing',
    title: 'Follow up supplier packing confirmation',
    owner: 'Operations',
    priority: 'Medium',
    deadline: 'Today',
    status: 'Action Pending',
    escalation_level: 'COO if no response by evening',
    created_at: new Date().toISOString()
  },
  {
    id: 'task-shipment-ref',
    title: 'Check shipment reference updates',
    owner: 'Logistics',
    priority: 'High',
    deadline: 'Today',
    status: 'Monitoring',
    escalation_level: 'Founder review if delay affects buyer commitment',
    created_at: new Date().toISOString()
  },
  {
    id: 'task-doc-delay',
    title: 'Review repeated documentation delay',
    owner: 'SOP Improvement',
    priority: 'Medium',
    deadline: 'This week',
    status: 'Process Fix Required',
    escalation_level: 'COO + CTO for automation improvement',
    created_at: new Date().toISOString()
  }
];

const cooAlerts = [
  {
    id: 'alert-doc-risk',
    type: 'Documentation Risk',
    message: 'CO file has missing origin/supporting field. Founder review may be required before final use.',
    risk_level: 'High',
    recommended_action: 'Validate source fields and prepare founder review packet.',
    owner: 'Documentation',
    escalation_point: 'Pending founder review',
    created_at: new Date().toISOString()
  },
  {
    id: 'alert-supplier-delay',
    type: 'Supplier Delay Risk',
    message: 'Packing confirmation not updated. Follow-up recommended before shipment planning proceeds.',
    risk_level: 'Medium',
    recommended_action: 'Send supplier follow-up and hold buyer-facing commitment until confirmed.',
    owner: 'Operations',
    escalation_point: 'Recommendation ready',
    created_at: new Date().toISOString()
  },
  {
    id: 'alert-workflow',
    type: 'Workflow Improvement',
    message: 'Repeated manual document checks detected. Recommend CTO automation review.',
    risk_level: 'Medium',
    recommended_action: 'Draft SOP automation request for CTO Command review.',
    owner: 'SOP Improvement',
    escalation_point: 'Draft prepared',
    created_at: new Date().toISOString()
  }
];

const cooMemory = [
  { id: 'memory-sop', memory_type: 'Company SOP Memory', title: 'Approved SOPs', content: 'Awaiting live data', source: 'local-ui', approved_by_founder: false, updated_at: new Date().toISOString() },
  { id: 'memory-shipment', memory_type: 'Shipment Pattern Memory', title: 'Shipment History', content: 'Awaiting live data', source: 'local-ui', approved_by_founder: false, updated_at: new Date().toISOString() },
  { id: 'memory-supplier', memory_type: 'Supplier History Memory', title: 'Supplier Records', content: 'Awaiting live data', source: 'local-ui', approved_by_founder: false, updated_at: new Date().toISOString() },
  { id: 'memory-customer', memory_type: 'Customer Preference Memory', title: 'Customer Preferences', content: 'Awaiting live data', source: 'local-ui', approved_by_founder: false, updated_at: new Date().toISOString() }
];

const cooPlans = [
  {
    id: 'plan-daily-local',
    plan_type: 'Daily Plan',
    objective: 'Keep active orders moving while protecting documentation accuracy and buyer commitments.',
    tasks: ['Review active orders', 'Check documentation gaps', 'Confirm supplier commitments', 'Escalate blocked tasks'],
    owners: ['Documentation', 'Operations', 'Logistics', 'SOP Improvement'],
    deadlines: ['Morning', 'Midday', 'Evening'],
    risks: ['Missing origin fields', 'Supplier response delay', 'Buyer-impacting logistics delay'],
    success_kpis: ['No unowned task remains open', 'Founder receives escalation list', 'Tomorrow priorities prepared'],
    created_at: new Date().toISOString()
  }
];

const approvalRequests = [
  {
    id: 'approval-hs-code',
    title: 'Customs / HS Code Review',
    reason: 'COO cannot finalise HS code or customs classification.',
    risk_level: 'High',
    related_department: 'Documentation',
    status: 'Approval required',
    founder_decision: null,
    created_at: new Date().toISOString(),
    suggested_next_action: 'Send classification context to Founder Review.'
  },
  {
    id: 'approval-shipment-risk',
    title: 'Shipment Commitment Risk',
    reason: 'Supplier confirmation is pending before buyer commitment.',
    risk_level: 'Medium',
    related_department: 'Logistics',
    status: 'Pending founder review',
    founder_decision: null,
    created_at: new Date().toISOString(),
    suggested_next_action: 'Hold buyer commitment until supplier confirmation is logged.'
  },
  {
    id: 'approval-discount',
    title: 'Discount / Pricing Impact',
    reason: 'COO must coordinate with CFO before approving operational discount impact.',
    risk_level: 'Medium',
    related_department: 'Finance',
    status: 'Sync pending',
    founder_decision: null,
    created_at: new Date().toISOString(),
    suggested_next_action: 'Request CFO Command margin impact check.'
  }
];

const activityTimeline = [
  { id: 'timeline-0910', executive_command: 'COO Command', event: '09:10 - Operations pipeline scanned', status: 'Monitoring', created_at: new Date().toISOString() },
  { id: 'timeline-0925', executive_command: 'COO Command', event: '09:25 - Documentation gap detected', status: 'Risk detected', created_at: new Date().toISOString() },
  { id: 'timeline-1005', executive_command: 'COO Command', event: '10:05 - Supplier follow-up recommended', status: 'Recommendation ready', created_at: new Date().toISOString() },
  { id: 'timeline-1130', executive_command: 'COO Command', event: '11:30 - Logistics status sync pending', status: 'Sync pending', created_at: new Date().toISOString() },
  { id: 'timeline-1200', executive_command: 'COO Command', event: '12:00 - SOP improvement candidate identified', status: 'Draft prepared', created_at: new Date().toISOString() }
];

const cooMetrics = [
  { label: 'Active Orders', value: '08', status: 'Monitoring', tone: 'cyan' },
  { label: 'Pending Documentation', value: '05', status: 'Review Required', tone: 'amber' },
  { label: 'Supplier Follow-ups', value: '04', status: 'Action Pending', tone: 'blue' },
  { label: 'Shipments in Motion', value: '03', status: 'Tracking', tone: 'green' },
  { label: 'Bottlenecks Detected', value: '02', status: 'Founder Review', tone: 'error' },
  { label: 'SOP Updates Needed', value: '01', status: 'Draft Required', tone: 'amber' }
];

const dailyExecutionPlan = {
  Morning: ['Review active orders', 'Check documentation gaps', 'Confirm supplier commitments'],
  Midday: ['Update logistics status', 'Follow up delayed actions', 'Check buyer-impacting risks'],
  Evening: ['Prepare CEO operations summary', 'Escalate blocked tasks', "Update tomorrow's priority list"]
};

const planningModes = ['Daily Plan', 'Weekly Plan', 'Monthly Plan', 'Bottleneck Review', 'SOP Improvement'];

const demoOutputs = {
  daily: {
    title: 'Daily COO Plan Generated',
    lines: [
      'Objective: maintain order flow without approving legal, customs, banking, tax, contract, or irreversible financial actions.',
      'Required actions: verify CO fields, confirm supplier packing status, sync logistics references, prepare founder escalation list.',
      'Next review point: evening operations summary before buyer-facing commitments are updated.'
    ]
  },
  bottlenecks: {
    title: 'Bottleneck Review Prepared',
    lines: [
      'Detected bottlenecks: documentation field gaps, supplier packing confirmation delay, repeated manual checks.',
      'Owner assignment: Documentation, Operations, Logistics, SOP Improvement.',
      'Founder approval required where customs classification or buyer commitment risk is involved.'
    ]
  },
  sop: {
    title: 'SOP Update Drafted',
    lines: [
      'Preventive SOP: require origin/supporting field checklist before CO review.',
      'Automation candidate: CTO Command should evaluate document gap detection.',
      'Escalation rule: founder review when missing data impacts customs, origin claim, or buyer commitment.'
    ]
  },
  founder: {
    title: 'Founder Summary Prepared',
    lines: [
      'Executive summary: operations are active with two bottlenecks requiring review discipline.',
      'Key risks: missing CO support field and pending supplier packing confirmation.',
      'Decision queue: HS code review, shipment commitment risk, pricing impact sync.'
    ]
  }
};

function routeForOperationalItem(item = {}) {
  if (item.linkedRoute) return item.linkedRoute;
  const source = item.sourceModule || item.workflow_source || item.source_module || item.type || '';
  const text = `${source} ${item.title || ''} ${item.reason || ''}`.toLowerCase();
  if (text.includes('pricing') || text.includes('margin')) return '/export-os/pricing-engine';
  if (text.includes('invoice') || text.includes('lut')) return item.id?.includes?.('readiness') ? '/export-os/invoices/new' : `/export-os/invoices/${item.linked_record_id || item.id || 'draft'}`;
  if (text.includes('approval') || text.includes('founder')) return '/export-os/director';
  if (text.includes('shipment') || text.includes('dispatch') || text.includes('freight') || text.includes('cha')) return `/export-os/shipments/${item.id || 'SHP-UAE-001'}`;
  if (text.includes('supplier')) return '/export-os/suppliers/supplier-malabar-spice';
  if (text.includes('warehouse') || text.includes('stock') || text.includes('allocation')) return '/export-os/warehouse';
  if (text.includes('document') || text.includes('packing list') || text.includes('hsn') || text.includes('origin')) return '/export-os/document-factory';
  if (text.includes('task') || item.workflow_source) return '/export-os/tasks';
  return '/export-os/tasks';
}

function normalizeOperationalItem(item = {}, type = 'Workflow') {
  return {
    id: item.id || item.linked_record_id || `${type}-${Date.now()}`,
    type,
    title: item.title || item.event || item.workflowId || item.id || item.sourceModule || type,
    source: item.sourceModule || item.workflow_source || item.department || item.executive_command || type,
    owner: item.owner || item.owner_command || item.assigned_role || item.escalationTarget || 'COO Command',
    priority: item.priority || item.risk_level || item.riskLevel || item.severity || 'Medium',
    status: item.status || item.approvalState || item.currentStage || 'Monitoring',
    blocker: item.reason || item.blocking_reason || item.missingFields || item.message || 'No blocker recorded.',
    impact: item.businessImpact || item.summary || item.nextAction || item.next_action || 'Operational dependency should be reviewed before the workflow moves forward.',
    nextAction: item.nextAction || item.next_action || item.suggested_next_action || item.recommendation || 'Open the linked workflow, confirm the dependency, and update the owner.',
    route: routeForOperationalItem(item),
    raw: item
  };
}

function COORecentLeadsLegacy({ leads, onNewLead, onOpenDirector, onOpenLead }) {
  if (!leads || leads.length === 0) return null;
  return (
    <section className="coo-panel coo-recent-leads-panel">
      <div className="coo-section-header">
        <div><span>Slack Lead Pipeline</span><h2>Recent leads from Slack — {leads.length} received</h2></div>
        <Activity size={18} />
      </div>
      <div className="coo-leads-table">
        <div className="coo-leads-thead">
          <span>Lead</span><span>Buyer</span><span>Product</span><span>Load</span><span>Quote</span><span>Payment</span><span>Docs</span><span>Status</span>
        </div>
        {leads.map((lead, i) => (
          <div key={lead.id || i} className="coo-leads-row">
            <span className="coo-lead-buyer">{lead.buyer_name || lead.company_name || '—'}</span>
            <span>{lead.product || '—'}</span>
            <span>{lead.quantity ? `${lead.quantity} ${lead.unit || ''}`.trim() : '—'}</span>
            <span>{lead.country || lead.destination_country || '—'}</span>
            <span className={`coo-lead-status coo-lead-status--${String(lead.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{lead.status || 'Pending'}</span>
          </div>
        ))}
      </div>
      <div className="coo-leads-footer">
        <button className="ghost-button" onClick={onNewLead}>+ New Lead</button>
        <button className="tactical-button" onClick={onOpenDirector}>View Director Queue <ChevronRight size={14} /></button>
      </div>
    </section>
  );
}

function COORecentLeads({ leads, onNewLead, onOpenDirector, onOpenLead }) {
  if (!leads || leads.length === 0) return null;
  return (
    <section className="coo-panel coo-recent-leads-panel">
      <div className="coo-section-header">
        <div><span>Slack Lead Pipeline</span><h2>Recent leads from Slack and web - {leads.length} ready</h2></div>
        <Activity size={18} />
      </div>
      <div className="coo-leads-table">
        <div className="coo-leads-thead">
          <span>Lead</span><span>Buyer</span><span>Product</span><span>Load</span><span>Quote</span><span>Payment</span><span>Docs</span><span>Status</span>
        </div>
        {leads.map((lead, i) => {
          const leadRef = lead.lead_number || lead.lead_no || lead.id || `Lead ${i + 1}`;
          const qty = lead.container_load || (lead.quantity ? `${lead.quantity} ${lead.unit || lead.unit_of_measure || ''}`.trim() : '-');
          const quote = lead.final_quote || lead.quote_amount || lead.quotation_amount || lead.quote || 'Pending';
          const payment = lead.payment_terms || lead.payment_type || 'To confirm';
          const docs = lead.document_status || lead.documents_status || lead.required_documents || 'Docs pending';
          return (
            <button key={lead.id || lead.lead_number || i} type="button" className="coo-leads-row" onClick={() => onOpenLead?.(lead)}>
              <span className="coo-lead-ref">{leadRef}</span>
              <span className="coo-lead-buyer">{lead.buyer_name || lead.company_name || '-'}</span>
              <span>{lead.product || '-'}</span>
              <span>{qty}</span>
              <span>{quote}</span>
              <span>{payment}</span>
              <span>{docs}</span>
              <span className={`coo-lead-status coo-lead-status--${String(lead.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{lead.status || 'Pending'}</span>
            </button>
          );
        })}
      </div>
      <div className="coo-leads-footer">
        <button className="ghost-button" onClick={onNewLead}>+ New Lead</button>
        <button className="tactical-button" onClick={onOpenDirector}>View Director Queue <ChevronRight size={14} /></button>
      </div>
    </section>
  );
}

function COOCommandPage({ navigate, onBack, onOpenApprovalWall, onOpenTasks }) {
  const [summary, setSummary] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [readiness, setReadiness] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dailyPlan, setDailyPlan] = useState('');
  const [founderSummary, setFounderSummary] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [timeline, setTimeline] = useState(activityTimeline);
  const [selectedOperationalItem, setSelectedOperationalItem] = useState(null);
  const [drawerNote, setDrawerNote] = useState('');
  const [activeCOOTab, setActiveCOOTab] = useState('Overview');
  const [cooSlackNotice, setCooSlackNotice] = useState('');
  const [lastCOOSlackNotification, setLastCOOSlackNotification] = useState(() => {
    const rows = getSlackNotificationActivity();
    return rows.find((item) => String(item.reference || '').startsWith('COO-')) || null;
  });

  async function refreshCOOData() {
    const [summaryResult, boardResult, blockerResult, priorityResult, approvalResult, readinessResult, followupResult, leadsRes] = await Promise.all([
      getCOOSummary(demoTenantId),
      getOperationsControlBoard(demoTenantId),
      getBlockedWorkflows(demoTenantId),
      getTodayPriorities(demoTenantId),
      getApprovalDependencies(demoTenantId),
      getInvoiceDocumentReadiness(demoTenantId),
      getSupplierShipmentFollowups(demoTenantId),
      fetch('/api/coo/summary').then((r) => r.ok ? r.json() : null).catch(() => null)
    ]);
    setSummary(summaryResult.data);
    setWorkflows(boardResult.data);
    setBlockers(blockerResult.data);
    setPriorities(priorityResult.data);
    setApprovals(approvalResult.data);
    setReadiness(readinessResult.data);
    setFollowups(followupResult.data);
    if (leadsRes?.summary?.recent_leads) setRecentLeads(leadsRes.summary.recent_leads);
  }

  useEffect(() => {
    let mounted = true;
    refreshCOOData();
    const refresh = () => mounted && refreshCOOData();
    window.addEventListener('gopu:task-created', refresh);
    window.addEventListener('gopu:task-updated', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('gopu:task-created', refresh);
      window.removeEventListener('gopu:task-updated', refresh);
    };
  }, []);

  const visibleWorkflows = workflows.filter((workflow) => {
    const sourceMatch = sourceFilter === 'All' || workflow.sourceModule === sourceFilter;
    const statusMatch = statusFilter === 'All' || workflow.status === statusFilter;
    const priorityMatch = priorityFilter === 'All' || workflow.priority === priorityFilter;
    return sourceMatch && statusMatch && priorityMatch;
  });
  const sopWatch = getSOPImprovementWatch(priorities);
  const priorityQueue = buildCOOPriorityQueue(priorities, blockers, approvals, followups);
  const visibleRecentLeads = useMemo(() => {
    const demoLead = {
      ...getDemoLeadProfile(),
      final_quote: 'CFO quote ready',
      document_status: '12 docs + certificates',
      status: 'Demo Ready'
    };
    const seen = new Set();
    return [demoLead, ...(recentLeads || [])].filter((lead) => {
      const key = lead.id || lead.lead_number || `${lead.buyer_name}-${lead.product}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [recentLeads]);

  async function generateDailyPlan() {
    const result = await generateCOODailyPlan(demoTenantId);
    setDailyPlan(result.data);
    setActionNotice('COO daily plan prepared in preview mode.');
    setTimeline((current) => [{ id: `timeline-daily-${Date.now()}`, executive_command: 'COO Command', event: 'COO daily plan generated', status: 'Draft Prepared', created_at: new Date().toISOString() }, ...current]);
  }

  async function sendCOOSlack(payload, successMessage) {
    const result = await sendSlackNotification({
      source: 'COO Command',
      ...payload
    });
    setLastCOOSlackNotification(result.data || null);
    const notConfigured = result.data?.status === 'Provider Not Connected';
    const message = notConfigured
      ? 'Slack not configured - add SLACK_BOT_TOKEN to env'
      : result.ok
        ? successMessage
        : 'Slack notification failed safely.';
    setCooSlackNotice(message);
    setActionNotice(message);
    setTimeline((current) => [{ id: `timeline-slack-${Date.now()}`, executive_command: 'COO Command', event: `${payload.type || 'COO Slack notification'}: ${message}`, status: result.data?.status || (result.ok ? 'Sent' : 'Failed'), created_at: new Date().toISOString() }, ...current]);
    return result;
  }

  async function sendCOOStatusToSlack() {
    await sendCOOSlack({
      type: 'High Priority Alert',
      priority: summary?.blockedWorkflows ? 'WARNING' : 'INFO',
      reference: 'COO-DAILY-STATUS',
      status: `${summary?.activeWorkflows ?? 0} active workflows, ${summary?.blockedWorkflows ?? 0} blocked`,
      actionRequired: `Due today: ${summary?.dueToday ?? 0}. Supplier follow-ups: ${summary?.supplierFollowups ?? 0}. Founder approvals waiting: ${summary?.founderApprovalsWaiting ?? 0}.`
    }, 'COO status sent to Slack.');
  }

  async function sendDailyBriefingToSlack() {
    const result = await generateCOODailyPlan(demoTenantId);
    setDailyPlan(result.data);
    await sendCOOSlack({
      type: 'High Priority Alert',
      priority: (summary?.blockedWorkflows || blockers.length) ? 'WARNING' : 'INFO',
      reference: 'COO-DAILY-BRIEFING',
      status: 'Daily briefing generated',
      actionRequired: result.data
    }, 'Briefing sent to Slack');
  }

  async function sendSupplierFollowupSlack(item = followups[0] || {}) {
    await sendCOOSlack({
      type: 'Supplier Follow-up Required',
      priority: 'WARNING',
      reference: `COO-SUPPLIER-${item.id || Date.now()}`,
      buyer: item.party || item.buyerSupplier || 'Supplier workflow',
      status: item.status || 'Follow-up required',
      eta: item.deadline || '',
      actionRequired: item.nextAction || item.title || 'Supplier follow-up required before shipment movement.'
    }, 'Supplier follow-up sent to Slack.');
  }

  async function alertBlockedWorkflowViaSlack(blocker = {}) {
    await sendCOOSlack({
      type: 'High Priority Alert',
      priority: blocker.priority === 'Critical' ? 'URGENT' : 'WARNING',
      reference: `COO-BLOCKER-${blocker.id || Date.now()}`,
      buyer: blocker.owner || 'Workflow owner',
      status: blocker.title || 'Blocked workflow',
      actionRequired: `Reason: ${blocker.reason || blocker.nextAction || 'Not recorded'}. Owner: ${blocker.owner || 'Not assigned'}.`
    }, 'Blocked workflow alert sent to Slack.');
  }

  async function prepareFounderSummary() {
    const result = await generateFounderOperationsSummary(demoTenantId);
    setFounderSummary(result.data);
    setActionNotice('Founder operations summary prepared. No message was sent.');
    setTimeline((current) => [{ id: `timeline-founder-${Date.now()}`, executive_command: 'COO Command', event: 'Founder operations summary prepared', status: 'Draft Prepared', created_at: new Date().toISOString() }, ...current]);
  }

  async function createFollowupTask(context = {}) {
    const result = await createCOOFollowupTask({
      title: context.title ? `Follow up: ${context.title}` : 'COO operational follow-up',
      linked_record_id: context.id,
      linked_label: context.buyerSupplier || context.party,
      priority: context.priority || 'Medium',
      blocking_reason: context.reason || context.nextAction,
      next_action: context.nextAction || 'Confirm dependency and update workflow.',
      buyer: context.buyerSupplier || context.party,
      product: context.product
    });
    setActionNotice(`${result.data?.title || 'Follow-up task'} created in Task Engine.`);
    await refreshCOOData();
  }

  async function escalateBlocker(blocker) {
    if (blocker.id) await escalateWorkflowTask(demoTenantId, blocker.id, blocker.reason, blocker.escalationTarget || 'Founder / COO');
    setActionNotice(`${blocker.title} escalated for COO/founder visibility.`);
    setTimeline((current) => [{ id: `timeline-escalate-${Date.now()}`, executive_command: 'COO Command', event: `${blocker.title} escalated`, status: 'Escalated', created_at: new Date().toISOString() }, ...current]);
    await refreshCOOData();
  }

  async function markPriorityInProgress(task) {
    await updateWorkflowTaskStatus(demoTenantId, task.id, 'In Progress', 'COO marked task in progress from command page.', 'COO Command');
    setActionNotice(`${task.title} marked In Progress.`);
    await refreshCOOData();
  }

  function openRoute(route) {
    if (route) navigate(route);
  }

  function inspectOperationalItem(item, type) {
    setSelectedOperationalItem(normalizeOperationalItem(item, type));
  }

  function openSelectedWorkflow() {
    if (selectedOperationalItem?.route) navigate(selectedOperationalItem.route);
  }

  async function createSelectedFollowup() {
    if (!selectedOperationalItem) return;
    await createFollowupTask({
      id: selectedOperationalItem.id,
      title: selectedOperationalItem.title,
      priority: selectedOperationalItem.priority,
      reason: selectedOperationalItem.blocker,
      nextAction: selectedOperationalItem.nextAction,
      linked_route: selectedOperationalItem.route,
      buyerSupplier: selectedOperationalItem.raw?.buyerSupplier || selectedOperationalItem.raw?.party || selectedOperationalItem.title,
      product: selectedOperationalItem.raw?.product
    });
  }

  async function escalateSelectedItem() {
    if (!selectedOperationalItem) return;
    await escalateBlocker({
      id: selectedOperationalItem.id,
      title: selectedOperationalItem.title,
      reason: selectedOperationalItem.blocker,
      escalationTarget: selectedOperationalItem.owner
    });
  }

  function addDrawerNote() {
    if (!drawerNote.trim() || !selectedOperationalItem) return;
    setActionNotice(`COO note added for ${selectedOperationalItem.title}: ${drawerNote.trim()}`);
    setTimeline((current) => [{ id: `timeline-note-${Date.now()}`, executive_command: 'COO Command', event: `COO note added: ${selectedOperationalItem.title}`, status: 'Note Added', created_at: new Date().toISOString(), linkedRoute: selectedOperationalItem.route }, ...current]);
    setDrawerNote('');
  }

  return (
    <ExportOSShell className="executive-home-shell coo-command-home-shell" statusMessage={backendStatus.mode === 'Connected' ? 'COO Command live connected' : 'COO Command integration pending'}>
      <COOOperationsHeader onBack={onBack} summary={summary} onNewLead={() => navigate('/export-os/leads/new')} onSendDailyBriefing={sendDailyBriefingToSlack} />
      <COOConnectionStatus mode={backendStatus.mode} />
      <COOSlackAlertsPanel lastNotification={lastCOOSlackNotification} notice={cooSlackNotice} onSendStatus={sendCOOStatusToSlack} />
      <COOTabBar activeTab={activeCOOTab} onSelect={setActiveCOOTab} />
      <COOOperationalSummary summary={summary} inspect={inspectOperationalItem} />
      <COORecentLeads
        leads={visibleRecentLeads}
        onNewLead={() => navigate('/export-os/leads/new')}
        onOpenDirector={() => navigate('/export-os/director')}
        onOpenLead={(lead) => navigate(`/export-os/coo/leads/${encodeURIComponent(lead.id || lead.lead_number)}`)}
      />
      {activeCOOTab === 'Overview' && (
        <>
          <section className="coo-executive-layout">
            <COOPriorityQueue queue={priorityQueue} onInspect={inspectOperationalItem} onCreateFollowup={createFollowupTask} onAlertBlocked={alertBlockedWorkflowViaSlack} />
            <main className="coo-execution-board">
              <OperationsControlBoard workflows={visibleWorkflows.slice(0, 10)} onOpen={openRoute} onCreateFollowup={createFollowupTask} onInspect={inspectOperationalItem} />
            </main>
            <aside className="coo-critical-rail">
              <COORightOperationsRail
                blockers={blockers}
                priorities={priorities}
                approvals={approvals}
                followups={followups}
                founderSummary={founderSummary}
                onInspect={inspectOperationalItem}
                onOpenApprovalWall={onOpenApprovalWall}
                onPrepareFounderSummary={prepareFounderSummary}
              />
              {actionNotice && <div className="coo-action-notice">{actionNotice}</div>}
            </aside>
          </section>
          <section className="coo-intelligence-bottom">
            <COOActivityTimeline entries={timeline} onInspect={inspectOperationalItem} />
            <SupplierShipmentFollowups followups={followups} onCreateFollowup={createFollowupTask} onInspect={inspectOperationalItem} onSendSlackFollowup={sendSupplierFollowupSlack} />
            <SOPImprovementWatch issues={sopWatch} onDraft={() => setActionNotice('SOP improvement draft prepared in preview mode.')} onInspect={inspectOperationalItem} />
          </section>
          <COOClosingSummaryStrip summary={summary} readiness={readiness} followups={followups} approvals={approvals} />
        </>
      )}
      {activeCOOTab === 'Workflows' && <OperationsControlBoard workflows={visibleWorkflows} onOpen={openRoute} onCreateFollowup={createFollowupTask} onInspect={inspectOperationalItem} />}
      {activeCOOTab === 'Shipments' && <SupplierShipmentFollowups followups={followups} onCreateFollowup={createFollowupTask} onInspect={inspectOperationalItem} onSendSlackFollowup={sendSupplierFollowupSlack} />}
      {activeCOOTab === 'Tasks' && <COOPriorityQueue queue={priorityQueue} onInspect={inspectOperationalItem} onCreateFollowup={createFollowupTask} onAlertBlocked={alertBlockedWorkflowViaSlack} />}
      {activeCOOTab === 'Risks' && <CriticalOperationsPanel blockers={blockers} approvals={approvals} followups={followups} onInspect={inspectOperationalItem} onOpenApprovalWall={onOpenApprovalWall} />}
      {activeCOOTab === 'Timeline' && <COOActivityTimeline entries={timeline} onInspect={inspectOperationalItem} />}
      {activeCOOTab === 'SOP Insights' && <SOPImprovementWatch issues={sopWatch} onDraft={() => setActionNotice('SOP improvement draft prepared in preview mode.')} onInspect={inspectOperationalItem} />}
      {activeCOOTab === 'Export Pipeline' && <ExportPipelinePanel />}
      <OperationalDetailDrawer
        item={selectedOperationalItem}
        note={drawerNote}
        setNote={setDrawerNote}
        onClose={() => setSelectedOperationalItem(null)}
        onOpenWorkflow={openSelectedWorkflow}
        onCreateFollowup={createSelectedFollowup}
        onEscalate={escalateSelectedItem}
        onAddNote={addDrawerNote}
        navigate={navigate}
        onOpenApprovalWall={onOpenApprovalWall}
        onOpenTasks={onOpenTasks}
      />
    </ExportOSShell>
  );
}

const cooCommandTabs = ['Overview', 'Workflows', 'Shipments', 'Tasks', 'Risks', 'Timeline', 'SOP Insights', 'Export Pipeline'];

const exportStageNames = {
  1: 'Enquiry & Proforma',
  2: 'Order Confirmed',
  3: 'Lab & Production',
  4: 'Pre-Shipment Docs',
  5: 'Customs & LEO',
  6: 'Shipping & BL',
  7: 'Payment & eBRC'
};

const exportDocChecklist = [
  'Proforma Invoice',
  'Purchase Order',
  'Packing List',
  'Commercial Invoice',
  'Certificate of Origin',
  'Bill of Lading / AWB',
  'Shipping Bill (LEO)',
  'Bank Realisation Certificate (eBRC)'
];

function ExportStageBar({ currentStage }) {
  const stages = [1, 2, 3, 4, 5, 6, 7];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', margin: '10px 0' }}>
      {stages.map((stage, index) => (
        <React.Fragment key={stage}>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: stage === currentStage ? 700 : 400,
              background: stage === currentStage ? 'var(--cyan, #2ef2ff)' : stage < currentStage ? 'rgba(46,242,255,0.18)' : 'rgba(255,255,255,0.06)',
              color: stage === currentStage ? '#0a0e1a' : stage < currentStage ? 'var(--cyan, #2ef2ff)' : 'var(--muted, #6b7280)',
              border: stage === currentStage ? '1px solid var(--cyan, #2ef2ff)' : '1px solid transparent',
              whiteSpace: 'nowrap'
            }}
          >
            {stage}
          </div>
          {index < stages.length - 1 && (
            <div style={{ width: '12px', height: '1px', background: stage < currentStage ? 'var(--cyan, #2ef2ff)' : 'rgba(255,255,255,0.12)' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ExportOrderCard({ order, onAdvanceStage }) {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function handleAdvance() {
    if (order.current_stage >= 7) return;
    setAdvancing(true);
    try {
      await fetch('/api/export/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id || order.order_id, to_stage: (order.current_stage || 1) + 1 })
      });
      onAdvanceStage(order);
    } catch (_err) {
      // fail silently
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <motion.article
      className="rich-kpi-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: '14px', padding: '18px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <strong style={{ fontSize: '15px' }}>{order.buyer_name || order.buyer || 'Gulf Foods LLC'}</strong>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted, #6b7280)' }}>
            {order.product || 'Black pepper'} &middot; Qty: {order.quantity || '--'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted, #6b7280)' }}>Stage {order.current_stage || 1} of 7</span>
          <br />
          <strong style={{ fontSize: '13px', color: 'var(--cyan, #2ef2ff)' }}>
            {exportStageNames[order.current_stage || 1]}
          </strong>
        </div>
      </div>
      <ExportStageBar currentStage={order.current_stage || 1} />
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          className="ghost-button"
          style={{ fontSize: '12px', padding: '4px 10px' }}
          onClick={() => setChecklistOpen((prev) => !prev)}
        >
          {checklistOpen ? 'Hide' : 'Show'} Document Checklist
        </button>
        {order.current_stage < 7 && (
          <button
            className="tactical-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? 'Advancing...' : `Advance to Stage ${(order.current_stage || 1) + 1}`}
          </button>
        )}
        {order.current_stage >= 7 && (
          <span style={{ fontSize: '12px', color: 'var(--success, #22c55e)' }}>Order Complete</span>
        )}
      </div>
      {checklistOpen && (
        <motion.ul
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ listStyle: 'none', margin: '12px 0 0', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          {exportDocChecklist.map((doc, index) => (
            <li key={doc} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: index < (order.current_stage || 1) * 1.1 ? 'var(--success, #22c55e)' : 'var(--muted, #6b7280)', fontSize: '14px' }}>
                {index < Math.ceil((order.current_stage || 1) * 1.1) ? '✓' : '○'}
              </span>
              {doc}
            </li>
          ))}
        </motion.ul>
      )}
    </motion.article>
  );
}

function ExportPipelinePanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchOrders() {
    try {
      const res = await fetch('/api/export/stages');
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setOrders(Array.isArray(json) ? json : (json.data || []));
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  function handleAdvanced(order) {
    setOrders((prev) => prev.map((o) => (o.id === order.id || o.order_id === order.order_id)
      ? { ...o, current_stage: Math.min((o.current_stage || 1) + 1, 7) }
      : o));
  }

  return (
    <motion.section
      className="coo-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      style={{ padding: '24px' }}
    >
      <div className="coo-panel-header" style={{ marginBottom: '20px' }}>
        <div>
          <span>Export Pipeline</span>
          <h2>Active Export Orders — Stage Tracker</h2>
        </div>
        <PackageCheck size={20} />
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((stage) => (
          <div key={stage} style={{ minWidth: '120px', textAlign: 'center', padding: '8px 12px', background: 'rgba(46,242,255,0.06)', borderRadius: '6px', border: '1px solid rgba(46,242,255,0.12)' }}>
            <div style={{ fontSize: '11px', color: 'var(--cyan, #2ef2ff)', fontWeight: 600 }}>Stage {stage}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted, #6b7280)', marginTop: '2px' }}>{exportStageNames[stage]}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ color: 'var(--muted, #6b7280)', padding: '24px', textAlign: 'center' }}>Loading export orders…</div>
      )}
      {!loading && (error || orders.length === 0) && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted, #6b7280)' }}>
          <PackageCheck size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontWeight: 600, marginBottom: '6px' }}>No active export orders.</p>
          <p style={{ fontSize: '13px' }}>New orders appear here when a Slack lead is approved by Director.</p>
        </div>
      )}
      {!loading && orders.length > 0 && (
        <div>
          {orders.map((order, index) => (
            <ExportOrderCard key={order.id || order.order_id || index} order={order} onAdvanceStage={handleAdvanced} />
          ))}
        </div>
      )}
      <button className="coo-inline-action" style={{ marginTop: '8px' }} onClick={fetchOrders}>Refresh Orders</button>
    </motion.section>
  );
}

function getCOOSeverityState(value = '') {
  if (['Critical', 'Blocked', 'Escalated'].includes(value)) return 'error';
  if (['High', 'Attention', 'Review Required', 'Pending founder review'].includes(value)) return 'attention';
  if (['Ready', 'Live Connected', 'Complete'].includes(value)) return 'online';
  return 'progress';
}

function buildCOOPriorityQueue(priorities = [], blockers = [], approvals = [], followups = []) {
  const blockerRows = blockers.slice(0, 3).map((item, index) => ({
    id: `queue-blocker-${item.id || index}`,
    title: item.title,
    impact: item.businessImpact || item.reason,
    owner: item.owner,
    waitingTime: index === 0 ? '2d waiting' : 'Today',
    nextAction: item.reason || item.nextAction,
    severity: item.priority || 'High',
    type: 'Blocked Workflow',
    raw: item
  }));
  const priorityRows = priorities.slice(0, 4).map((item, index) => ({
    id: `queue-priority-${item.id || index}`,
    title: item.title,
    impact: item.blocking_reason || item.escalation_level || 'Operational action needed today.',
    owner: item.owner_command,
    waitingTime: item.due_date === 'Overdue' ? 'Overdue' : item.due_date || 'Today',
    nextAction: item.next_action,
    severity: item.priority,
    type: 'Priority Action',
    raw: item
  }));
  const approvalRows = approvals.slice(0, 2).map((item, index) => ({
    id: `queue-approval-${item.id || index}`,
    title: item.title,
    impact: item.summary || item.reason || 'Release is waiting on approval.',
    owner: item.requested_by || 'Founder Office',
    waitingTime: 'Approval gate',
    nextAction: item.suggested_next_action || 'Open Director Queue and clear release gate.',
    severity: item.risk_level || 'High',
    type: 'Approval Dependency',
    raw: item
  }));
  const followupRows = followups.slice(0, 2).map((item) => ({
    id: `queue-followup-${item.id}`,
    title: item.title,
    impact: `${item.party} / ${item.product}`,
    owner: item.owner,
    waitingTime: item.deadline,
    nextAction: item.nextAction,
    severity: item.priority,
    type: 'Shipment Follow-up',
    raw: item
  }));

  return [...blockerRows, ...priorityRows, ...approvalRows, ...followupRows]
    .sort((a, b) => {
      const score = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (score[a.severity] ?? 2) - (score[b.severity] ?? 2);
    })
    .slice(0, 8);
}

function COOOperationsHeader({ onBack, summary, onNewLead, onSendDailyBriefing }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <header className="deck-header coo-ops-header">
      <div className="deck-header-copy">
        <span>GOPU Export OS</span>
        <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'COO Operations' }]} />
        <h1>COO Command</h1>
        <p>Executive operations workspace for blockers, approvals, shipments, and next actions.</p>
      </div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><Workflow size={15} /><strong>{summary?.activeWorkflows ?? '--'} active</strong></div>
        <div className="coo-status"><TriangleAlert size={15} /><strong>{summary?.blockedWorkflows ?? '--'} blocked</strong></div>
        <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
        <button className="tactical-button" onClick={onNewLead}>New Lead</button>
        <button className="ghost-button" onClick={onSendDailyBriefing}>Send Daily Briefing</button>
        <button className="ghost-button coo-back" onClick={onBack}><ArrowLeft size={15} />Command Deck</button>
      </div>
    </header>
  );
}

function COOSlackAlertsPanel({ lastNotification, notice, onSendStatus }) {
  const providerNotConnected = lastNotification?.status === 'Provider Not Connected';
  return (
    <section className="coo-panel coo-slack-alerts-panel">
      <div className="coo-section-header">
        <div><span>Slack Alerts</span><h2>COO notification control</h2></div>
        <Bell size={18} />
      </div>
      <div className="coo-slack-alerts-body">
        <div>
          <strong>{providerNotConnected ? 'Slack not configured - add SLACK_BOT_TOKEN to env' : 'Send current COO status to Slack'}</strong>
          <span>
            {lastNotification
              ? `Last notification: ${new Date(lastNotification.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} / ${lastNotification.status}`
              : 'No COO Slack notification sent yet.'}
          </span>
          {notice && <small>{notice}</small>}
        </div>
        <button className="tactical-button" onClick={onSendStatus}>Send COO Status to Slack</button>
      </div>
    </section>
  );
}

function COOConnectionStatus({ mode }) {
  const label = mode === 'Connected' ? 'Live Connected' : mode === 'Error' ? 'Offline' : 'Connect Supabase to activate';
  return (
    <div className={`coo-connection-strip state-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="coo-status-dot" />
      <strong>{label}</strong>
      <span>{mode === 'Connected' ? 'Operations data is syncing from backend services.' : 'Local operations workspace active while integrations finish syncing.'}</span>
    </div>
  );
}

function COOTabBar({ activeTab, onSelect }) {
  return (
    <nav className="coo-tabbar" aria-label="COO command sections">
      {cooCommandTabs.map((tab) => (
        <button className={activeTab === tab ? 'active' : ''} onClick={() => onSelect(tab)} key={tab}>{tab}</button>
      ))}
    </nav>
  );
}

function COOOperationalSummary({ summary, inspect }) {
  if (!summary) return <MetricSkeletonGrid />;
  const rows = [
    ['Active Workflows', summary?.activeWorkflows ?? 0, 'Active workflow queue', '/export-os/tasks', 'blue'],
    ['Blocked Items', summary?.blockedWorkflows ?? 0, 'Needs owner action', '/export-os/tasks', 'red'],
    ['Due Today', summary?.dueToday ?? 0, 'Same-day execution', '/export-os/tasks', 'amber'],
    ['Shipment Risks', summary?.supplierFollowups ?? 0, 'Supplier / dispatch follow-up', '/export-os/shipments', 'purple'],
    ['Pending Reviews', summary?.founderApprovalsWaiting ?? 0, 'Approval gate', '/export-os/director', 'amber']
  ];
  return <section className="executive-kpi-ticker coo-ops-summary">{rows.map(([label, value, status, linkedRoute, tone]) => <button className={`coo-summary-item tone-${tone}`} onClick={() => inspect({ title: label, status, priority: tone === 'red' ? 'High' : 'Medium', linkedRoute, nextAction: `Open ${label} workflow view.` }, 'Operational Summary')} key={label}><span>{label}</span><strong>{value}</strong><small>{status}</small></button>)}</section>;
}

function COOPriorityQueue({ queue, onInspect, onCreateFollowup, onAlertBlocked }) {
  const urgentQueue = queue.slice(0, 5);
  return (
    <aside className="coo-panel coo-priority-queue">
      <div className="coo-section-header">
        <div><span>Priority Queue</span><h2>Needs attention now</h2></div>
        <Target size={18} />
      </div>
      <div className="coo-priority-table">
        {urgentQueue.map((item) => (
          <article className="coo-priority-row" tabIndex={0} role="button" onClick={() => onInspect(item.raw, item.type)} onKeyDown={(event) => event.key === 'Enter' && onInspect(item.raw, item.type)} key={item.id}>
            <span className={`coo-severity-dot severity-${getCOOSeverityState(item.severity)}`} />
            <strong>{item.title}</strong>
            <p>{item.impact}</p>
            <dl>
              <div><dt>Owner</dt><dd>{item.owner}</dd></div>
              <div><dt>Waiting</dt><dd>{item.waitingTime}</dd></div>
            </dl>
            <small>{item.nextAction}</small>
            <em>{item.severity}</em>
            {item.type === 'Blocked Workflow' && (
              <button onClick={(event) => { event.stopPropagation(); onAlertBlocked(item.raw); }}>Alert via Slack</button>
            )}
          </article>
        ))}
      </div>
      <button className="coo-inline-action" onClick={() => onCreateFollowup(urgentQueue[0]?.raw || {})}>Create Follow-up</button>
    </aside>
  );
}

function COOBoardFilters({ sourceFilter, setSourceFilter, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter }) {
  const sources = ['All', 'Lead Intake', 'Pricing Engine', 'Invoice System', 'Document Factory', 'Shipment', 'Supplier', 'Warehouse', 'Director Queue', 'COO Command'];
  const statuses = ['All', 'New', 'In Progress', 'Waiting Review', 'Blocked', 'Escalated', 'Waiting Founder Approval', 'Attention', 'Monitoring'];
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  return <section className="coo-filter-row"><label>Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label></section>;
}

function OperationsControlBoard({ workflows, onOpen, onCreateFollowup, onInspect }) {
  return (
    <section className="coo-panel coo-control-board">
      <div className="coo-section-header">
        <div><span>Workflow Execution Board</span><h2>Main operational workspace</h2></div>
        <ClipboardList size={18} />
      </div>
      <div className="coo-workflow-table">
        <div className="coo-workflow-head">
          <span>Workflow ID</span><span>Buyer / Supplier</span><span>Product</span><span>Current Stage</span><span>Owner</span><span>Priority</span><span>Status</span><span>Next Action</span>
        </div>
        {workflows.map((row) => (
          <article className="coo-clickable-row" tabIndex={0} role="button" onClick={() => onInspect(row, 'Workflow Row')} onKeyDown={(event) => event.key === 'Enter' && onInspect(row, 'Workflow Row')} key={`${row.id}-${row.sourceModule}`}>
            <strong>{row.id}</strong>
            <span>{row.buyerSupplier}</span>
            <span>{row.product}</span>
            <span>{row.currentStage}</span>
            <span>{row.owner}</span>
            <StatusBadge label={row.priority} state={getCOOSeverityState(row.priority)} />
            <StatusBadge label={compactWorkflowStatus(row.status)} state={getCOOSeverityState(row.status)} />
            <div><p>{row.nextAction}</p><button onClick={(event) => { event.stopPropagation(); onOpen(row.linkedRoute); }}>Open Workflow</button><button onClick={(event) => { event.stopPropagation(); onCreateFollowup(row); }}>Create Follow-up</button></div>
          </article>
        ))}
      </div>
      <footer className="coo-board-footer">
        <span>{workflows.length} workflows in focus</span>
        <strong>Row click opens journey, blockers, approvals, shipment, invoice, supplier, tasks, and recommendations.</strong>
      </footer>
    </section>
  );
}

function compactWorkflowStatus(status = '') {
  const labels = {
    'Waiting Founder Approval': 'Founder Review',
    'Waiting Review': 'Review',
    'In Progress': 'Moving',
    'Review Required': 'Review',
    'Action Pending': 'Pending'
  };
  return labels[status] || status;
}

function COOBlockedWorkflows({ blockers, onEscalate, onOpen, onInspect }) {
  return <section className="coo-panel"><div className="coo-panel-header"><div><span>Blocked Workflows</span><h2>Critical blockers</h2></div><AlertTriangle size={20} /></div><div className="coo-blocker-list">{blockers.slice(0, 6).map((blocker) => <article className="coo-clickable-card urgent" tabIndex={0} role="button" onClick={() => onInspect(blocker, 'Blocked Workflow')} onKeyDown={(event) => event.key === 'Enter' && onInspect(blocker, 'Blocked Workflow')} key={blocker.id}><div><strong>{blocker.title}</strong><StatusBadge label={blocker.priority} state={blocker.priority === 'Critical' ? 'error' : 'attention'} /></div><p>{blocker.reason}</p><dl><div><dt>Impact</dt><dd>{blocker.businessImpact}</dd></div><div><dt>Owner</dt><dd>{blocker.owner}</dd></div><div><dt>Escalation</dt><dd>{blocker.escalationTarget}</dd></div></dl><div className="coo-card-actions"><button onClick={(event) => { event.stopPropagation(); onOpen(blocker.linkedRoute); }}>Open Workflow</button><button onClick={(event) => { event.stopPropagation(); onEscalate(blocker); }}>Escalate Blocker</button></div></article>)}</div></section>;
}

function COOTodayPriorities({ priorities, output, onGenerate, onCreateFollowup, onMarkProgress, onInspect }) {
  return <section className="coo-panel"><div className="coo-panel-header"><div><span>Todays Operating Priorities</span><h2>Generated from task data</h2></div><Target size={20} /></div><div className="coo-priority-list">{priorities.slice(0, 6).map((task) => <article className="coo-clickable-card" tabIndex={0} role="button" onClick={() => onInspect(task, 'Daily Priority')} onKeyDown={(event) => event.key === 'Enter' && onInspect(task, 'Daily Priority')} key={task.id}><strong>{task.title}</strong><div><StateChip label={task.owner_command} /><StateChip label={task.due_date} /><StateChip label={task.priority} /></div><p>{task.next_action}</p><small>{task.escalation_level}</small><div className="coo-card-actions"><button onClick={(event) => { event.stopPropagation(); onMarkProgress(task); }}>Mark In Progress</button><button onClick={(event) => { event.stopPropagation(); onCreateFollowup(task); }}>Create Follow-up</button></div></article>)}</div><button className="tactical-button" onClick={onGenerate}>Generate COO Daily Plan</button>{output && <pre className="task-local-output">{output}</pre>}</section>;
}

function FounderApprovalDependencies({ approvals, onOpenApprovalWall, onInspect }) {
  return <section className="coo-panel"><div className="coo-panel-header"><div><span>Founder Approval Dependencies</span><h2>Release gates</h2></div><FileCheck2 size={20} /></div><div className="coo-approval-list">{approvals.slice(0, 5).map((approval) => <article className="coo-clickable-card" tabIndex={0} role="button" onClick={() => onInspect(approval, 'Founder Approval Dependency')} onKeyDown={(event) => event.key === 'Enter' && onInspect(approval, 'Founder Approval Dependency')} key={approval.id}><strong>{approval.title}</strong><p>{approval.summary}</p><div><StatusBadge label={approval.request_type} state="progress" /><StatusBadge label={approval.risk_level} state={approval.risk_level === 'Critical' ? 'error' : 'attention'} /></div></article>)}</div><button className="tactical-button" onClick={onOpenApprovalWall}>Open Director Queue</button></section>;
}

function InvoiceDocumentReadiness({ readiness, onOpen, onInspect }) {
  return (
    <details className="coo-panel coo-compact-section">
      <summary><span>Invoice & Document Readiness</span><strong>Readiness, blocker, next action</strong><FileText size={17} /></summary>
      <div className="coo-readiness-list">
        {readiness.map((row) => (
          <button className="coo-readiness-row" onClick={() => onInspect(row, 'Invoice / Document Readiness')} key={row.id}>
            <strong>{row.title}</strong>
            <span>{row.readiness}%</span>
            <progress value={row.readiness} max="100" />
            <p>{row.missingFields}</p>
            <small>{row.owner}: {row.approvalState}</small>
            <em onClick={(event) => { event.stopPropagation(); onOpen(row.linkedRoute); }}>Open</em>
          </button>
        ))}
      </div>
    </details>
  );
}

function SupplierShipmentFollowups({ followups, onCreateFollowup, onInspect, onSendSlackFollowup }) {
  return (
    <section className="coo-panel coo-followup-panel">
      <div className="coo-section-header"><div><span>Supplier & Shipment Follow-up</span><h2>Execution dependencies</h2></div><Route size={18} /></div>
      <div className="coo-followup-table">
        <div><span>Supplier</span><span>Shipment</span><span>Issue</span><span>Deadline</span><span>Status</span><span>Next Action</span></div>
        {followups.map((item) => (
          <button onClick={() => onInspect(item, 'Supplier / Shipment Follow-up')} key={item.id}>
            <strong>{item.party}</strong><span>{item.product}</span><span>{item.title}</span><span>{item.deadline}</span><StatusBadge label={item.status} state={getCOOSeverityState(item.status)} /><small>{item.nextAction}</small>
          </button>
        ))}
      </div>
      <button className="coo-inline-action" onClick={() => onCreateFollowup(followups[0] || {})}>Create Follow-up</button>
      <button className="coo-inline-action" onClick={() => onSendSlackFollowup(followups[0] || {})}>Send Follow-up via Slack</button>
    </section>
  );
}

function COORecommendationPanel({ blockers, priorities, approvals, onInspect }) {
  const recommendations = [
    blockers.some((item) => item.reason.toLowerCase().includes('lut')) && { title: 'Complete LUT details before invoice release.', linkedRoute: '/export-os/company-master-data', priority: 'Critical', nextAction: 'Open Company Master Data Vault and complete LUT details.' },
    priorities.some((item) => `${item.title} ${item.next_action}`.toLowerCase().includes('port')) && { title: 'Confirm destination port before freight estimate.', linkedRoute: '/export-os/pricing-engine', priority: 'High', nextAction: 'Open pricing workflow and update freight assumptions.' },
    priorities.some((item) => `${item.title} ${item.next_action}`.toLowerCase().includes('supplier')) && { title: 'Escalate supplier confirmation today.', linkedRoute: '/export-os/suppliers/supplier-malabar-spice', priority: 'High', nextAction: 'Open supplier follow-up and confirm readiness.' },
    priorities.some((item) => `${item.title} ${item.blocking_reason}`.toLowerCase().includes('pricing')) && { title: 'Request CFO review for low-margin quote.', linkedRoute: '/export-os/pricing-engine', priority: 'High', nextAction: 'Open pricing engine and route CFO/founder approval.' },
    blockers.some((item) => item.reason.toLowerCase().includes('hsn')) && { title: 'Create SOP for recurring HSN review delay.', linkedRoute: '/export-os/document-factory', priority: 'Medium', nextAction: 'Open document factory and review repeated HSN gaps.' },
    approvals.length > 0 && { title: 'Open Director Queue and clear release dependencies.', linkedRoute: '/export-os/director', priority: 'High', nextAction: 'Open Director Queue and clear founder release gates.' }
  ].filter(Boolean);
  return <section className="coo-panel coo-recommendation-panel"><div className="coo-section-header"><div><span>AI Operational Recommendations</span><h2>Next best actions</h2></div><BrainCircuit size={18} /></div><div className="coo-recommendation-list">{recommendations.map((item) => <button key={item.title} onClick={() => onInspect(item, 'COO Recommendation')}>{item.title}</button>)}</div></section>;
}

function FounderOperationsSummary({ output, onPrepare }) {
  return <section className="coo-panel coo-founder-summary"><div className="coo-section-header"><div><span>Founder Brief</span><h2>Operations summary</h2></div><ClipboardCheck size={18} /></div><button className="coo-inline-action" onClick={onPrepare}>Prepare Summary</button>{output && <pre className="task-local-output">{output}</pre>}</section>;
}

function buildCOORecommendations(blockers = [], priorities = [], approvals = []) {
  return [
    blockers.some((item) => item.reason.toLowerCase().includes('lut')) && { title: 'Complete LUT details before invoice release.', linkedRoute: '/export-os/company-master-data', priority: 'Critical', nextAction: 'Open Company Master Data Vault and complete LUT details.' },
    priorities.some((item) => `${item.title} ${item.next_action}`.toLowerCase().includes('port')) && { title: 'Confirm destination port before freight estimate.', linkedRoute: '/export-os/pricing-engine', priority: 'High', nextAction: 'Open pricing workflow and update freight assumptions.' },
    priorities.some((item) => `${item.title} ${item.next_action}`.toLowerCase().includes('supplier')) && { title: 'Escalate supplier confirmation today.', linkedRoute: '/export-os/suppliers/supplier-malabar-spice', priority: 'High', nextAction: 'Open supplier follow-up and confirm readiness.' },
    priorities.some((item) => `${item.title} ${item.blocking_reason}`.toLowerCase().includes('pricing')) && { title: 'Request CFO review for low-margin quote.', linkedRoute: '/export-os/pricing-engine', priority: 'High', nextAction: 'Open pricing engine and route CFO/founder approval.' },
    blockers.some((item) => item.reason.toLowerCase().includes('hsn')) && { title: 'Create SOP for recurring HSN review delay.', linkedRoute: '/export-os/document-factory', priority: 'Medium', nextAction: 'Open document factory and review repeated HSN gaps.' },
    approvals.length > 0 && { title: 'Open Approval Wall and clear release dependencies.', linkedRoute: '/export-os/approval-wall', priority: 'High', nextAction: 'Open approval wall and clear founder release gates.' }
  ].filter(Boolean);
}

function COORightOperationsRail({ blockers, priorities, approvals, followups, founderSummary, onInspect, onOpenApprovalWall, onPrepareFounderSummary }) {
  const risks = [
    ...blockers.slice(0, 3).map((item) => ({ id: item.id, title: item.title, type: 'Blocker', detail: item.reason, severity: item.priority, raw: item })),
    ...approvals.slice(0, 2).map((item) => ({ id: item.id, title: item.title, type: 'Approval', detail: item.summary || item.reason, severity: item.risk_level, raw: item })),
    ...followups.filter((item) => ['High', 'Critical'].includes(item.priority)).slice(0, 1).map((item) => ({ id: item.id, title: item.title, type: 'Shipment', detail: item.nextAction, severity: item.priority, raw: item }))
  ].slice(0, 5);
  const recommendations = buildCOORecommendations(blockers, priorities, approvals).slice(0, 4);

  return (
    <section className="coo-panel coo-operations-rail">
      <div className="coo-section-header"><div><span>Critical Operations</span><h2>Risks and next actions</h2></div><AlertTriangle size={18} /></div>
      <div className="coo-rail-group">
        <strong>Blocking movement</strong>
        <div className="coo-critical-list">
          {risks.map((item) => (
            <button onClick={() => onInspect(item.raw, item.type)} key={`${item.type}-${item.id}`}>
              <i className={`severity-${getCOOSeverityState(item.severity)}`} />
              <span>{item.type}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="coo-rail-group">
        <strong>AI operational recommendations</strong>
        <div className="coo-recommendation-list">
          {recommendations.map((item) => <button key={item.title} onClick={() => onInspect(item, 'COO Recommendation')}>{item.title}</button>)}
        </div>
      </div>
      <div className="coo-founder-brief-inline">
        <div><span>Founder Brief</span><strong>Operations summary</strong></div>
        <button className="coo-inline-action" onClick={onPrepareFounderSummary}>Prepare Summary</button>
      </div>
      {founderSummary && <pre className="task-local-output">{founderSummary}</pre>}
      <button className="coo-inline-action" onClick={onOpenApprovalWall}>Open Approval Wall</button>
    </section>
  );
}

function COOActivityTimeline({ entries, onInspect }) {
  return <section className="coo-panel coo-timeline-panel"><div className="coo-section-header"><div><span>Activity Timeline</span><h2>Important events</h2></div><Activity size={18} /></div><div className="coo-timeline-list">{entries.slice(0, 6).map((entry) => <button onClick={() => onInspect(entry, 'Timeline Event')} key={entry.id}><time>{entry.created_at?.includes?.('T') ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.created_at}</time><strong>{entry.event}</strong><span>{entry.status}</span></button>)}</div></section>;
}

function SOPImprovementWatch({ issues, onDraft, onInspect }) {
  return (
    <details className="coo-panel coo-compact-section coo-sop-panel">
      <summary><span>SOP Improvement Watch</span><strong>Secondary intelligence</strong><Settings size={17} /></summary>
      <div className="coo-sop-list">
        {issues.map((issue) => (
          <button
            aria-label={`Inspect SOP issue: ${issue.issue}`}
            onClick={() => onInspect(issue, 'SOP Improvement Watch')}
            key={issue.id}
          >
            <strong>{issue.issue}</strong>
            <span>{issue.count} signals</span>
            <p>{issue.recommendation}</p>
            <StatusBadge label={issue.status} state={issue.status === 'Review Required' ? 'attention' : 'progress'} />
          </button>
        ))}
      </div>
      <button className="coo-inline-action" aria-label="Draft SOP improvement" onClick={onDraft}>Draft SOP Improvement</button>
    </details>
  );
}

function CriticalOperationsPanel({ blockers, approvals, followups, onInspect, onOpenApprovalWall }) {
  const rows = [
    ...blockers.slice(0, 3).map((item) => ({ id: item.id, title: item.title, type: 'Blocker', detail: item.reason, severity: item.priority, raw: item })),
    ...approvals.slice(0, 2).map((item) => ({ id: item.id, title: item.title, type: 'Approval', detail: item.summary || item.reason, severity: item.risk_level, raw: item })),
    ...followups.filter((item) => ['High', 'Critical'].includes(item.priority)).slice(0, 2).map((item) => ({ id: item.id, title: item.title, type: 'Shipment', detail: item.nextAction, severity: item.priority, raw: item }))
  ];
  return (
    <section className="coo-panel coo-critical-panel">
      <div className="coo-section-header"><div><span>Critical Operations</span><h2>Risks blocking movement</h2></div><AlertTriangle size={18} /></div>
      <div className="coo-critical-list">
        {rows.map((item) => (
          <button onClick={() => onInspect(item.raw, item.type)} key={`${item.type}-${item.id}`}>
            <i className={`severity-${getCOOSeverityState(item.severity)}`} />
            <span>{item.type}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </button>
        ))}
      </div>
      <button className="coo-inline-action" onClick={onOpenApprovalWall}>Open Director Queue</button>
    </section>
  );
}

function COOClosingSummaryStrip({ summary, readiness, followups, approvals }) {
  const averageReadiness = readiness.length
    ? Math.round(readiness.reduce((total, item) => total + Number(item.readiness || 0), 0) / readiness.length)
    : 0;
  const items = [
    ['Document readiness', `${averageReadiness}%`, readiness.find((item) => item.readiness < 60)?.missingFields || 'Release checks active'],
    ['Follow-ups open', String(followups.length), 'Supplier and shipment dependencies'],
    ['Approval gates', String(approvals.length), 'Director review dependencies'],
    ['Operating state', summary?.blockedWorkflows ? 'Attention' : 'Moving', summary?.blockedWorkflows ? 'Clear blockers before release' : 'Execution queue is moving']
  ];

  return (
    <section className="coo-closing-summary deck-live-panel">
      {items.map(([label, value, detail]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{detail}</small>
        </article>
      ))}
    </section>
  );
}

function OperationalDetailDrawer({ item, note, setNote, onClose, onOpenWorkflow, onCreateFollowup, onEscalate, onAddNote, navigate, onOpenApprovalWall, onOpenTasks }) {
  if (!item) return null;
  const aiRecommendation = buildDirectorAIRecommendation(item);
  const linkedSystems = [
    ['Open Full Workflow', item.route, ArrowUpRight],
    ['Open Director Queue', '/export-os/director', ShieldCheck],
    ['Open Shipment', '/export-os/shipments/SHP-UAE-001', Route],
    ['Open Invoice', '/export-os/invoices/new', FileText],
    ['Open Pricing', '/export-os/pricing-engine', Calculator],
    ['Open Task', '/export-os/tasks', ClipboardList]
  ];
  return (
    <div className="coo-drawer-backdrop" onClick={onClose}>
      <aside className="coo-operational-drawer" role="dialog" aria-modal="true" aria-label="Operational detail" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{item.type}</span>
            <h2>{item.title}</h2>
          </div>
          <button className="ghost-button drawer-back-button" onClick={onClose}><ArrowLeft size={15} />Back</button>
        </header>
        <div className="drawer-status-row">
          <StatusBadge label={item.priority} state={item.priority === 'Critical' ? 'error' : item.priority === 'High' ? 'attention' : 'progress'} />
          <StatusBadge label={item.status} state={item.status === 'Blocked' || item.status === 'Escalated' ? 'attention' : 'progress'} />
          <StateChip label={item.owner} />
        </div>
        <section className="drawer-section urgent">
          <span>Why blocked / needs attention</span>
          <p>{item.blocker}</p>
        </section>
        <section className="drawer-section">
          <span>Business impact</span>
          <p>{item.impact}</p>
        </section>
        <section className="drawer-section">
          <span>Next required action</span>
          <p>{item.nextAction}</p>
        </section>
        <section className="drawer-section">
          <span>Workflow journey</span>
          <div className="drawer-timeline"><p>Intake checked.</p><p>{item.status} with owner: {item.owner}.</p><p>Next action: {item.nextAction}</p></div>
        </section>
        <section className="drawer-section director-ai-recommendation">
          <span>AI Recommendation - Human Review Advised</span>
          <p>{aiRecommendation.summary}</p>
          <div className="director-ai-grid">
            <div><strong>Risk</strong><small>{aiRecommendation.risk}</small></div>
            <div><strong>Urgency</strong><small>{aiRecommendation.urgency}</small></div>
            <div><strong>Suggested decision</strong><small>{aiRecommendation.decision}</small></div>
          </div>
        </section>
        <section className="drawer-section">
          <span>Approvals, shipment, invoice, supplier</span>
          <div className="drawer-link-grid">
            {linkedSystems.map(([label, route, Icon]) => <button key={label} onClick={() => label === 'Open Director Queue' ? onOpenApprovalWall() : label === 'Open Task' ? onOpenTasks() : navigate(route)}><Icon size={15} />{label}</button>)}
          </div>
        </section>
        <section className="drawer-section">
          <span>Tasks and recommendation</span>
          <p>Create a follow-up if the owner cannot clear the dependency today. Escalate only when a shipment, invoice release, or buyer commitment is at risk.</p>
        </section>
        <section className="drawer-section">
          <span>Decision note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add decision note for this item" />
        </section>
        <footer>
          <button className="tactical-button" onClick={onOpenWorkflow}>Open Full Workflow</button>
          <button className="ghost-button" onClick={onCreateFollowup}>Create Follow-up</button>
          <button className="ghost-button" onClick={onEscalate}>Escalate</button>
          <button className="ghost-button" onClick={onAddNote}>Add Note</button>
        </footer>
      </aside>
    </div>
  );
}

function buildDirectorAIRecommendation(item) {
  const risk = item.priority === 'Critical' || item.risk_level === 'Critical' ? 'Critical' : item.priority === 'High' || item.risk_level === 'High' ? 'High' : 'Medium';
  const highRisk = ['Critical', 'High'].includes(risk);
  return {
    risk,
    urgency: item.waiting_hours >= 24 ? 'Long pending - executive follow-up recommended' : highRisk ? 'Review today before workflow moves' : 'Monitor and clear when context is complete',
    decision: highRisk ? 'Do not auto-approve. Review notes and linked workflow first.' : 'Low-risk items may receive AI recommended resolution after human check.',
    summary: `${item.title} is waiting on ${item.owner || item.source_executive || 'executive owner'}. OpenAI may summarize blockers and suggest a path, but high-risk financial, legal, compliance, shipment, and low-margin items remain human-review only.`
  };
}

function ExecutiveCommandShell({ children }) {
  return (
    <motion.div
      className="executive-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="background-grid" />
      {children}
    </motion.div>
  );
}

function COOHeader({ onBack, onOpenTasks }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="coo-header">
      <div className="coo-header-copy">
        <span>GOPU Export OS</span>
        <h1>COO Command</h1>
        <p>Operations execution, documentation, logistics, supplier coordination, quality control, and workflow discipline.</p>
      </div>
      <div className="coo-header-controls">
        <div className="coo-verified">
          <ShieldCheck size={16} />
          <span>Founder session verified</span>
        </div>
        <div className="coo-status">
          <span className="live-pulse" />
          <strong>Status: COO Command Online</strong>
        </div>
        <div className="coo-time">
          <CalendarClock size={16} />
          <span>{displayDateTime(now)}</span>
        </div>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button className="ghost-button coo-back" onClick={onOpenTasks}>
          <Workflow size={15} />
          Task Engine
        </button>
        <button className="ghost-button coo-back" onClick={onBack}>
          <ArrowLeft size={15} />
          Command Deck
        </button>
      </div>
    </header>
  );
}

function COOIdentityPanel({ executive }) {
  return (
    <aside className="coo-panel coo-identity-panel">
      <div className="identity-orb">
        <Workflow size={34} />
        <span className="live-pulse" />
      </div>
      <span className="coo-kicker">{executive.name}</span>
      <h2>{executive.role}</h2>
      <div className="identity-section">
        <strong>Mission</strong>
        <p>Run export operations end-to-end so orders move on time, documentation stays accurate, suppliers stay accountable, and bottlenecks are detected before they become failures.</p>
      </div>
      <div className="identity-section">
        <strong>Status</strong>
        <p>{executive.status}</p>
      </div>
      <div className="identity-section">
        <strong>Current Focus</strong>
        <p>{executive.current_focus}</p>
      </div>
      <div className="identity-section">
        <strong>Command Scope</strong>
        <div className="scope-list">
          {['Orders & Pipeline', 'Documentation', 'Logistics', 'Quality & Claims', 'SOP Improvement'].map((scope) => (
            <span key={scope}>{scope}</span>
          ))}
        </div>
      </div>
      <div className="authority-box">
        <strong>Authority</strong>
        <p>Advisor and orchestrator. Final legal, customs, banking, tax, contractual, and irreversible financial decisions require founder approval.</p>
      </div>
    </aside>
  );
}

function OperationsMetricCard({ metric, index }) {
  const trendValue = metric.change ?? metric.delta ?? metric.trend ?? metric.growth ?? null;
  const metricPercent = Number(String(metric.value).replace(/[^0-9.-]/g, ''));
  const hasPercentValue = String(metric.value).includes('%') && !Number.isNaN(metricPercent);
  const progressColor = metricPercent < 60 ? 'var(--warning)' : metricPercent < 85 ? 'var(--cyan)' : 'var(--success)';
  return (
    <motion.article
      className={`coo-metric-card tone-${metric.tone}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        {trendValue !== null ? <TrendIndicator value={trendValue} /> : null}
        {hasPercentValue ? <ProgressBar value={metricPercent} max={100} label={metric.label} color={progressColor} /> : null}
      </div>
      <p><span className="live-pulse" />{metric.status}</p>
    </motion.article>
  );
}

function ActiveTasksPanel({ tasks, onOpenTasks, onCreateFollowup, onEscalate }) {
  return (
    <section className="coo-panel">
      <div className="coo-panel-header">
        <div>
          <span>Task Engine Integration</span>
          <h2>Open Operational Tasks</h2>
        </div>
        <ClipboardList size={20} />
      </div>
      <div className="task-action-grid coo-task-actions"><button onClick={onCreateFollowup}>Create Follow-up</button><button onClick={onOpenTasks}>Open Task Engine</button></div>
      <div className="task-grid">
        {tasks.length === 0
          ? <EmptyState icon={ClipboardCheck} title="No tasks" description="No tasks match the current filters." />
          : tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <span>{task.owner || task.owner_command}</span>
              </div>
              <div className="task-meta">
                <StateChip label={task.priority} />
                <StateChip label={task.deadline || task.due_date} />
                <StateChip label={task.status} />
              </div>
              <p>{task.escalation_level}</p>
              <div className="task-action-grid"><button onClick={() => onEscalate(task)}>Escalate Blocker</button><button onClick={onOpenTasks}>Open Task</button></div>
            </article>
          ))}
      </div>
    </section>
  );
}

function OperationalAlertsPanel({ alerts }) {
  return (
    <section className="coo-panel">
      <div className="coo-panel-header">
        <div>
          <span>Risk and recommendation layer</span>
          <h2>Operational Alerts</h2>
        </div>
        <TriangleAlert size={20} />
      </div>
      <div className="coo-alert-list">
        {alerts.map((alert) => (
          <article className="coo-alert-card" key={alert.id}>
            <div>
              <strong>{alert.type}</strong>
              <StateChip label={alert.risk_level} />
            </div>
            <p>{alert.message}</p>
            <dl>
              <div><dt>Action</dt><dd>{alert.recommended_action}</dd></div>
              <div><dt>Owner</dt><dd>{alert.owner}</dd></div>
              <div><dt>Escalation</dt><dd>{alert.escalation_point}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyExecutionPanel({ generatedOutput, onGenerate }) {
  return (
    <section className="coo-panel">
      <div className="coo-panel-header">
        <div>
          <span>Daily operating rhythm</span>
          <h2>Daily Execution Plan</h2>
        </div>
        <Target size={20} />
      </div>
      <div className="execution-phases">
        {Object.entries(dailyExecutionPlan).map(([phase, items]) => (
          <div className="execution-phase" key={phase}>
            <strong>{phase}</strong>
            {items.map((item) => <span key={item}>{item}</span>)}
          </div>
        ))}
      </div>
      <button className="tactical-button coo-wide-button" onClick={onGenerate}>
        Generate Daily COO Plan
      </button>
      {generatedOutput && <GeneratedPanel output={generatedOutput} />}
    </section>
  );
}

function ApprovalRequestsPanel({ requests, onOpenApprovalWall }) {
  const [queuedId, setQueuedId] = useState(null);

  return (
    <section className="coo-panel">
      <div className="coo-panel-header">
        <div>
          <span>Human decision queue</span>
          <h2>Founder Approval Required</h2>
        </div>
        <FileCheck2 size={20} />
      </div>
      <div className="approval-grid">
        {requests.length === 0
          ? <EmptyState icon={CheckCircle2} title="All clear" description="No pending approvals at this time." />
          : requests.map((request) => (
            <article className="approval-card" key={request.id}>
              <div>
                <h3>{request.title}</h3>
                <StateChip label={request.risk_level} />
              </div>
              <p>{request.reason}</p>
              <small>{request.suggested_next_action}</small>
              <button className="ghost-button" onClick={() => setQueuedId(request.id)}>
                {queuedId === request.id ? 'Founder Review Queued' : 'Send to Founder Review'}
              </button>
              <button className="ghost-button" onClick={onOpenApprovalWall}>
                Open Director Queue
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}

const ActivityTimeline = React.memo(function ActivityTimeline({ events = [], entries = [] }) {
  const rows = events.length ? events : entries;
  if (!rows.length) {
    return <EmptyState icon={Activity} title="No recent activity" description="Events will appear here as the OS processes operations." />;
  }
  return (
    <ol className="activity-timeline" aria-label="Activity timeline">
      {rows.map((event, i) => (
        <li key={event.id || i} className="timeline-event">
          <div className="timeline-track" aria-hidden="true">
            <span
              className="timeline-dot"
              style={{
                background:
                  event.type === 'error' ? 'var(--error)' :
                    event.type === 'warning' ? 'var(--warning)' :
                      event.type === 'success' ? 'var(--success)' : 'var(--cyan)',
              }}
            />
            {i < rows.length - 1 && <span className="timeline-line" />}
          </div>
          <div className="timeline-body">
            <div className="timeline-header">
              <span className="timeline-actor">{event.actor || event.module || 'GOPU OS'}</span>
              <time className="notification-timestamp" dateTime={event.time || event.created_at}>
                {event.time
                  ? event.time
                  : event.created_at
                    ? new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Now'}
              </time>
            </div>
            <p className="timeline-event-text">{event.event || event.message || event.title}</p>
            {event.status && <StatusBadge status={event.status} size="sm" />}
          </div>
        </li>
      ))}
    </ol>
  );
});

function Stepper({ steps, current, onChange }) {
  return (
    <nav className="stepper" aria-label="Progress steps">
      <ol className="stepper-list">
        {steps.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          const state   = done ? 'done' : active ? 'active' : 'pending';
          return (
            <li
              key={i}
              className={`stepper-step ${state}`}
              aria-current={active ? 'step' : undefined}
            >
              <button
                className="stepper-node"
                onClick={() => done && onChange && onChange(i)}
                disabled={!done}
                aria-label={`${step.label}${done ? ' - completed' : active ? ' - current' : ' - upcoming'}`}
              >
                {done
                  ? <CheckCircle2 size={16} aria-hidden="true" />
                  : <span aria-hidden="true">{i + 1}</span>
                }
              </button>
              <span className="stepper-label">{step.label}</span>
              {i < steps.length - 1 && (
                <span className="stepper-connector" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function useWizard(totalSteps) {
  const [step, setStep] = React.useState(0);
  const next  = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back  = () => setStep((s) => Math.max(s - 1, 0));
  const goTo  = (i) => setStep(i);
  const reset = () => setStep(0);
  const isFirst = step === 0;
  const isLast  = step === totalSteps - 1;
  return { step, next, back, goTo, reset, isFirst, isLast };
}

const SHIPMENT_WIZARD_STEPS = [
  { label: 'Buyer & Product' },
  { label: 'Logistics'       },
  { label: 'Documents'       },
  { label: 'Review'          },
];

function ShipmentWizard({ onComplete, onCancel, buyers = [] }) {
  const { step, next, back, isFirst, isLast } = useWizard(SHIPMENT_WIZARD_STEPS.length);
  const [form, setForm] = React.useState({
    buyer_id: '', product_name: '', quantity: '', unit: 'KG',
    origin: '', destination: '', incoterm: 'FOB',
    etd: '', eta: '', vessel: '', bl_number: '',
    logistics_notes: '', packing_type: '', marks: '',
  });
  const [errors, setErrors] = React.useState({});
  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  function validateStep() {
    const e = {};
    if (step === 0) {
      if (!form.buyer_id)     e.buyer_id     = 'Select a buyer';
      if (!form.product_name) e.product_name = 'Product name required';
      if (!form.quantity)     e.quantity     = 'Quantity required';
    }
    if (step === 1) {
      if (!form.origin)      e.origin      = 'Origin required';
      if (!form.destination) e.destination = 'Destination required';
      if (!form.etd)         e.etd         = 'ETD required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() { if (validateStep()) next(); }

  return (
    <div className="wizard-shell">
      <Stepper steps={SHIPMENT_WIZARD_STEPS} current={step} />

      <div className="wizard-body">
        {step === 0 && (
          <section className="wizard-section" aria-labelledby="wizard-s0">
            <h3 id="wizard-s0">Buyer & Product Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label field-required">Buyer</span>
                <select value={form.buyer_id} onChange={(e) => update('buyer_id', e.target.value)}>
                  <option value="">Select verified buyer</option>
                  {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
                </select>
                {errors.buyer_id && <span className="field-error-msg" role="alert">{errors.buyer_id}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Product name</span>
                <input value={form.product_name} onChange={(e) => update('product_name', e.target.value)} placeholder="e.g. Red Chilli Powder" />
                {errors.product_name && <span className="field-error-msg" role="alert">{errors.product_name}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Quantity</span>
                <input inputMode="decimal" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="e.g. 500" />
                {errors.quantity && <span className="field-error-msg" role="alert">{errors.quantity}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">Unit</span>
                <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {['KG', 'MT', 'LT', 'PCS', 'BAG', 'DRUM', 'CTN'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </label>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="wizard-section" aria-labelledby="wizard-s1">
            <h3 id="wizard-s1">Logistics Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label field-required">Origin port / city</span>
                <input value={form.origin} onChange={(e) => update('origin', e.target.value)} placeholder="e.g. Nhava Sheva, India" />
                {errors.origin && <span className="field-error-msg" role="alert">{errors.origin}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Destination</span>
                <input value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="e.g. Jebel Ali, UAE" />
                {errors.destination && <span className="field-error-msg" role="alert">{errors.destination}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">Incoterm</span>
                <select value={form.incoterm} onChange={(e) => update('incoterm', e.target.value)}>
                  {['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">ETD</span>
                <input type="date" value={form.etd} onChange={(e) => update('etd', e.target.value)} />
                {errors.etd && <span className="field-error-msg" role="alert">{errors.etd}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">ETA</span>
                <input type="date" value={form.eta} onChange={(e) => update('eta', e.target.value)} />
              </label>
              <label className="wizard-field">
                <span className="field-label">Vessel / Flight</span>
                <input value={form.vessel} onChange={(e) => update('vessel', e.target.value)} placeholder="Optional" />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="wizard-section" aria-labelledby="wizard-s2">
            <h3 id="wizard-s2">Document & Packing Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label">B/L Number</span>
                <input value={form.bl_number} onChange={(e) => update('bl_number', e.target.value)} placeholder="Bill of lading reference" />
              </label>
              <label className="wizard-field">
                <span className="field-label">Packing type</span>
                <select value={form.packing_type} onChange={(e) => update('packing_type', e.target.value)}>
                  <option value="">Select</option>
                  {['Bags', 'Drums', 'Cartons', 'Pallets', 'Bulk', 'Containers'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="wizard-field wizard-field-full">
                <span className="field-label">Shipping marks</span>
                <input value={form.marks} onChange={(e) => update('marks', e.target.value)} placeholder="Marks and numbers on packages" />
              </label>
              <label className="wizard-field wizard-field-full">
                <span className="field-label">Logistics notes</span>
                <textarea value={form.logistics_notes} onChange={(e) => update('logistics_notes', e.target.value)} rows={3} placeholder="Special handling, temperature, hazmat notes..." />
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-section" aria-labelledby="wizard-s3">
            <h3 id="wizard-s3">Review & Confirm</h3>
            <div className="wizard-review-grid">
              {[
                ['Buyer',        buyers.find((b) => b.id === form.buyer_id)?.company_name || '-'],
                ['Product',      form.product_name],
                ['Quantity',     `${form.quantity} ${form.unit}`],
                ['Origin',       form.origin],
                ['Destination',  form.destination],
                ['Incoterm',     form.incoterm],
                ['ETD',          form.etd],
                ['ETA',          form.eta || '-'],
                ['Vessel',       form.vessel || '-'],
                ['B/L Number',   form.bl_number || '-'],
                ['Packing',      form.packing_type || '-'],
              ].map(([label, value]) => (
                <div key={label} className="wizard-review-row">
                  <span className="wizard-review-label">{label}</span>
                  <span className="wizard-review-value">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="wizard-footer">
        <button className="ghost-button" onClick={isFirst ? onCancel : back}>
          <ArrowLeft size={14} aria-hidden="true" />
          {isFirst ? 'Cancel' : 'Back'}
        </button>
        <div className="wizard-step-count" aria-live="polite">
          Step {step + 1} of {SHIPMENT_WIZARD_STEPS.length}
        </div>
        <button className="tactical-button" onClick={isLast ? () => onComplete(form) : handleNext}>
          {isLast ? 'Create Shipment' : 'Continue'}
          {!isLast && <ChevronRight size={14} aria-hidden="true" />}
        </button>
      </footer>
    </div>
  );
}

const SHIPMENT_STAGE_LIST = [
  'Order Confirmed',
  'Production Ready',
  'Pre-Shipment Inspection',
  'Customs Clearance - Export',
  'Port Loading',
  'In Transit',
  'Customs Clearance - Import',
  'Port Discharge',
  'Delivered',
];

const ShipmentProgressTracker = React.memo(function ShipmentProgressTracker({ currentStage, shipment }) {
  const currentIdx = SHIPMENT_STAGE_LIST.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const active = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div className="shipment-tracker" aria-label="Shipment progress">
      <ol className="tracker-steps">
        {SHIPMENT_STAGE_LIST.map((stage, i) => {
          const done    = i < active;
          const current = i === active;
          return (
            <li
              key={i}
              className={`tracker-step ${done ? 'done' : current ? 'current' : 'pending'}`}
              aria-current={current ? 'step' : undefined}
            >
              <div className="tracker-node" aria-hidden="true">
                {done
                  ? <CheckCircle2 size={14} />
                  : current
                    ? <Zap size={14} />
                    : <span>{i + 1}</span>
                }
              </div>
              <span className="tracker-stage-label">{stage}</span>
              {i < SHIPMENT_STAGE_LIST.length - 1 && (
                <span className={`tracker-line ${done ? 'done' : ''}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
      {shipment?.etd && (
        <div className="tracker-meta">
          <span>ETD <time dateTime={shipment.etd}>{new Date(shipment.etd).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>
          {shipment.eta && <span>ETA <time dateTime={shipment.eta}>{new Date(shipment.eta).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>}
          {shipment.vessel && <span>Vessel - {shipment.vessel}</span>}
        </div>
      )}
    </div>
  );
});

function COOIntelligenceLayer({ memory, selectedMode, setSelectedMode, promptValue, setPromptValue, onAction }) {
  return (
    <aside className="coo-panel coo-intelligence-layer">
      <div className="coo-panel-header">
        <div>
          <span>Memory and planning</span>
          <h2>COO Intelligence Layer</h2>
        </div>
        <BrainCircuit size={20} />
      </div>
      <MemoryStatusCard memory={memory} />
      <PlanningModeSelector selectedMode={selectedMode} onSelect={setSelectedMode} />
      <CommandPromptBox value={promptValue} onChange={setPromptValue} />
      <div className="coo-action-stack">
        <button onClick={() => onAction('daily')}><CalendarClock size={15} />Generate Daily Plan</button>
        <button onClick={() => onAction('bottlenecks')}><TriangleAlert size={15} />Review Bottlenecks</button>
        <button onClick={() => onAction('sop')}><Workflow size={15} />Draft SOP Update</button>
        <button onClick={() => onAction('founder')}><Send size={15} />Prepare Founder Summary</button>
      </div>
      <div className="coo-mode-note">
        <strong>Mode readiness</strong>
        <p>Connect Supabase to activate uses static sample data. Connected Memory Mode and Automation Mode are prepared for future backend tables and workflow triggers.</p>
        <small>Automation cannot finalise legal, customs, banking, tax, contract, or irreversible financial actions.</small>
      </div>
    </aside>
  );
}

function MemoryStatusCard({ memory }) {
  return (
    <div className="memory-status-card">
      <strong>Memory Status</strong>
      {memory.map((item) => (
        <div key={item.id}>
          <span>{item.memory_type}</span>
          <small>{item.content}</small>
        </div>
      ))}
    </div>
  );
}

function PlanningModeSelector({ selectedMode, onSelect }) {
  return (
    <div className="planning-mode-selector">
      <strong>Planning Mode</strong>
      <div>
        {planningModes.map((mode) => (
          <button className={selectedMode === mode ? 'active' : ''} onClick={() => onSelect(mode)} key={mode}>
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandPromptBox({ value, onChange }) {
  return (
    <label className="command-prompt-box">
      <span>Command Prompt</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask COO Command to review operations, create a plan, detect bottlenecks, or prepare founder summary."
      />
    </label>
  );
}

function GeneratedPanel({ output }) {
  return (
    <motion.div
      className="local-generated-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <strong>{output.title}</strong>
      {output.lines.map((line) => <p key={line}>{line}</p>)}
    </motion.div>
  );
}


export default COOCommandPage;
