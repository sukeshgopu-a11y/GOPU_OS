import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Boxes,
  BrainCircuit,
  Building2,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileText,
  Gauge,
  Mail,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
  Workflow
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { SeverityBadge, StatusBadge, StatusPulse } from '../shared/uiPrimitives.jsx';
import { displayDateTime } from '../utils/dateTime.js';
import { demoTenantId } from '../services/companyService.js';
import {
  escalateWorkflowBlocker,
  getWorkflowDependencyEngineData,
  runDependencyScan,
  validateWorkflowDependencies
} from '../services/workflowDependencyService.js';
import {
  generateTimelineTasksAndAlerts,
  getMasterWorkflowById,
  getWorkflowJourneyDashboard
} from '../services/operationalTimelineService.js';

export default function WorkflowDependencyEngine({ navigate, onBack }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedBlocker, setSelectedBlocker] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadEngine() {
    const response = await getWorkflowDependencyEngineData();
    setData(response.data);
    setSelectedWorkflow((current) => current ? response.data.workflows.find((workflow) => workflow.id === current.id) || response.data.workflows[0] : response.data.workflows[0]);
  }

  useEffect(() => {
    loadEngine();
  }, []);

  async function inspectWorkflow(workflow) {
    const response = await validateWorkflowDependencies(workflow.id);
    setSelectedWorkflow(response.data.workflow);
    setSelectedBlocker(null);
  }

  async function scanDependencies() {
    const response = await runDependencyScan(demoTenantId);
    setNotice(response.data.message);
    await loadEngine();
  }

  async function escalateBlocker(blocker) {
    const response = await escalateWorkflowBlocker(blocker);
    setSelectedBlocker(response.data);
    setNotice(response.data.escalation_note);
  }

  const summary = data?.summary;

  return (
    <ExportOSShell className="workflow-guidance-shell workflow-dependency-shell">
      <header className="deck-header workflow-guidance-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Workflow Dependency & Blocker Engine</h1>
          <p>Central dependency validation, blocker detection, next-step guidance, escalation logic, task creation, and alert orchestration.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${summary?.blockerCount || 0} blockers`} state={(summary?.criticalCount || 0) ? 'error' : 'attention'} />
          <StatusBadge label={`${summary?.averageHealth || 0}% health`} state={(summary?.averageHealth || 0) < 55 ? 'attention' : 'progress'} />
          <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <div className="vault-action-status workflow-guidance-notice"><StatusPulse /><span>{notice}</span></div>}

      {!data ? <section className="workflow-guidance-panel guidance-loading"><StatusPulse /><strong>Loading dependency engine...</strong></section> : (
        <>
          <section className="dependency-metric-grid">
            {[
              ['Workflows Watched', summary.workflowCount, 'Monitoring'],
              ['Open Blockers', summary.blockerCount, summary.blockerCount ? 'Attention' : 'Healthy'],
              ['Critical Blockers', summary.criticalCount, summary.criticalCount ? 'Critical' : 'Healthy'],
              ['Average Health', `${summary.averageHealth}%`, summary.averageHealth < 55 ? 'High Risk' : 'Monitoring']
            ].map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={status === 'Critical' || status === 'High Risk' ? 'error' : status === 'Attention' ? 'attention' : 'progress'} /></article>)}
          </section>

          <main className="workflow-dependency-layout">
            <aside className="workflow-dependency-side">
              <section className="workflow-guidance-panel">
                <div className="approval-section-header"><div><span>Workflow Coverage</span><h2>Dependency validation queue</h2></div><Workflow size={18} /></div>
                <div className="dependency-workflow-list">
                  {data.workflows.map((workflow) => <button key={workflow.id} className={selectedWorkflow?.id === workflow.id ? 'active' : ''} onClick={() => inspectWorkflow(workflow)}>
                    <div><strong>{workflow.title}</strong><SeverityBadge severity={workflow.health.riskLevel} /></div>
                    <span>{workflow.workflowType} / {workflow.stage}</span>
                    <i><b style={{ width: `${workflow.health.healthScore}%` }} /></i>
                    <small>{workflow.health.healthScore}% dependency completion / {workflow.blockers.length} blocker(s)</small>
                  </button>)}
                </div>
                <div className="workflow-guidance-actions stacked">
                  <button className="tactical-button" onClick={scanDependencies}>Run Dependency Scan</button>
                  <button className="ghost-button" onClick={() => navigate('/export-os/tasks')}>Open Created Tasks</button>
                  <button className="ghost-button" onClick={() => navigate('/export-os/notifications')}>Open Alert Center</button>
                </div>
              </section>
              <WorkflowHealthScore health={selectedWorkflow?.health} summary={summary} />
            </aside>

            <section className="workflow-dependency-main">
              {selectedWorkflow && <DependencyValidationPanel workflow={selectedWorkflow} onOpen={navigate} onInspect={setSelectedBlocker} />}
              <BlockerEngine blockers={data.blockers} onOpen={navigate} onInspect={setSelectedBlocker} onEscalate={escalateBlocker} />
              <WorkflowGuidancePanel guidance={selectedWorkflow?.guidance} onOpen={navigate} />
            </section>

            <aside className="workflow-dependency-right">
              <ShipmentGuidancePanel rows={data.shipmentGuidance} />
              <CertificationReminderPanel rows={data.certificationReminders} />
              <EscalationPanel blockers={data.blockers} onOpen={navigate} onInspect={setSelectedBlocker} />
            </aside>
          </main>
        </>
      )}

      {(selectedWorkflow || selectedBlocker) && (
        <WorkflowDetailDrawer
          workflow={selectedWorkflow}
          blocker={selectedBlocker}
          onClose={() => setSelectedBlocker(null)}
          onOpen={navigate}
          onScan={scanDependencies}
          onEscalate={escalateBlocker}
        />
      )}
    </ExportOSShell>
  );
}

function WorkflowHealthScore({ health, summary }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Workflow Health Score</span><h2>{health?.riskLevel || 'Monitoring'}</h2></div><Gauge size={18} /></div>
      <div className="dependency-health-ring">
        <strong>{health?.healthScore ?? summary?.averageHealth ?? 0}%</strong>
        <span>Dependency completion</span>
      </div>
      <p>{summary?.nextAction || 'Resolve critical blockers first, then rerun validation before workflow release.'}</p>
    </section>
  );
}

function DependencyValidationPanel({ workflow, onOpen, onInspect }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Dependency Validation</span><h2>{workflow.title}</h2></div><ClipboardCheck size={18} /></div>
      <div className="dependency-chain-list">
        {workflow.dependencies.map((dependency, index) => <button key={dependency.id} className={`dependency-step ${dependency.status.toLowerCase().replaceAll(' ', '-')}`} onClick={() => dependency.status === 'Passed' ? onOpen(dependency.linked_route) : onInspect(workflow.blockers.find((blocker) => blocker.blocker_type === dependency.dependency_name))}>
          <i>{index + 1}</i>
          <div><strong>{dependency.dependency_name}</strong><span>{dependency.owner}</span></div>
          <StatusBadge label={dependency.status} state={dependency.status === 'Passed' ? 'online' : dependency.status === 'Monitoring' ? 'progress' : 'attention'} />
        </button>)}
      </div>
    </section>
  );
}

function BlockerEngine({ blockers, onOpen, onInspect, onEscalate }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Blocker Engine</span><h2>Automatically detected workflow blockers</h2></div><TriangleAlert size={18} /></div>
      <div className="dependency-blocker-list">
        {blockers.map((blocker) => <article key={blocker.id} className="dependency-blocker-card" role="button" tabIndex={0} onClick={() => onInspect(blocker)} onKeyDown={(event) => event.key === 'Enter' && onInspect(blocker)}>
          <div><strong>{blocker.blocker_type}</strong><SeverityBadge severity={blocker.severity} /></div>
          <p>{blocker.business_impact}</p>
          <dl>
            <div><dt>Workflow</dt><dd>{blocker.workflow_title}</dd></div>
            <div><dt>Owner</dt><dd>{blocker.owner}</dd></div>
            <div><dt>Status</dt><dd>{blocker.status}</dd></div>
          </dl>
          <footer>
            <button onClick={(event) => { event.stopPropagation(); onOpen(blocker.linked_route); }}>Open Workflow</button>
            <button onClick={(event) => { event.stopPropagation(); onEscalate(blocker); }}>Escalate</button>
          </footer>
        </article>)}
      </div>
    </section>
  );
}

function WorkflowGuidancePanel({ guidance, onOpen }) {
  if (!guidance) return null;
  const rows = [
    ['Next Action', guidance.next_action],
    ['Recommended Owner', guidance.recommended_owner],
    ['Suggested Timeline', guidance.suggested_timeline],
    ['Operational Risk', guidance.operational_risk],
    ['Suggested Escalation', guidance.suggested_escalation],
    ['Missing Requirements', 'Resolve all Failed dependencies before stage progression.']
  ];
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Next-Step Guidance Engine</span><h2>{guidance.workflow_type} workflow guidance</h2></div><Route size={18} /></div>
      <div className="dependency-guidance-list">{rows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="workflow-guidance-actions">
        <button className="tactical-button" onClick={() => onOpen('/export-os/tasks')}>Open Task Engine</button>
        <button className="ghost-button" onClick={() => onOpen('/export-os/director')}>Open Director Queue</button>
      </div>
    </section>
  );
}

function ShipmentGuidancePanel({ rows }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Shipment Guidance Engine</span><h2>Logistics timing suggestions</h2></div><Route size={18} /></div>
      <div className="dependency-mini-list">{rows.map(([type, suggestion, timeline, owner]) => <article key={`${type}-${suggestion}`}><strong>{type}</strong><p>{suggestion}</p><small>{timeline} / {owner}</small></article>)}</div>
    </section>
  );
}

function CertificationReminderPanel({ rows }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Certification & Lab Reminders</span><h2>AI Operational Suggestion</h2></div><FileCheck2 size={18} /></div>
      <div className="dependency-mini-list">{rows.map(([type, suggestion, risk]) => <article key={`${type}-${risk}`}><strong>{type}</strong><p>{suggestion}</p><small>{risk}</small></article>)}</div>
      <p>These reminders are advisory only. Final legal, export, HSN, origin, lab, and certification decisions require human review.</p>
    </section>
  );
}

function EscalationPanel({ blockers, onOpen, onInspect }) {
  const urgent = blockers.filter((blocker) => ['Critical', 'High Risk', 'High'].includes(blocker.severity)).slice(0, 5);
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Escalation Logic</span><h2>Executive routing</h2></div><Bell size={18} /></div>
      <div className="dependency-mini-list">{urgent.map((blocker) => <button key={blocker.id} onClick={() => onInspect(blocker)}>
        <strong>{blocker.blocker_type}</strong>
        <SeverityBadge severity={blocker.severity} />
        <span>{blocker.escalation_target}</span>
      </button>)}</div>
      <button className="ghost-button" onClick={() => onOpen('/export-os/notifications')}>Open Notifications</button>
    </section>
  );
}

function WorkflowDetailDrawer({ workflow, blocker, onClose, onOpen, onScan, onEscalate }) {
  const activeBlocker = blocker || workflow?.blockers?.[0];
  if (!workflow && !activeBlocker) return null;
  return (
    <div className="dependency-drawer-backdrop" onClick={onClose}>
      <aside className="coo-operational-drawer dependency-detail-drawer" role="dialog" aria-modal="true" aria-label="Workflow dependency detail" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Workflow Detail Drawer</span><h2>{activeBlocker?.workflow_title || workflow?.title}</h2></div>
          <button className="drawer-back-button" onClick={onClose}><ArrowLeft size={15} />Back</button>
        </header>
        {activeBlocker && <section className="drawer-section urgent">
          <span>Blocker Reason</span>
          <p>{activeBlocker.blocker_reason}</p>
          <div className="drawer-badge-row"><SeverityBadge severity={activeBlocker.severity} /><StatusBadge label={activeBlocker.status} state={activeBlocker.status === 'Escalated' ? 'error' : 'attention'} /></div>
        </section>}
        <section className="drawer-section">
          <span>Business Impact</span>
          <p>{activeBlocker?.business_impact || workflow?.guidance?.operational_risk}</p>
        </section>
        <section className="drawer-section">
          <span>Owner / Escalation</span>
          <p>{activeBlocker?.owner || workflow?.owner} / {activeBlocker?.escalation_target || workflow?.guidance?.suggested_escalation}</p>
        </section>
        <section className="drawer-section">
          <span>Next Action</span>
          <p>{activeBlocker?.next_action || workflow?.guidance?.next_action}</p>
        </section>
        {workflow && <section className="drawer-section">
          <span>Dependency Chain</span>
          <div className="drawer-dependency-stack">{workflow.dependencies.map((dependency) => <button key={dependency.id} onClick={() => onOpen(dependency.linked_route)}><strong>{dependency.dependency_name}</strong><StatusBadge label={dependency.status} state={dependency.status === 'Passed' ? 'online' : dependency.status === 'Monitoring' ? 'progress' : 'attention'} /></button>)}</div>
        </section>}
        <footer>
          <button onClick={() => onOpen(activeBlocker?.linked_route || workflow?.route)}>Open Workflow</button>
          <button onClick={onScan}>Create Task + Alert</button>
          {activeBlocker && <button onClick={() => onEscalate(activeBlocker)}>Escalate</button>}
          <button onClick={() => onOpen('/export-os/director')}>Request Approval</button>
          <button onClick={() => onOpen('/export-os/tasks')}>Open Task</button>
        </footer>
      </aside>
    </div>
  );
}

export function WorkflowJourneyDashboard({ navigate, onBack }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [filter, setFilter] = useState('All');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadJourney() {
    const response = await getWorkflowJourneyDashboard();
    setData(response.data);
    setSelectedWorkflow((current) => current ? response.data.workflows.find((workflow) => workflow.id === current.id) || response.data.workflows[0] : response.data.workflows[0]);
  }

  useEffect(() => {
    loadJourney();
  }, []);

  async function generateTasks() {
    const response = await generateTimelineTasksAndAlerts(selectedWorkflow?.id || data.workflows[0].id, demoTenantId);
    setNotice(response.data.message);
    await loadJourney();
  }

  const workflows = data?.workflows || [];
  const visibleWorkflows = filter === 'All' ? workflows : workflows.filter((workflow) => workflow.risk_level === filter || workflow.current_stage === filter);
  const stages = selectedWorkflow?.timeline || [];

  return (
    <ExportOSShell className="workflow-guidance-shell operational-timeline-shell">
      <header className="deck-header workflow-guidance-header">
        <div className="deck-header-copy"><span>GOPU Export OS</span><h1>Operational Timeline</h1><p>Unified Workflow Journey connecting leads, pricing, approvals, invoices, tasks, suppliers, warehouse, and shipments.</p></div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${data?.summary?.blockedStages || 0} blocked stages`} state={(data?.summary?.blockedStages || 0) ? 'attention' : 'progress'} />
          <StatusBadge label={`${data?.summary?.approvalsRequired || 0} approvals`} state="attention" />
          <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <div className="vault-action-status workflow-guidance-notice"><StatusPulse /><span>{notice}</span></div>}

      {!data ? <section className="workflow-guidance-panel guidance-loading"><StatusPulse /><strong>Loading master operational journey...</strong></section> : (
        <>
          <section className="timeline-summary-grid">
            {[
              ['Master Workflows', data.summary.workflowCount, 'Monitoring'],
              ['Blocked Stages', data.summary.blockedStages, data.summary.blockedStages ? 'Attention' : 'Healthy'],
              ['Approval Gates', data.summary.approvalsRequired, 'Approval Required'],
              ['Average Journey Health', `${data.summary.averageHealth}%`, data.summary.averageHealth < 55 ? 'High Risk' : 'Monitoring']
            ].map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={status === 'High Risk' ? 'error' : status === 'Attention' || status === 'Approval Required' ? 'attention' : 'progress'} /></article>)}
          </section>

          <section className="timeline-filter-bar">
            {['All', 'Critical', 'High Risk', 'Attention', 'Invoice Validation', 'Commercial Feasibility'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
            <button className="tactical-button" onClick={generateTasks}>Generate Timeline Tasks + Alerts</button>
          </section>

          <main className="operational-timeline-layout">
            <aside className="timeline-workflow-list">
              {visibleWorkflows.map((workflow) => <button key={workflow.id} className={selectedWorkflow?.id === workflow.id ? 'active' : ''} onClick={() => { setSelectedWorkflow(workflow); setSelectedStage(null); }}>
                <div><strong>{workflow.buyer}</strong><SeverityBadge severity={workflow.risk_level} /></div>
                <span>{workflow.country} / {workflow.products}</span>
                <small>{workflow.current_stage} / {workflow.owner}</small>
                <i><b style={{ width: `${workflow.scores.workflowCompletion}%` }} /></i>
              </button>)}
            </aside>

            <section className="timeline-main">
              {selectedWorkflow && <WorkflowSummaryPanel workflow={selectedWorkflow} navigate={navigate} />}
              {selectedWorkflow && <MasterWorkflowTimeline workflow={selectedWorkflow} selectedStage={selectedStage} onSelect={setSelectedStage} navigate={navigate} />}
              {selectedWorkflow && <TimelineLinkedWorkflowPanels workflow={selectedWorkflow} navigate={navigate} />}
            </section>

            <aside className="timeline-side">
              {selectedWorkflow && <OperationalHealthScore scores={selectedWorkflow.scores} status={selectedWorkflow.operational_health} />}
              {selectedWorkflow && <ExecutiveRecommendationPanel notes={selectedWorkflow.executiveNotes} />}
              {selectedStage && <WorkflowStageDetailPanel stage={selectedStage} navigate={navigate} onGenerate={generateTasks} />}
            </aside>
          </main>
        </>
      )}
    </ExportOSShell>
  );
}

