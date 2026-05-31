import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  FileBarChart,
  Mail,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TriangleAlert,
  Workflow,
  Zap
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { SeverityBadge, StatusBadge } from '../shared/uiPrimitives.jsx';
import { demoTenantId } from '../services/companyService.js';
import { createAutomationLogEntry, loadAutomationCenter } from '../services/automationService.js';

function formatDisplayDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Live feed';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function getAutomationState(status) {
  if (status === 'Failed' || status === 'Blocked' || status === 'Critical') return 'error';
  if (status === 'Attention' || status === 'Retry Pending' || status === 'Waiting Approval') return 'attention';
  if (status === 'Monitoring' || status === 'Retrying' || status === 'Connect Supabase to activate' || status === 'Paused') return 'progress';
  return 'online';
}
const automationWorkflowDefaults = [
  ['Lead Intake Automation', 'Active', 'Lead Created', '94%', 1, 'Monitoring', 'Lead Intake'],
  ['Pricing Approval Automation', 'Monitoring', 'Margin Risk Detected', '91%', 0, 'Waiting Approval', 'Pricing Engine'],
  ['Invoice Validation Automation', 'Attention', 'Invoice Draft Created', '88%', 2, 'Retry Pending', 'Invoice System'],
  ['Founder Approval Routing', 'Active', 'Approval Required', '96%', 0, 'Monitoring', 'Director Queue'],
  ['Daily Briefing Generator', 'Active', 'Scheduled 8:39 AM', '93%', 1, 'Monitoring', 'Morning Briefing'],
  ['WhatsApp Command Parser', 'Connect Supabase to activate', 'Inbound Founder Message', '90%', 0, 'Monitoring', 'WhatsApp Command'],
  ['Task Escalation Engine', 'Monitoring', 'Task Overdue / Blocked', '92%', 1, 'Retry Pending', 'Task Engine'],
  ['Content Scheduling Engine', 'Paused', 'Daily Content Runbook', '86%', 0, 'Founder Approval', 'Content Engine'],
  ['API Monitoring Alerts', 'Failed', 'Health Check Failure', '79%', 3, 'Retry Pending', 'CTO Monitoring']
].map(([workflow_name, status, trigger_type, success_rate, failure_count, retry_state, affected_module], index) => ({
  id: `automation-${index}`,
  workflow_name,
  status,
  trigger_type,
  last_execution: index % 3 === 0 ? 'Just now' : index % 3 === 1 ? '12 min ago' : 'Today 08:39',
  success_rate,
  failure_count,
  retry_state,
  affected_module
}));

const automationEventFlows = [
  {
    id: 'lead-flow',
    title: 'Lead to pricing approval chain',
    status: 'Monitoring',
    steps: ['Lead Created', 'COO Workflow Triggered', 'Pricing Request Created', 'CFO Validation Required', 'Founder Approval Requested', 'Invoice Draft Triggered']
  },
  {
    id: 'invoice-flow',
    title: 'Invoice validation blocker chain',
    status: 'Attention',
    steps: ['Invoice Validation Failed', 'Task Created', 'COO Alert Triggered', 'Founder Attention Flagged']
  },
  {
    id: 'whatsapp-flow',
    title: 'WhatsApp command routing chain',
    status: 'Connect Supabase to activate',
    steps: ['WhatsApp Input', 'Command Parsing', 'Lead / Pricing / Invoice Routing', 'Approval Trigger', 'Founder Response Draft']
  }
];

const automationLogDefaults = [
  ['Pricing Approval Automation', 'Margin Risk Detected', '10:14', 'Waiting Approval', 0, 'Pricing Engine', 'Founder approval required before quote release.'],
  ['Invoice Validation Automation', 'Invoice Draft Created', '10:31', 'Blocked', 1, 'Invoice System', 'LUT details incomplete.'],
  ['Task Escalation Engine', 'Task Overdue', '11:00', 'Retrying', 1, 'Task Engine', 'Owner notification queued in local state.'],
  ['API Monitoring Alerts', 'Forex API Timeout', '11:20', 'Failed', 2, 'CTO Monitoring', 'Forex feed timeout detected.'],
  ['Daily Briefing Generator', 'Scheduled 8:39 AM', '08:39', 'Monitoring', 0, 'Morning Briefing', 'Briefing sources prepared for review.']
].map(([workflow_name, trigger, execution_time, status, retry_count, affected_module, failure_reason], index) => ({
  id: `automation-log-${index}`,
  workflow_name,
  trigger,
  execution_time,
  status,
  retry_count,
  affected_module,
  failure_reason
}));