function MasterWorkflowTimeline({ workflow, selectedStage, onSelect, navigate }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Master Workflow Timeline</span><h2>{workflow.workflow_type}</h2></div><Route size={18} /></div>
      <div className="master-timeline-rail">
        {workflow.timeline.map((stage, index) => <WorkflowStageCard key={stage.id} stage={stage} index={index} active={selectedStage?.id === stage.id} onSelect={onSelect} navigate={navigate} />)}
      </div>
    </section>
  );
}

function WorkflowStageCard({ stage, index, active, onSelect, navigate }) {
  return (
    <button className={`workflow-stage-card ${active ? 'active' : ''} status-${stage.status.toLowerCase().replaceAll(' ', '-')}`} onClick={() => onSelect(stage)}>
      <i>{index + 1}</i>
      <div className="workflow-stage-card-main">
        <div><strong>{stage.stage_name}</strong><StatusBadge label={stage.status} state={stage.status === 'Blocked' || stage.status === 'Escalated' ? 'error' : stage.status === 'Approval Required' || stage.status === 'Review Required' || stage.status === 'Delayed' ? 'attention' : 'progress'} /></div>
        <span>{stage.owner} / {new Date(stage.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {active && <p>{stage.next_action}</p>}
      </div>
    </button>
  );
}

function WorkflowSummaryPanel({ workflow, navigate }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Workflow Summary</span><h2>{workflow.id}</h2></div><Gauge size={18} /></div>
      <div className="workflow-summary-grid">
        {[
          ['Buyer', workflow.buyer],
          ['Country', workflow.country],
          ['Products', workflow.products],
          ['Quantity', workflow.quantity],
          ['Shipment Type', workflow.shipment_type],
          ['Current Stage', workflow.current_stage],
          ['Owner', workflow.owner],
          ['Risk', workflow.risk_level]
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className="workflow-guidance-actions">
        <a className="tactical-button" href={`/export-os/workflows/${workflow.id}`}>Open Master Workflow</a>
        <button className="ghost-button" onClick={() => navigate('/export-os/workflow-engine')}>Open Dependency Engine</button>
      </div>
    </section>
  );
}

export function WorkflowDetailPage({ workflowId, navigate, onBack }) {
  const [workflow, setWorkflow] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function loadWorkflow() {
      const response = await getMasterWorkflowById(workflowId);
      if (!active) return;
      setWorkflow(response.data);
      setSelectedStage(response.data.timeline.find((stage) => stage.status === 'Blocked') || response.data.timeline[0]);
    }
    loadWorkflow();
    return () => { active = false; };
  }, [workflowId]);

  async function generateTasks() {
    const response = await generateTimelineTasksAndAlerts(workflowId, demoTenantId);
    setNotice(response.data.message);
  }

  return (
    <ExportOSShell className="workflow-guidance-shell operational-timeline-shell">
      <header className="deck-header workflow-guidance-header">
        <div className="deck-header-copy"><span>GOPU Export OS</span><h1>Master Workflow Command Page</h1><p>Source of operational truth for buyer, pricing, approval, invoice, shipment, supplier, warehouse, and communication events.</p></div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={workflow?.risk_level || 'Loading'} state={workflow?.risk_level === 'Critical' || workflow?.risk_level === 'High Risk' ? 'error' : 'attention'} />
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} />Back to Workflows</button>
        </div>
      </header>
      {notice && <div className="vault-action-status workflow-guidance-notice"><StatusPulse /><span>{notice}</span></div>}
      {!workflow ? <section className="workflow-guidance-panel guidance-loading"><StatusPulse /><strong>Loading workflow command page...</strong></section> : (
        <main className="workflow-detail-layout">
          <section className="timeline-main">
            <WorkflowSummaryPanel workflow={workflow} navigate={navigate} />
            <MasterWorkflowTimeline workflow={workflow} selectedStage={selectedStage} onSelect={setSelectedStage} navigate={navigate} />
            <WorkflowDetailSections workflow={workflow} selectedStage={selectedStage} navigate={navigate} onGenerate={generateTasks} />
          </section>
          <aside className="timeline-side">
            <OperationalHealthScore scores={workflow.scores} status={workflow.operational_health} />
            <ExecutiveRecommendationPanel notes={workflow.executiveNotes} />
            {selectedStage && <WorkflowStageDetailPanel stage={selectedStage} navigate={navigate} onGenerate={generateTasks} />}
          </aside>
        </main>
      )}
    </ExportOSShell>
  );
}

function WorkflowDetailSections({ workflow, selectedStage, navigate, onGenerate }) {
  return (
    <div className="workflow-detail-grid">
      <WorkflowInfoPanel title="Buyer Intelligence" icon={UsersRound} rows={[['Buyer', workflow.buyer], ['Country', workflow.country], ['Risk', workflow.risk_level], ['Next communication', 'Draft only until approvals pass']]} />
      <WorkflowInfoPanel title="Pricing Status" icon={Calculator} rows={[['State', 'CFO Review'], ['Risk', 'Freight/margin validation pending'], ['Route', '/export-os/pricing-engine']]} navigate={navigate} route="/export-os/pricing-engine" />
      <WorkflowInfoPanel title="Approval Status" icon={ShieldCheck} rows={workflow.approvalTimeline} navigate={navigate} route="/export-os/director" />
      <WorkflowInfoPanel title="Invoice Status" icon={FileText} rows={[['Invoice', 'LUT export invoice draft'], ['Validation', 'Blocked'], ['Release', 'Final PDF disabled until approval']]} navigate={navigate} route="/export-os/invoices/new" />
      <WorkflowInfoPanel title="Shipment Status" icon={Route} rows={workflow.shipmentTimeline} navigate={navigate} route={`/export-os/shipments/${workflow.shipment_id}`} />
      <WorkflowInfoPanel title="Supplier Coordination" icon={Building2} rows={[['Supplier confirmation', 'Pending'], ['Quality review', 'Required'], ['Follow-up', 'COO action needed']]} navigate={navigate} route="/export-os/suppliers/supplier-malabar-spice" />
      <WorkflowInfoPanel title="Warehouse Allocation" icon={Boxes} rows={[['Stock', 'Available'], ['Batch reservation', 'Blocked'], ['Packing materials', 'Attention']]} navigate={navigate} route="/export-os/warehouse" />
      <WorkflowCommunicationTimeline rows={workflow.communicationTimeline} />
      <ApprovalTimelinePanel rows={workflow.approvalTimeline} />
      <ShipmentTimelinePanel rows={workflow.shipmentTimeline} />
      <WorkflowInfoPanel title="Workflow Guidance Engine" icon={Sparkles} rows={[[selectedStage?.stage_name || 'Selected Stage', selectedStage?.next_action || 'Select a stage'], ['Owner', selectedStage?.owner || workflow.owner], ['Escalation', selectedStage?.escalation_state || 'Monitoring']]} navigate={navigate} route="/export-os/workflow-engine" />
      <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Action Orchestration</span><h2>Tasks, alerts, escalations</h2></div><Bell size={18} /></div><p>Timeline events generate tasks and alert objects for blocked, delayed, and approval-required stages. No external emails or shipments are claimed.</p><div className="workflow-guidance-actions"><button className="tactical-button" onClick={onGenerate}>Generate Tasks + Alerts</button><button className="ghost-button" onClick={() => navigate('/export-os/tasks')}>Open Tasks</button><button className="ghost-button" onClick={() => navigate('/export-os/notifications')}>Open Alerts</button></div></section>
    </div>
  );
}