const automationFailureDefaults = [
  ['API Monitoring Alerts', 'Forex feed timeout detected in local monitor.', 2, 'Forex snapshot refresh', 'High', 'CTO Command', 'Retry Pending'],
  ['Invoice Validation Automation', 'LUT details incomplete for invoice release.', 1, 'GOPU-INV-DRAFT', 'Critical', 'CFO Command + Founder', 'Blocked'],
  ['Task Escalation Engine', 'Blocked workflow requires founder attention.', 0, 'Supplier packing confirmation', 'Medium', 'COO Command', 'Attention']
].map(([workflow_name, failure_reason, retry_count, affected_workflow, severity, escalation_target, retry_state], index) => ({
  id: `automation-failure-${index}`,
  workflow_name,
  failure_reason,
  retry_count,
  affected_workflow,
  severity,
  escalation_target,
  retry_state
}));

const automationRuleDefaults = [
  ['Overdue task owner notification', 'Task overdue by 1 day', 'Notify owner', 'Owner', 'Active'],
  ['COO escalation', 'Task overdue by 2 days', 'Escalate to COO Command', 'COO Command', 'Active'],
  ['Founder blocked workflow', 'Workflow blocked', 'Founder attention flag', 'Founder', 'Active'],
  ['Invoice blocker escalation', 'Invoice release affected', 'Create CFO + Founder task', 'CFO + Founder', 'Active'],
  ['Technical incident routing', 'Website/API/form affected', 'Create CTO alert', 'CTO Command', 'Active'],
  ['Risky public claim routing', 'Public claim/content risk', 'Create CMO + Founder approval', 'CMO + Founder', 'Active']
].map(([rule_name, trigger_condition, target_action, escalation_path, active_status], index) => ({
  id: `automation-rule-${index}`,
  rule_name,
  trigger_condition,
  target_action,
  escalation_path,
  active_status
}));

const ctoAutomationAlerts = [
  ['Forex API timeout alerts', 'High', 'Pricing Engine / Forex Snapshot', 'CTO Command', 'Retry then escalate'],
  ['Low credit alerts', 'Attention', 'OpenAI / News API', 'Founder + CTO', 'Founder notification draft'],
  ['Subscription expiry alerts', 'Medium', 'Vercel / SaaS tools', 'CTO Command', 'Renewal review'],
  ['Failed deployment alerts', 'Critical', 'Production deploy pipeline', 'CTO + Founder', 'Pause automation'],
  ['Workflow failure alerts', 'High', 'Automation Center', 'CTO Command', 'Open logs and retry']
];