function WorkflowInfoPanel({ title, icon: Icon, rows, navigate, route }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>Linked workflow evidence</h2></div><Icon size={18} /></div>
      <div className="workflow-info-list">{rows.map((row) => <article key={`${title}-${row[0]}-${row[1]}`}><span>{row[0]}</span><strong>{row[1]}</strong>{row[2] && <small>{row[2]}</small>}</article>)}</div>
      {route && <button className="ghost-button" onClick={() => navigate(route)}>Open Linked Workflow</button>}
    </section>
  );
}

function TimelineLinkedWorkflowPanels({ workflow, navigate }) {
  const links = [
    ['Pricing', '/export-os/pricing-engine', 'CFO review, margin and freight checks'],
    ['Invoice', '/export-os/invoices/new', 'LUT validation and release controls'],
    ['Director Queue', '/export-os/director', 'Founder approval gates'],
    ['Tasks', '/export-os/tasks', 'Blockers and next actions'],
    ['Shipment', `/export-os/shipments/${workflow.shipment_id}`, 'Dispatch and CHA coordination'],
    ['Supplier', '/export-os/suppliers/supplier-malabar-spice', 'Supplier confirmation and quality review'],
    ['Warehouse', '/export-os/warehouse', 'Batch reservation and packing materials'],
    ['Documents', '/export-os/document-factory', 'Buyer release and export package readiness']
  ];
  return <section className="workflow-guidance-panel"><div className="approval-section-header"><div><span>Linked Workflow Panels</span><h2>Open connected systems</h2></div><Network size={18} /></div><div className="timeline-linked-grid">{links.map(([label, route, note]) => <button key={label} onClick={() => navigate(route)}><strong>{label}</strong><span>{note}</span><ArrowUpRight size={15} /></button>)}</div></section>;
}

function OperationalHealthScore({ scores, status }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Operational Health Score</span><h2>{status}</h2></div><Gauge size={18} /></div>
      <div className="timeline-score-list">
        {Object.entries(scores).map(([label, value]) => <article key={label}><div><span>{label.replaceAll(/([A-Z])/g, ' $1')}</span><strong>{value}%</strong></div><i><b style={{ width: `${value}%` }} /></i></article>)}
      </div>
    </section>
  );
}

function ExecutiveRecommendationPanel({ notes }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Executive Recommendations</span><h2>COO / CFO / CTO / CMO / CIO</h2></div><BrainCircuit size={18} /></div>
      <div className="executive-note-list">{notes.map(([executive, recommendation, severity]) => <article key={executive}><div><strong>{executive}</strong><SeverityBadge severity={severity} /></div><p>{recommendation}</p></article>)}</div>
    </section>
  );
}

function WorkflowStageDetailPanel({ stage, navigate, onGenerate }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>Stage Detail</span><h2>{stage.stage_name}</h2></div><Eye size={18} /></div>
      <div className="workflow-info-list">
        {[
          ['Status', stage.status],
          ['Owner', stage.owner],
          ['Blocker', stage.blocker || 'No blocker recorded'],
          ['Approvals', stage.approvals.join(', ') || 'Monitoring'],
          ['Linked Documents', stage.linked_documents.join(', ') || 'None'],
          ['Linked Tasks', stage.linked_tasks.join(', ') || 'None'],
          ['Next Action', stage.next_action],
          ['Escalation', stage.escalation_state]
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className="workflow-guidance-actions stacked">
        <button className="tactical-button" onClick={() => navigate(stage.linked_route)}>Open Linked Workflow</button>
        <button className="ghost-button" onClick={onGenerate}>Generate Task + Alert</button>
        <button className="ghost-button" onClick={() => navigate('/export-os/director')}>Open Director Queue</button>
      </div>
    </section>
  );
}

function WorkflowCommunicationTimeline({ rows }) {
  return <TimelinePanel title="Communication History" icon={Mail} rows={rows} />;
}

function ApprovalTimelinePanel({ rows }) {
  return <TimelinePanel title="Approval Timeline" icon={ShieldCheck} rows={rows} />;
}

function ShipmentTimelinePanel({ rows }) {
  return <TimelinePanel title="Shipment Timeline" icon={Route} rows={rows} />;
}

function TimelinePanel({ title, icon: Icon, rows }) {
  return (
    <section className="workflow-guidance-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>Audit-ready sequence</h2></div><Icon size={18} /></div>
      <div className="compact-timeline-list">{rows.map((row, index) => <article key={`${title}-${row[0]}`}><i>{index + 1}</i><div><strong>{row[0]}</strong><StatusBadge label={row[1]} state={row[1] === 'Blocked' ? 'error' : row[1] === 'Approval Required' || row[1] === 'Review Required' || row[1] === 'Delayed' ? 'attention' : 'progress'} /><span>{row[2]}</span>{row[3] && <p>{row[3]}</p>}</div></article>)}</div>
    </section>
  );
}