function AutomationCenter({ navigate, onBack, view = 'automation-center' }) {
  const [automations, setAutomations] = useState(automationWorkflowDefaults);
  const [logs, setLogs] = useState(automationLogDefaults);
  const [failures, setFailures] = useState(automationFailureDefaults);
  const [selectedFlow, setSelectedFlow] = useState(view === 'workflow-events' ? 'invoice-flow' : 'lead-flow');
  const [notice, setNotice] = useState('Controlled automation console ready in Connect Supabase to activate.');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let disposed = false;
    async function load() {
      const result = await loadAutomationCenter(demoTenantId);
      if (disposed) return;
      const mapped = (result.data.automations || []).map((item, index) => ({
        ...automationWorkflowDefaults[index % automationWorkflowDefaults.length],
        ...item,
        success_rate: item.success_rate ? `${item.success_rate}%` : automationWorkflowDefaults[index % automationWorkflowDefaults.length].success_rate,
        last_execution: item.last_execution ? formatDisplayDate(item.last_execution) : automationWorkflowDefaults[index % automationWorkflowDefaults.length].last_execution
      }));
      setAutomations(result.backend.mode === 'Connected' && mapped.length ? mapped : automationWorkflowDefaults);
      if (result.backend.mode === 'Connected' && result.data.logs?.length) setLogs(result.data.logs.map((log, index) => ({
        ...automationLogDefaults[index % automationLogDefaults.length],
        ...log,
        trigger: log.trigger || automationLogDefaults[index % automationLogDefaults.length].trigger,
        execution_time: log.execution_time ? formatDisplayDate(log.execution_time) : automationLogDefaults[index % automationLogDefaults.length].execution_time
      })));
      if (result.backend.mode === 'Connected' && result.data.failures?.length) setFailures(result.data.failures.map((failure, index) => ({
        ...automationFailureDefaults[index % automationFailureDefaults.length],
        ...failure,
        affected_workflow: automationFailureDefaults[index % automationFailureDefaults.length].affected_workflow,
        retry_count: automationFailureDefaults[index % automationFailureDefaults.length].retry_count
      })));
      setNotice(result.backend.mode === 'Connected' ? 'Backend Connected - workflow automation tables available.' : 'Connect Supabase to activate - backend not connected; actions update local state only.');
    }
    load();
    return () => {
      disposed = true;
    };
  }, []);

  function simulateTrigger(workflow) {
    setAutomations((current) => current.map((item) => item.id === workflow.id ? { ...item, status: 'Monitoring', last_execution: 'Just now', retry_state: 'Waiting Approval' } : item));
    setLogs((current) => [createAutomationLogEntry(workflow.workflow_name, 'Waiting Approval', workflow.affected_module), ...current]);
    setNotice(`${workflow.workflow_name} prepared a controlled local event. External systems were not executed.`);
  }

  function simulateRetry(failureId) {
    setFailures((current) => current.map((failure) => failure.id === failureId ? { ...failure, retry_count: failure.retry_count + 1, retry_state: 'Retry Pending' } : failure));
    const failure = failures.find((item) => item.id === failureId);
    if (failure) setLogs((current) => [createAutomationLogEntry(failure.workflow_name, 'Retrying', failure.affected_workflow), ...current]);
    setNotice('Retry simulated locally. No external workflow or n8n job was executed.');
  }

  function simulateEscalation(failureId) {
    setFailures((current) => current.map((failure) => failure.id === failureId ? { ...failure, retry_state: 'Attention' } : failure));
    setNotice('Escalation prepared for founder/executive review in local state.');
  }

  function generateSummary() {
    const failedCount = failures.filter((failure) => ['High', 'Critical'].includes(failure.severity)).length;
    setSummary(`Automation Summary\n\n1. Active/Monitoring workflows: ${automations.filter((item) => ['Active', 'Monitoring'].includes(item.status)).length}\n2. High-impact failures: ${failedCount}\n3. Retry queue: ${failures.filter((item) => item.retry_state === 'Retry Pending').length}\n4. Founder-safe rule: approvals, invoice releases, buyer documents, pricing, and legal-sensitive decisions remain blocked until founder approval.\n5. Recommended action: review Invoice Validation Automation and API Monitoring Alerts before enabling connected automation.`);
  }

  return (
    <ExportOSShell className="automation-shell">
      <header className="deck-header automation-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'workflow-events' ? 'Workflow Event Engine' : view === 'automation-logs' ? 'Automation Execution Logs' : 'Workflow Automation Layer'}</h1>
          <p>Controlled triggers, event routing, retries, notifications, approvals, logs, and n8n integration readiness.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={notice.includes('Backend Connected') ? 'Backend Connected' : 'Connect Supabase to activate'} state={notice.includes('Backend Connected') ? 'online' : 'progress'} />
          <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/workflow-events')}><Workflow size={15} />Events</button>
          <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/automation-logs')}><FileBarChart size={15} />Logs</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="automation-hero">
        <div>
          <span className="coo-kicker">Controlled Workflow Automation</span>
          <h2>Business events route work, approvals, tasks, and executive attention.</h2>
          <p>AI may recommend, prepare, route, summarize, generate drafts, and trigger controlled workflows. It may not finalize legal, invoice, pricing, buyer document, or financial actions without founder approval.</p>
        </div>
        <div className="automation-hero-metrics">
          {[
            ['Automations', automations.length],
            ['Failures', failures.length],
            ['Retry Pending', failures.filter((item) => item.retry_state === 'Retry Pending').length],
            ['Approval Gates', 'Protected']
          ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="briefing-model-strip">
        {['workflow_automations', 'workflow_events', 'automation_logs', 'automation_failures', 'automation_rules', 'workflow_memory'].map((model) => <code key={model}>{model}</code>)}
      </section>

      <main className="automation-layout">
        <section className="automation-left-stack">
          <section className="automation-panel">
            <div className="approval-section-header"><div><span>Automation Center</span><h2>Workflow controls</h2></div><Zap size={18} /></div>
            <div className="automation-card-list">
              {automations.map((workflow) => <WorkflowAutomationCard key={workflow.id} workflow={workflow} onTrigger={() => simulateTrigger(workflow)} />)}
            </div>
          </section>
          <TaskEscalationAutomation rules={automationRuleDefaults} />
        </section>

        <section className="automation-center-stack">
          <EventEngineFlow flows={automationEventFlows} selectedFlow={selectedFlow} onSelect={setSelectedFlow} />
          <MorningBriefingAutomation />
          <WhatsAppAutomationPanel />
          <ContentEngineAutomation />
        </section>

        <aside className="automation-right-stack">
          <FailureRetryPanel failures={failures} onRetry={simulateRetry} onEscalate={simulateEscalation} />
          <AutomationExecutionLogs logs={logs} />
          <CTOAlertAutomation alerts={ctoAutomationAlerts} />
          <WorkflowMemoryPanel onGenerate={generateSummary} summary={summary} />
          <N8nIntegrationPanel />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function WorkflowAutomationCard({ workflow, onTrigger }) {
  return (
    <article className="automation-card">
      <div>
        <StatusBadge label={workflow.status} state={getAutomationState(workflow.status)} />
        <span>{workflow.trigger_type}</span>
      </div>
      <h3>{workflow.workflow_name}</h3>
      <div className="automation-card-stats">
        <small>Last execution <strong>{workflow.last_execution}</strong></small>
        <small>Success rate <strong>{workflow.success_rate}</strong></small>
        <small>Failures <strong>{workflow.failure_count}</strong></small>
        <small>Retry state <strong>{workflow.retry_state}</strong></small>
      </div>
      <button onClick={onTrigger}>Simulate Trigger</button>
    </article>
  );
}

function EventEngineFlow({ flows, selectedFlow, onSelect }) {
  const active = flows.find((flow) => flow.id === selectedFlow) || flows[0];
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Workflow Event Engine</span><h2>{active.title}</h2></div><Network size={18} /></div>
      <div className="automation-flow-tabs">
        {flows.map((flow) => <button key={flow.id} className={flow.id === active.id ? 'active' : ''} onClick={() => onSelect(flow.id)}>{flow.title}</button>)}
      </div>
      <div className="automation-event-chain">
        {active.steps.map((step, index) => (
          <div key={step}>
            <i>{index + 1}</i>
            <span>{step}</span>
            {index < active.steps.length - 1 && <ChevronRight size={14} />}
          </div>
        ))}
      </div>
      <StatusBadge label={active.status} state={getAutomationState(active.status)} />
    </section>
  );
}

function AutomationExecutionLogs({ logs }) {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Automation Execution Logs</span><h2>Event evidence</h2></div><FileBarChart size={18} /></div>
      <div className="automation-log-list">
        {logs.slice(0, 7).map((log) => (
          <article key={log.id}>
            <div><strong>{log.workflow_name}</strong><StatusBadge label={log.status} state={getAutomationState(log.status)} /></div>
            <p>{log.failure_reason || 'Execution record prepared for workflow audit.'}</p>
            <footer><span>{log.trigger || log.affected_module}</span><span>{log.execution_time}</span><span>Retries: {log.retry_count}</span></footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function FailureRetryPanel({ failures, onRetry, onEscalate }) {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Retry & Failure Control</span><h2>Failed / blocked automations</h2></div><TriangleAlert size={18} /></div>
      <div className="automation-failure-list">
        {failures.map((failure) => (
          <article key={failure.id}>
            <div><strong>{failure.workflow_name}</strong><SeverityBadge severity={failure.severity} /></div>
            <p>{failure.failure_reason}</p>
            <dl>
              <div><dt>Retry count</dt><dd>{failure.retry_count}</dd></div>
              <div><dt>Affected workflow</dt><dd>{failure.affected_workflow}</dd></div>
              <div><dt>Escalation</dt><dd>{failure.escalation_target}</dd></div>
              <div><dt>Retry state</dt><dd>{failure.retry_state}</dd></div>
            </dl>
            <div className="automation-action-row">
              <button onClick={() => onRetry(failure.id)}>Retry</button>
              <button onClick={() => onEscalate(failure.id)}>Escalate</button>
              <button>Pause</button>
              <button>Open Logs</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskEscalationAutomation({ rules }) {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Task Escalation Automation</span><h2>Editable local rules</h2></div><TimerReset size={18} /></div>
      <div className="automation-rule-list">
        {rules.map((rule) => (
          <article key={rule.id}>
            <StatusBadge label={rule.active_status} state="online" />
            <strong>{rule.rule_name}</strong>
            <span>If: {rule.trigger_condition}</span>
            <span>Then: {rule.target_action}</span>
            <small>Escalation path: {rule.escalation_path}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function MorningBriefingAutomation() {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Morning Briefing Automation</span><h2>Daily 8:39 AM WhatsApp briefing workflow</h2></div><CalendarClock size={18} /></div>
      <div className="automation-status-grid">
        {[
          ['Sources', 'COO, CFO, CTO, CMO'],
          ['Output', 'Founder Morning Briefing'],
          ['Delivery Channel', 'WhatsApp only'],
          ['Status', 'Scheduled'],
          ['Last Run', 'Today 08:39 IST'],
          ['Next Run', 'Tomorrow 08:39 IST'],
          ['Failures', '1 attention item']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}

function WhatsAppAutomationPanel() {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>WhatsApp Automation</span><h2>Daily briefing + overdue approval escalation</h2></div><Mail size={18} /></div>
      <div className="automation-status-grid">
        {[
          ['Channel scope', 'Daily briefing / overdue approval only'],
          ['Webhook status', 'Webhook Pending'],
          ['Parser status', 'Connect Supabase to activate'],
          ['Approvals', 'Slack by default'],
          ['Hourly briefing', 'Route to Slack'],
          ['Routing status', 'Routing Prepared'],
          ['Response policy', 'Draft only']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="automation-mini-flow"><span>Daily Briefing</span><span>Approval Time Breach</span><span>WhatsApp Draft</span><span>Founder Review</span><span>No OTP/log storage</span></div>
    </section>
  );
}

function CTOAlertAutomation({ alerts }) {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>CTO Alert Automation</span><h2>Technical escalation routes</h2></div><RadioTower size={18} /></div>
      <div className="automation-alert-list">
        {alerts.map(([title, severity, module, escalation, retry]) => (
          <article key={title}>
            <div><strong>{title}</strong><SeverityBadge severity={severity} /></div>
            <span>{module}</span>
            <small>{escalation} - {retry}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContentEngineAutomation() {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Content Engine Automation</span><h2>Daily 8:39 AM IST runbook</h2></div><Sparkles size={18} /></div>
      <div className="automation-mini-flow content">
        {['LinkedIn scheduler', 'Reel planner', 'YouTube workflow', 'Competitor scan', 'Content approval routing'].map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

function WorkflowMemoryPanel({ onGenerate, summary }) {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>Workflow Intelligence Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div>
      <div className="automation-memory-list">
        {['Recurring failures', 'Retry patterns', 'Blocked workflow history', 'Successful automation chains', 'Approval bottlenecks', 'Escalation patterns'].map((item) => <span key={item}>{item}</span>)}
      </div>
      <button className="tactical-button command-button" onClick={onGenerate}>Generate Automation Summary <ChevronRight size={16} /></button>
      {summary && <pre className="automation-summary">{summary}</pre>}
    </section>
  );
}

function N8nIntegrationPanel() {
  return (
    <section className="automation-panel">
      <div className="approval-section-header"><div><span>n8n Integration Prep</span><h2>Not Connected</h2></div><Workflow size={18} /></div>
      <div className="automation-status-grid">
        {[
          ['Connection status', 'Not Connected'],
          ['Webhook endpoints', 'Prepared'],
          ['Queue health', 'Connect Supabase to activate'],
          ['Workflow count', '0 connected / 9 planned'],
          ['Retry queue', '3 local items'],
          ['Environment', 'Production-ready structure']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}


export default AutomationCenter;
