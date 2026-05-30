import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Archive, BarChart3, Bell,
  Bookmark, Bot, Boxes, BrainCircuit, Building2, Calculator, CalendarDays,
  CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck,
  ClipboardList, Command, Database, Eye, ExternalLink, FileCheck2, FileBarChart,
  FileText, Factory, Fingerprint, Gauge, Gem, Keyboard, KeyRound, LockKeyhole,
  LayoutDashboard, Mail, Menu, Network, PackageCheck, Palette, Plug, Printer,
  RadioTower, Route, ScanLine, Search, Send, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Sprout, TrendingUp, Target, TimerReset, TriangleAlert, UploadCloud,
  User, UsersRound, Workflow, X, Zap
} from 'lucide-react';
import { supabase, isSupabaseConfigured, backendStatus } from '../lib/supabaseClient';
import { demoTenantId } from '../services/companyService.js';
import { addApprovalComment, approveRequest, createApprovalRequest, escalateRequest, getApprovalQueue, needsReviewRequest, rejectRequest, requestSensitiveActionApproval, requestRevision } from '../services/approvalService.js';
import { directorBranches, getDirectorCommandData } from '../services/directorService.js';
import { createCOOFollowupTask, getCOOSummary } from '../services/cooService.js';
import { addTaskComment, createTaskFromWorkflow, getTasks, updateTaskStatus as updateWorkflowTaskStatus, writeTaskAuditLog } from '../services/taskService.js';
import { createAuditLog, listAuditLogs } from '../services/auditService.js';
// Shared components from main.jsx (resolved at runtime — main chunk loads first)
import { ExportOSShell, Breadcrumb, StatusBadge, TrendIndicator, EmptyState, SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonKpiBar, MetricSkeletonGrid, HBarChart, SortableTableHeader, StatusPulse, PriorityBadge, SeverityBadge, Panel, StatusPill, StateChip, SignalList, MiniBars, BulkActionBar, FilterBar, VirtualList, useSortable } from '../main.jsx';

function DirectorCommandCenter({ navigate, onBack, onOpenTasks }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('Director queue loading...');
  const [followups, setFollowups] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [commandInput, setCommandInput] = useState('');
  const [commandResponse, setCommandResponse] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [decisionFilter, setDecisionFilter] = useState('All');
  const [decisionSort, setDecisionSort] = useState('Urgency');
  const [directorData, setDirectorData] = useState({
    whatsappActions: [],
    globalOpportunities: [],
    worldwideTradeEvents: [],
    executiveEventStream: [],
    workflowDelayIntelligence: [],
    executivePerformanceInsights: [],
    operationalHeatmap: [],
    warRoomItems: [],
    aiRecommendations: []
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;
    async function loadDirectorQueue() {
      const result = await getDirectorCommandData(demoTenantId);
      if (disposed) return;
      const sourceItems = [...(result.data?.queue || []), ...approvalWallRequests];
      const uniqueItems = Array.from(new Map(sourceItems.map((item) => [item.id, item])).values());
      const merged = sortDirectorItems(uniqueItems.map((request, index) => normalizeDirectorItem(request, index)));
      setItems(merged);
      setDirectorData({
        whatsappActions: result.data?.whatsappActions || [],
        globalOpportunities: result.data?.globalOpportunities || [],
        worldwideTradeEvents: result.data?.worldwideTradeEvents || [],
        executiveEventStream: result.data?.executiveEventStream || [],
        workflowDelayIntelligence: result.data?.workflowDelayIntelligence || [],
        executivePerformanceInsights: result.data?.executivePerformanceInsights || [],
        operationalHeatmap: result.data?.operationalHeatmap || [],
        warRoomItems: result.data?.warRoomItems || [],
        aiRecommendations: result.data?.aiRecommendations || []
      });
      setSelectedId((current) => current && merged.some((item) => item.id === current) ? current : null);
      setMessage(result.backend?.mode === 'Connected' ? 'Live Connected - Director queue synced.' : 'Integration pending - Director queue awaiting Supabase sync.');
    }
    loadDirectorQueue();
    const onCreated = (event) => {
      const next = normalizeDirectorItem(event.detail, 0);
      setItems((current) => sortDirectorItems([next, ...current.filter((item) => item.id !== next.id)]));
      setSelectedId(next.id);
      setMessage('New executive decision routed to Director Command Center.');
    };
    window.addEventListener('gopu:approval-created', onCreated);
    return () => {
      disposed = true;
      window.removeEventListener('gopu:approval-created', onCreated);
    };
  }, []);

  const selectedItem = items.find((item) => item.id === selectedId) || null;
  const summary = getDirectorSummary(items, followups, directorData);
  const visibleDecisions = sortDirectorDecisionItems(filterDirectorDecisionItems(items, decisionFilter), decisionSort);
  const criticalAttentionItems = items
    .filter((item) => ['Critical', 'High'].includes(item.priority) || ['Critical', 'High'].includes(item.risk_level) || item.status === 'Escalated')
    .slice(0, 4);

  function replaceDirectorItem(updatedItem) {
    setItems((current) => sortDirectorItems(current.map((item) => item.id === updatedItem.id ? { ...item, ...updatedItem, last_updated_by: 'Director', updated_at: new Date().toISOString() } : item)));
  }

  async function runDirectorAction(item, action) {
    if (!item || !action) return;
    if (action === 'Open Workflow') {
      navigate(item.linked_route || getDirectorLinkedRoute(item));
      return;
    }
    if (action.startsWith('Assign ')) {
      const assignedExecutive = `${action.replace('Assign ', '')} Command`;
      replaceDirectorItem({ ...item, source_executive: assignedExecutive, owner: assignedExecutive, status: 'Review Required' });
      setMessage(`${item.title} assigned to ${assignedExecutive}. Director queue remains synced.`);
      return;
    }
    let result;
    if (item.approval_request) {
      if (action === 'Approve') result = await approveRequest(demoTenantId, item.approval_request, note);
      if (action === 'Reject') result = await rejectRequest(demoTenantId, item.approval_request, note);
      if (action === 'Need Clarification') result = await requestRevision(demoTenantId, item.approval_request, note || 'Director requested clarification from source executive.');
      if (action === 'Escalate') result = await escalateRequest(demoTenantId, item.approval_request, note || 'Director escalated workflow for executive coordination.');
    }
    const nextStatus = {
      Approve: 'Approved',
      Reject: 'Rejected',
      'Need Clarification': 'Clarification Needed',
      Escalate: 'Escalated'
    }[action] || item.status;
    replaceDirectorItem({
      ...item,
      status: nextStatus,
      action_history: [...(item.action_history || []), { actor: 'Director', action, notes: note || `${action} recorded.`, created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }],
      approval_request: result?.data || item.approval_request
    });
    setMessage(`${action} recorded for ${item.title}. Source workflow sync prepared.`);
    if (action === 'Approve') announceToSR('Request approved successfully');
    if (action === 'Reject') announceToSR('Request rejected', 'assertive');
    setNote('');
  }

  function syncWhatsAppAction(action) {
    const target = items.find((item) => item.id === action.queue_id) || items[0];
    if (!target) return;
    const actionType = action.founder_message.toLowerCase().includes('approve') ? 'Approve' : action.founder_message.toLowerCase().includes('reject') ? 'Reject' : action.founder_message.toLowerCase().includes('escalate') ? 'Escalate' : 'Need Clarification';
    runDirectorAction(target, actionType);
    setDirectorData((current) => ({
      ...current,
      whatsappActions: current.whatsappActions.map((item) => item.id === action.id ? { ...item, sync_status: 'Processed' } : item)
    }));
    setMessage(`WhatsApp Director action synced: ${action.founder_message}`);
  }

  function runFollowupEngine() {
    const delayed = items.filter((item) => !['Approved', 'Rejected', 'Auto-Resolved'].includes(item.status) && item.waiting_hours >= 1);
    const created = delayed.map((item) => ({
      id: `director-followup-${item.id}-${Date.now()}`,
      queue_id: item.id,
      followup_type: item.waiting_hours >= 48 ? 'AI recommendation prepared' : item.waiting_hours >= 24 ? 'Escalation visibility increased' : 'Owner reminder sent',
      sent_to: item.source_executive,
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }));
    setFollowups((current) => [...created, ...current].slice(0, 12));
    setMessage(`${created.length} Director follow-up reminders generated. High-risk items remain human-review only.`);
  }

  function runDirectorCommand(queryText = commandInput) {
    const query = queryText.trim();
    if (!query) return;
    const directRoute = getDirectorDirectOpenRoute(query);
    if (directRoute) {
      setCommandResponse({
        query,
        routedExecutives: ['COO Command'],
        summary: 'Opening the new lead intake form.',
        currentStatus: 'Lead intake form route found.',
        risks: 'Monitoring. Validate buyer information before pricing.',
        pendingItems: ['New buyer lead form'],
        recommendedNextAction: 'Capture buyer, product, quantity, destination, and contact details.',
        responsibleExecutive: 'COO Command',
        confidence: 'High',
        urgency: 'Monitoring',
        linkedWorkflows: [directRoute]
      });
      setCommandHistory((current) => [{
        id: `director-query-${Date.now()}`,
        query_text: query,
        routed_executives: ['COO Command'],
        response_summary: 'Opened new lead intake form.',
        linked_workflows: [directRoute],
        created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      }, ...current].slice(0, 8));
      setCommandInput('');
      setMessage('Opening new lead form.');
      navigate(directRoute);
      return;
    }
    if (query.toLowerCase().startsWith('open ') && !directRoute) {
      setCommandResponse(buildDirectorCommandErrorResponse(query, `Error: I could not find a connected route for "${query}".`));
      setCommandInput('');
      setMessage(`Error: route not found for "${query}".`);
      return;
    }
    const response = buildDirectorCommandResponse(query, items, directorData);
    setCommandResponse(response);
    setCommandHistory((current) => [{
      id: `director-query-${Date.now()}`,
      query_text: query,
      routed_executives: response.routedExecutives,
      response_summary: response.summary,
      linked_workflows: response.linkedWorkflows,
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }, ...current].slice(0, 8));
    setCommandInput('');
    setMessage(`Director command routed to ${response.routedExecutives.join(' + ')}.`);
  }

  const agentColours = { CIO: '#6366f1', CFO: '#f59e0b', COO: '#10b981', CMO: '#ec4899', CTO: '#3b82f6' };
  const isLive = message.toLowerCase().includes('live') || message.toLowerCase().includes('synced');
  const actionOptions = ['Approve', 'Reject', 'Clarify', 'Escalate', 'Assign CIO', 'Assign CFO', 'Assign COO', 'Assign CMO', 'Assign CTO'];

  const priorityAccent = { Critical: '#ff5a5a', High: '#f59e0b', Medium: '#2ef2ff', Low: '#2ef2ff' };
  const statTiles = [
    { label: 'Pending Decisions', value: items.length, icon: <Activity size={20} />, accent: '#2ef2ff' },
    { label: 'Critical', value: items.filter((item) => item.priority === 'Critical').length, icon: <AlertTriangle size={20} />, accent: '#ff5a5a' },
    { label: 'Waiting >24h', value: items.filter((item) => item.waiting_hours >= 24).length, icon: <Clock size={20} />, accent: '#f59e0b' },
    { label: 'Agent Messages', value: directorData.agentActivityFeed?.length || 0, icon: <Zap size={20} />, accent: '#818cf8' },
    { label: 'System Health', value: backendStatus.mode === 'Connected' ? 'Live' : 'Offline', icon: <ShieldCheck size={20} />, accent: backendStatus.mode === 'Connected' ? '#22c55e' : '#ff5a5a', live: backendStatus.mode === 'Connected' },
  ];

  return (
    <div className="director-command-page">
      <header className="director-glow-header">
        <div className="director-glow-orb" aria-hidden="true" />
        <button className="director-back-link" onClick={onBack}><ArrowLeft size={15} /> Back</button>
        <div className="director-glow-title">
          <h1>Director Command</h1>
          <p>All agents report here. You make the final call.</p>
        </div>
        <button className="tactical-button" onClick={onOpenTasks}>Open Tasks</button>
      </header>

      <div className="director-stat-tiles">
        {statTiles.map((tile) => (
          <div key={tile.label} className={`director-stat-tile${tile.live ? ' director-stat-tile--live' : ''}`} style={{ '--tile-accent': tile.accent }}>
            <span className="director-stat-icon">{tile.icon}</span>
            <strong className="director-stat-value">{tile.value}</strong>
            <span className="director-stat-label">{tile.label}</span>
          </div>
        ))}
      </div>

      <section className="director-queue-panel">
        <div className="dir-table-toolbar">
          <div className="dir-toolbar-left">
            <h2>Decision Queue</h2>
            <span className="dir-count-badge">{visibleDecisions.length} decisions</span>
          </div>
          <div className="dir-toolbar-right">
            <div className="dir-filter-group">
              <span className="dir-toolbar-label">Filter</span>
              {['All', 'Critical', 'High', 'Pending'].map((filter) => (
                <button
                  key={filter}
                  className={`dir-filter-pill${decisionFilter === filter ? ' active' : ''}`}
                  onClick={() => setDecisionFilter(filter)}
                >{filter}</button>
              ))}
            </div>
            <div className="dir-sort-group">
              <span className="dir-toolbar-label">Sort</span>
              <select
                className="dir-sort-select"
                value={decisionSort}
                onChange={(e) => setDecisionSort(e.target.value)}
              >
                <option value="Urgency">Urgency</option>
                <option value="Date">Date (Newest)</option>
                <option value="Amount">Amount (High→Low)</option>
                <option value="Priority">Priority</option>
              </select>
            </div>
          </div>
        </div>

        {visibleDecisions.length === 0 ? (
          <div className="director-empty-state">
            <CheckCircle2 size={34} />
            <p>No pending decisions. All agents are running autonomously.</p>
          </div>
        ) : (
          <div className="dir-table-wrap">
            <table className="dir-decision-table">
              <thead>
                <tr>
                  <th className="dir-th-sno">S.No</th>
                  <th className="dir-th-priority">Priority</th>
                  <th className="dir-th-title">Decision / Buyer</th>
                  <th className="dir-th-agent">Agent</th>
                  <th className="dir-th-date">Date</th>
                  <th className="dir-th-amount">Amount</th>
                  <th className="dir-th-wait">Waiting</th>
                  <th className="dir-th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleDecisions.map((item, index) => {
                  const prio = String(item.priority || 'Medium');
                  const accent = priorityAccent[prio] || '#2ef2ff';
                  const role = Object.keys(agentColours).find((k) => (item.source_executive || '').toUpperCase().includes(k)) || 'COO';
                  return (
                    <tr key={item.id} className="dir-table-row" style={{ '--card-accent': accent }}>
                      <td className="dir-td-sno">{index + 1}</td>
                      <td className="dir-td-priority">
                        <span className={`director-priority-badge director-priority-${prio.toLowerCase()}`} style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>{prio}</span>
                      </td>
                      <td className="dir-td-title">
                        <strong className="dir-table-title">{item.title}</strong>
                        {item.buyer_name && <span className="dir-table-buyer">{item.buyer_name}</span>}
                      </td>
                      <td className="dir-td-agent">
                        <span className="dir-agent-chip" style={{ color: agentColours[role], borderColor: agentColours[role] + '44' }}>{role}</span>
                      </td>
                      <td className="dir-td-date">{item.date_added || '—'}</td>
                      <td className="dir-td-amount">
                        {item.quotation_amount
                          ? <span className="dir-table-amount">₹{Number(item.quotation_amount).toLocaleString('en-IN')}</span>
                          : <span className="dir-table-na">—</span>}
                      </td>
                      <td className="dir-td-wait">
                        <span className={item.waiting_hours >= 24 ? 'dir-wait-overdue' : 'dir-wait-ok'}>
                          {item.waiting_hours != null ? `${item.waiting_hours}h` : '—'}
                        </span>
                      </td>
                      <td className="dir-td-action">
                        <div className="dir-table-actions">
                          <button className="dir-btn-approve" onClick={() => runDirectorAction(item, 'Approve')}>Approve</button>
                          <button className="dir-btn-reject" onClick={() => runDirectorAction(item, 'Reject')}>Reject</button>
                          <button className="dir-btn-ghost" onClick={() => runDirectorAction(item, 'Need Clarification')}>Clarify</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="director-main-grid director-main-grid--agent-only">
        <aside className="director-agent-feed" style={{ gridColumn: '1 / -1' }}>
          <div className="director-queue-header">
            <h2>Agent Activity</h2>
            <span className="dir-live-dot" aria-label="Live" />
          </div>
          {(directorData.agentActivityFeed || []).length === 0 ? (
            <div className="director-feed-empty">
              <p>Agents are active. Activity will appear here as decisions are routed.</p>
            </div>
          ) : (
            <div>
              {(directorData.agentActivityFeed || []).map((entry, index) => {
                const role = Object.keys(agentColours).find((key) => (entry.agent || entry.role || '').toUpperCase().includes(key)) || 'CIO';
                return (
                  <div key={entry.id || index} className="director-agent-entry">
                    <span className={`director-agent-dot agent-dot-${role.toLowerCase()}`} />
                    <div>
                      <span className="dir-agent-role" style={{ color: agentColours[role] }}>{role}</span>
                      <strong>{entry.subject || entry.title || `${role} update`}</strong>
                      <span>{entry.message || entry.subject || ''}</span>
                      <time>{entry.time || entry.created_at || entry.timestamp || 'Now'}</time>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <DirectorCommandConsole
        value={commandInput}
        setValue={setCommandInput}
        onRun={runDirectorCommand}
        response={commandResponse}
        history={commandHistory}
        navigate={navigate}
        onEscalate={() => selectedItem && runDirectorAction(selectedItem, 'Escalate')}
        onCreateFollowup={runFollowupEngine}
      />
    </div>
  );
}

function DirectorExecutiveHeader({ now, summary, onBack, onOpenTasks }) {
  return (
    <header className="director-executive-header">
      <div className="director-title-block">
        <button className="director-back-link" onClick={onBack}><ArrowLeft size={15} />Command Deck</button>
        <span>GOPU Export OS</span>
        <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'Director Console' }]} />
        <h1>Director Command Center</h1>
        <p>Founder-level approvals, escalations, blocked workflows, and business-critical decision control.</p>
      </div>
      <div className="director-header-tools">
        <div className="director-session-pill"><ShieldCheck size={15} /><span>Session verified</span></div>
        <StatusBadge label={`${summary.critical} critical`} state={summary.critical ? 'error' : 'progress'} />
        <StatusBadge label={`${summary.escalated} escalated`} state={summary.escalated ? 'attention' : 'progress'} />
        <div className="director-date-pill"><CalendarClock size={15} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        <button className="tactical-button" onClick={onOpenTasks}><Workflow size={15} />Tasks</button>
      </div>
    </header>
  );
}

function DirectorDecisionSummaryStrip({ summary }) {
  const cards = [
    ['Pending decisions', summary.dueToday, 'Awaiting Director action'],
    ['Critical escalations', summary.critical, 'Highest risk first'],
    ['High-risk issues', summary.highRisk, 'Buyer or workflow exposure'],
    ['Blocked workflows', summary.waiting24 + summary.waiting48, 'Delayed beyond target'],
    ['Payment or document issues', summary.shipmentRisks + summary.escalated, 'Needs controlled release']
  ];
  return (
    <section className="director-decision-summary-strip" aria-label="Director decision summary">
      {cards.map(([label, value, caption]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <p>{caption}</p>
        </article>
      ))}
    </section>
  );
}

function DirectorDecisionQueue({ items, totalCount, selectedId, filter, sort, onFilter, onSort, onSelect, onAction }) {
  const actions = ['Approve', 'Need Clarification', 'Escalate', 'Open Workflow', 'Assign COO', 'Assign CFO', 'Assign CTO', 'Assign CMO', 'Assign CIO', 'Reject'];
  const filters = ['All', 'Critical', 'Finance', 'Operations', 'Documents', 'Buyer Risk', 'Resolved'];
  return (
    <section className="director-main-queue">
      <div className="director-section-heading">
        <div>
          <span>Main action zone</span>
          <h2>Pending Executive Decisions</h2>
          <p>{items.length} of {totalCount} decisions shown. Click any row for the detail drawer.</p>
        </div>
        <Command size={18} />
      </div>
      <div className="director-decision-toolbar">
        <div className="director-filter-tabs" role="tablist" aria-label="Decision filters">
          {filters.map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>
          ))}
        </div>
        <label className="director-sort-control">
          <span>Sort</span>
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option>Urgency</option>
            <option>Wait Time</option>
            <option>Impact</option>
          </select>
        </label>
      </div>
      <div className="director-decision-table" role="table" aria-label="Pending executive decisions">
        <div className="director-decision-table-head" role="row">
          <span>Issue</span>
          <span>Executive</span>
          <span>Wait</span>
          <span>Impact</span>
          <span>Urgency</span>
          <span>Action</span>
        </div>
        {items.map((item) => (
          <article
            key={item.id}
            className={`director-decision-row-clean ${selectedId === item.id ? 'selected' : ''}`}
            onClick={() => onSelect(item.id)}
            tabIndex={0}
            role="row"
            onKeyDown={(event) => event.key === 'Enter' && onSelect(item.id)}
          >
            <div className="director-row-issue" role="cell">
              <strong>{item.title}</strong>
              <span>{item.work_type} - {normalizeDirectorStatus(item.status)}</span>
            </div>
            <span role="cell">{item.source_executive}</span>
            <span role="cell">{item.waiting_since}</span>
            <span role="cell">{getDirectorImpactLabel(item)}</span>
            <div role="cell"><PriorityBadge priority={item.priority || item.risk_level || 'Medium'} /></div>
            <div className="director-row-action" role="cell" onClick={(event) => event.stopPropagation()}>
              <select aria-label={`Action for ${item.title}`} defaultValue="" onChange={(event) => { const action = event.target.value; event.target.value = ''; onAction(item, action); }}>
                <option value="" disabled>Choose action</option>
                {actions.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DirectorReviewDrawer({ item, note, setNote, onClose, onApprove, onClarify, onOpenWorkflow, onCreateFollowup, onEscalate, onAddNote }) {
  const aiRecommendation = buildDirectorAIRecommendation(item);
  const activity = [
    [`Routed from ${item.source_executive || item.owner}`, item.date_added || 'Today'],
    [`Status set to ${normalizeDirectorStatus(item.status)}`, item.last_update || 'Latest sync'],
    [item.nextAction || 'Review required', 'Next action']
  ];
  return (
    <div className="director-review-backdrop" onClick={onClose}>
      <aside className="director-review-drawer" role="dialog" aria-modal="true" aria-label="Director decision review" onClick={(event) => event.stopPropagation()}>
        <header className="director-review-header">
          <button className="director-back-link" onClick={onClose}><ArrowLeft size={15} />Back</button>
          <span>Executive review</span>
          <h2>{item.title}</h2>
          <p>{item.description || item.summary || item.impact}</p>
        </header>
        <div className="director-review-chip-row">
          <PriorityBadge priority={item.priority || item.risk_level || 'Medium'} />
          <StatusBadge label={normalizeDirectorStatus(item.status)} state={getApprovalState(item.status)} />
          <StateChip label={item.source_executive || item.owner} />
        </div>
        <section className="director-review-section">
          <span>Context</span>
          <p>{item.blocker || item.impact || 'This workflow is waiting for Director review before it can proceed.'}</p>
        </section>
        <section className="director-review-section recommended">
          <span>Recommended action</span>
          <p>{item.nextAction || aiRecommendation.decision}</p>
          <small>{aiRecommendation.summary}</small>
        </section>
        <section className="director-review-section">
          <span>Activity log</span>
          <div className="director-review-log">
            {activity.map(([label, time]) => (
              <div key={`${label}-${time}`}>
                <strong>{label}</strong>
                <small>{time}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="director-review-section">
          <span>Decision note</span>
          <textarea aria-label="Decision note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add short decision note..." />
        </section>
        <footer className="director-review-actions">
          <button className="tactical-button" onClick={onOpenWorkflow}>Open workflow</button>
          <button className="ghost-button" onClick={onApprove}>Approve</button>
          <button className="ghost-button" onClick={onClarify}>Clarify</button>
          <button className="ghost-button" onClick={onEscalate}>Escalate</button>
          <button className="ghost-button" onClick={onCreateFollowup}>Follow-up</button>
          <button className="ghost-button" onClick={onAddNote}>Add note</button>
        </footer>
      </aside>
    </div>
  );
}

function DirectorAttentionRail({ criticalItems, whatsappActions, events, followups, onSyncWhatsApp, onRunFollowups, navigate }) {
  const nextWhatsApp = (whatsappActions || []).filter((item) => item.sync_status !== 'Processed').slice(0, 3);
  const recentEvents = (events || []).slice(0, 4);
  return (
    <aside className="director-attention-rail" aria-label="Director attention rail">
      <section className="director-rail-module">
        <div className="director-rail-heading"><span>Attention rail</span><h3>Critical items</h3></div>
        <div className="director-rail-list">
          {criticalItems.map((item) => (
            <button key={item.id} onClick={() => navigate(item.route || item.linked_route || '/export-os/director')}>
              <strong>{item.title}</strong>
              <span>{item.source_executive} - {item.nextAction}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="director-rail-module">
        <div className="director-rail-heading"><span>Cross-channel</span><h3>WhatsApp sync</h3></div>
        <div className="director-rail-list">
          {nextWhatsApp.map((action) => (
            <button key={action.id} onClick={() => onSyncWhatsApp(action)}>
              <strong>{action.founder_message}</strong>
              <span>{action.sync_status} - {action.created_at}</span>
            </button>
          ))}
          {!nextWhatsApp.length && <p>No pending WhatsApp actions.</p>}
        </div>
      </section>
      <section className="director-rail-module">
        <div className="director-rail-heading"><span>Follow-up</span><h3>Reminders</h3></div>
        <div className="director-rail-list">
          {followups.slice(0, 2).map((item) => (
            <article key={item.id}>
              <strong>{item.followup_type}</strong>
              <span>{item.sent_to} - {item.created_at}</span>
            </article>
          ))}
          {!followups.length && recentEvents.map((event) => (
            <button key={event.id} onClick={() => navigate(event.linked_workflow || '/export-os/director')}>
              <strong>{event.event}</strong>
              <span>{event.executive_type} - {event.created_at}</span>
            </button>
          ))}
        </div>
        <button className="tactical-button director-full-button" onClick={onRunFollowups}>Run follow-up engine</button>
      </section>
    </aside>
  );
}

function DirectorSupportIntelligence({ opportunities, delays, insights, recommendations }) {
  const modules = [
    ['Market and importer signals', opportunities?.slice(0, 3).map((item) => [`${item.country} ${item.product}`, item.summary]) || []],
    ['Delayed workflow intelligence', delays?.slice(0, 3).map((item) => [item.delay_reason, item.business_impact]) || []],
    ['Operational performance insights', insights?.slice(0, 3).map((item) => [item.metric, item.note || item.value]) || []],
    ['AI review notes', recommendations?.slice(0, 3).map((item) => [item.recommendation, item.next_action]) || []]
  ];
  return (
    <section className="director-intelligence-support-grid" aria-label="Director intelligence support">
      {modules.map(([title, rows]) => (
        <article key={title} className="director-support-module">
          <div className="director-rail-heading"><span>Support intelligence</span><h3>{title}</h3></div>
          <div className="director-support-list">
            {rows.map(([label, detail]) => (
              <div key={`${title}-${label}`}>
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function DirectorExecutiveFooter({ message, commandInput, setCommandInput, commandResponse, commandHistory, onRunCommand, navigate }) {
  const suggestions = ['Open new lead form', 'What is blocking invoices?', 'Show delayed shipments.', 'What payments are pending?', 'Any Country pending opportunities?'];
  return (
    <footer className="director-executive-footer">
      <div className="director-footer-status"><StatusPulse /><span>{message}</span></div>
      <div className="director-footer-command">
        <input
          value={commandInput}
          onChange={(event) => setCommandInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onRunCommand();
            }
          }}
          placeholder="Ask Director Command about a decision, risk, buyer, payment, or workflow..."
        />
        <button className="tactical-button" type="button" onClick={() => onRunCommand()}>Run</button>
      </div>
      <div className="director-footer-suggestions">
        {suggestions.map((item) => <button key={item} onClick={() => onRunCommand(item)}>{item}</button>)}
      </div>
      {commandResponse && <DirectorFooterResponse response={commandResponse} navigate={navigate} />}
      {!commandResponse && commandHistory[0] && <p>Last command: {commandHistory[0].response_summary}</p>}
    </footer>
  );
}

function DirectorFooterResponse({ response, navigate }) {
  return (
    <section className="director-footer-response">
      <div>
        <span>Director Response</span>
        <strong>{response.summary}</strong>
      </div>
      <div className="director-footer-response-grid">
        <article><span>Routed to</span><strong>{response.routedExecutives.join(' + ')}</strong></article>
        <article><span>Risk</span><strong>{response.risks}</strong></article>
        <article><span>Next action</span><strong>{response.recommendedNextAction}</strong></article>
      </div>
      <div className="director-footer-response-actions">
        {response.linkedWorkflows.length ? response.linkedWorkflows.map((route) => <button key={route} onClick={() => navigate(route)}>Open {route.split('/').filter(Boolean).pop()}</button>) : <button onClick={() => navigate('/export-os/director')}>Open Director Queue</button>}
      </div>
    </section>
  );
}

function filterDirectorDecisionItems(items, filter) {
  if (filter === 'All') return items.filter((item) => !['Approved', 'Rejected', 'Auto-Resolved'].includes(item.status));
  if (filter === 'Resolved') return items.filter((item) => ['Approved', 'Rejected', 'Auto-Resolved'].includes(item.status));
  return items.filter((item) => getDirectorDecisionCategory(item) === filter);
}

function getDirectorDecisionCategory(item) {
  const text = `${item.title} ${item.summary} ${item.category} ${item.request_type} ${item.department} ${item.source_module}`.toLowerCase();
  if (item.priority === 'Critical' || item.risk_level === 'Critical' || item.status === 'Escalated') return 'Critical';
  if (text.includes('finance') || text.includes('pricing') || text.includes('payment') || text.includes('margin')) return 'Finance';
  if (text.includes('invoice') || text.includes('document') || text.includes('lut') || text.includes('compliance')) return 'Documents';
  if (text.includes('buyer') || text.includes('importer') || text.includes('market') || text.includes('opportunity')) return 'Buyer Risk';
  if (text.includes('shipment') || text.includes('warehouse') || text.includes('dispatch') || text.includes('supplier')) return 'Operations';
  return item.source_executive?.includes('CFO') ? 'Finance' : item.source_executive?.includes('CIO') ? 'Buyer Risk' : item.source_executive?.includes('COO') ? 'Operations' : 'All';
}

function sortDirectorDecisionItems(items, sort) {
  if (sort === 'Wait Time') return [...items].sort((a, b) => b.waiting_hours - a.waiting_hours);
  if (sort === 'Impact') return [...items].sort((a, b) => getDirectorImpactScore(b) - getDirectorImpactScore(a));
  return sortDirectorItems(items);
}

function getDirectorImpactScore(item) {
  const text = `${item.title} ${item.summary} ${item.global_impact}`.toLowerCase();
  if (text.includes('shipment') || text.includes('dispatch') || text.includes('warehouse')) return 95;
  if (text.includes('payment') || text.includes('invoice') || text.includes('margin') || text.includes('credit')) return 86;
  if (text.includes('buyer') || text.includes('importer') || text.includes('market')) return 72;
  return 45;
}

function getDirectorImpactLabel(item) {
  if (getDirectorImpactScore(item) >= 90) return 'Operational block';
  if (getDirectorImpactScore(item) >= 80) return 'Financial control';
  if (getDirectorImpactScore(item) >= 70) return 'Buyer exposure';
  return item.global_impact || 'Workflow control';
}

function ExecutiveDepartmentFooter({ updates, navigate }) {
  return (
    <section className="executive-department-footer" aria-label="Executive department status">
      <div className="coo-panel-header">
        <div>
          <span>Executive Status</span>
          <h2>Department readiness</h2>
        </div>
        <Activity size={19} />
      </div>
      <div className="department-status-strip">
        {updates.map((update) => {
          const command = executiveCommandDeck.find((item) => item.id === update.command_id);
          return (
            <button key={update.id} onClick={() => navigate(command?.route || '/export-os/director')}>
              <strong>{update.update_type}</strong>
              <span>{update.message}</span>
              <RiskBadge label={update.risk_level} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function normalizeDirectorItem(request, index = 0) {
  const sourceExecutive = request.executive_owner || request.source_executive || inferDirectorExecutive(request);
  const waitingHours = request.waiting_hours ?? inferWaitingHours(request.created_at, index);
  return {
    ...request,
    title: cleanDirectorLanguage(request.title || request.summary || 'Director decision item'),
    summary: cleanDirectorLanguage(request.summary || ''),
    source_executive: sourceExecutive,
    work_type: request.request_type || request.category || 'Executive Decision',
    description: cleanDirectorLanguage(request.summary || request.description || request.title),
    waiting_hours: waitingHours,
    waiting_since: formatWaitingSince(waitingHours),
    date_added: formatDirectorDate(request.created_at),
    last_update: request.last_update || request.updated_at || request.created_at || 'Monitoring',
    global_impact: request.global_impact || inferGlobalImpact(request),
    escalation_level: request.escalation_level || (request.risk_level === 'Critical' ? 'Director Critical' : request.status === 'Escalated' ? 'Executive Escalation' : 'Standard'),
    linked_route: request.linked_route || getDirectorLinkedRoute(request),
    route: request.linked_route || getDirectorLinkedRoute(request),
    type: request.request_type || request.category || 'Executive Decision',
    owner: sourceExecutive,
    blocker: cleanDirectorLanguage(request.details?.blockers || request.details?.risk_reason || request.details?.issue || request.summary || 'Director decision required before workflow can proceed.'),
    impact: cleanDirectorLanguage(request.details?.operational_impact || request.summary || 'Workflow is waiting on Director decision.'),
    nextAction: cleanDirectorLanguage(request.details?.recommended_action || request.details?.next_action || 'Review executive notes and select Director action.'),
    last_updated_by: request.last_updated_by || sourceExecutive,
    action_history: request.action_history || [],
    approval_request: request.request_type ? request : request.approval_request
  };
}

function cleanDirectorLanguage(value = '') {
  return String(value)
    .replaceAll('Founder Approval Wall', 'Director Command Center')
    .replaceAll('Founder Review Required', 'Review Required')
    .replaceAll('Founder Approval Required', 'Review Required')
    .replaceAll('Waiting Founder Action', 'Pending Director Decision')
    .replaceAll('Waiting Founder Approval', 'Pending Director Decision')
    .replaceAll('Founder approval', 'Director decision')
    .replaceAll('founder approval', 'Director decision')
    .replaceAll('Founder review', 'Priority review')
    .replaceAll('founder review', 'priority review')
    .replaceAll('legal/founder review', 'legal/Director review')
    .replaceAll('Founder', 'Director')
    .replaceAll('founder', 'Director');
}

function inferDirectorExecutive(request) {
  const text = `${request.department} ${request.category} ${request.source_module}`.toLowerCase();
  if (text.includes('finance') || text.includes('pricing') || text.includes('invoice') || text.includes('payment')) return 'CFO Command';
  if (text.includes('technical') || text.includes('automation') || text.includes('cto')) return 'CTO Command';
  if (text.includes('marketing') || text.includes('content') || text.includes('claim')) return 'CMO Command';
  if (text.includes('market') || text.includes('strategic') || text.includes('cio')) return 'CIO Command';
  return 'COO Command';
}

function inferWaitingHours(createdAt, index) {
  const text = String(createdAt || '').toLowerCase();
  if (text.includes('yesterday')) return 26 + index;
  if (text.includes('12:')) return 1;
  if (text.includes('11:')) return 2;
  if (text.includes('10:')) return 3;
  if (text.includes('09:')) return 4;
  return Math.max(1, index + 1);
}

function formatDirectorDate(value) {
  if (!value) return 'Today';
  const text = String(value);
  if (text === 'Invalid Date') return 'Today';
  if (text.includes('Today') || text.includes('Yesterday')) return text;
  if (!text.includes('T')) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? 'Today' : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatWaitingSince(hours) {
  if (hours >= 48) return '>48h';
  if (hours >= 24) return '>24h';
  return `${hours}h`;
}

function inferGlobalImpact(item) {
  const text = `${item.title} ${item.summary} ${item.category} ${item.request_type} ${item.buyer_name}`.toLowerCase();
  if (text.includes('uae') || text.includes('gcc') || text.includes('oman')) return 'GCC market impact';
  if (text.includes('europe') || text.includes('sweden') || text.includes('germany')) return 'Europe market impact';
  if (text.includes('australia') || text.includes('melbourne')) return 'Australia buyer impact';
  if (text.includes('shipment') || text.includes('warehouse') || text.includes('dispatch')) return 'Shipment corridor impact';
  if (text.includes('api') || text.includes('automation') || text.includes('credit')) return 'Platform reliability impact';
  return 'Company control impact';
}

function getDirectorLinkedRoute(item) {
  const text = `${item.source_module} ${item.category} ${item.department} ${item.request_type}`.toLowerCase();
  if (text.includes('pricing') || text.includes('quote') || text.includes('financial')) return '/export-os/pricing-engine';
  if (text.includes('invoice') || text.includes('compliance') || text.includes('document')) return '/export-os/invoices';
  if (text.includes('technical') || text.includes('automation')) return '/export-os/executives/cto';
  if (text.includes('marketing') || text.includes('content') || text.includes('claim')) return '/export-os/executives/cmo';
  if (text.includes('strategic') || text.includes('market')) return '/export-os/cio';
  if (text.includes('warehouse') || text.includes('inventory')) return '/export-os/warehouse';
  if (text.includes('shipment')) return '/export-os/shipments';
  return '/export-os/workflows';
}

function sortDirectorItems(items) {
  const priorityScore = { Critical: 90, High: 70, Medium: 45, Low: 20 };
  const impactScore = (item) => {
    const text = `${item.title} ${item.summary} ${item.category} ${item.request_type}`.toLowerCase();
    if (text.includes('shipment') || text.includes('dispatch') || text.includes('warehouse')) return 100;
    if (text.includes('payment') || text.includes('margin') || text.includes('invoice') || text.includes('pricing')) return 88;
    if (text.includes('buyer') || text.includes('importer')) return 76;
    if (item.risk_level === 'Critical' || text.includes('blocked')) return 70;
    if (text.includes('api') || text.includes('automation') || text.includes('credit')) return 62;
    if (text.includes('opportunity') || text.includes('market')) return 54;
    return 30;
  };
  return [...items].sort((a, b) => (priorityScore[b.priority] || 0) + impactScore(b) + b.waiting_hours - ((priorityScore[a.priority] || 0) + impactScore(a) + a.waiting_hours));
}

function getDirectorSummary(items, followups, directorData = {}) {
  return {
    critical: items.filter((item) => item.priority === 'Critical' || item.risk_level === 'Critical').length,
    dueToday: items.filter((item) => !['Approved', 'Rejected', 'Auto-Resolved'].includes(item.status)).length,
    escalated: items.filter((item) => item.status === 'Escalated').length,
    waiting24: items.filter((item) => item.waiting_hours >= 24).length,
    waiting48: items.filter((item) => item.waiting_hours >= 48).length,
    followups: followups.length,
    highRisk: items.filter((item) => ['High', 'Critical'].includes(item.risk_level)).length,
    whatsapp: directorData.whatsappActions?.length || 0,
    opportunities: directorData.globalOpportunities?.length || 0,
    shipmentRisks: items.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes('shipment') || `${item.title} ${item.summary}`.toLowerCase().includes('dispatch')).length,
    highValueBuyers: items.filter((item) => `${item.amount || ''}`.includes('$') || `${item.buyer_name || ''}`.toLowerCase().includes('buyer')).length,
    strategicAlerts: directorData.aiRecommendations?.length || 0
  };
}

function DirectorSummaryCards({ summary }) {
  const cards = [
    ['Critical Pending', summary.critical, 'Critical'],
    ['WhatsApp Actions', summary.whatsapp, 'Monitoring'],
    ['Global Opportunities', summary.opportunities, 'Review Required'],
    ['Delayed Workflows', summary.waiting24 + summary.waiting48, 'Attention'],
    ['Shipment Risks', summary.shipmentRisks, 'High Risk'],
    ['High-Value Buyers', summary.highValueBuyers, 'Monitoring'],
    ['Strategic Alerts', summary.strategicAlerts, 'Attention'],
    ['Active Escalations', summary.escalated, 'Escalated']
  ];
  return <section className="director-summary-grid">{cards.map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={getApprovalState(status)} /></article>)}</section>;
}

function DirectorPriorityTable({ items, selectedId, onSelect, onAction }) {
  const actions = ['Approve', 'Reject', 'Need Clarification', 'Escalate', 'Open Workflow', 'Assign COO', 'Assign CFO', 'Assign CTO', 'Assign CMO', 'Assign CIO'];
  return (
    <section className="director-panel director-table-panel">
      <div className="approval-section-header"><div><span>Director Queue</span><h2>Pending executive decisions</h2></div><Command size={18} /></div>
      <div className="director-decision-list">
        {items.map((item, index) => (
          <article key={item.id} className={`director-decision-card ${selectedId === item.id ? 'selected' : ''}`} onClick={() => onSelect(item.id)} tabIndex={0} role="button" onKeyDown={(event) => event.key === 'Enter' && onSelect(item.id)}>
            <div className="decision-index">{index + 1}</div>
            <div className="decision-main">
              <div className="decision-title-row">
                <span>{item.work_type}</span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.description}</p>
              <div className="decision-meta-grid">
                <span><b>Executive</b>{item.source_executive}</span>
                <span><b>Waiting</b>{item.waiting_since}</span>
                <span><b>Impact</b>{item.global_impact}</span>
              </div>
            </div>
            <div className="decision-state">
              <PriorityBadge priority={item.priority || 'Medium'} />
              <StatusBadge label={normalizeDirectorStatus(item.status)} state={getApprovalState(item.status)} />
              <small>{formatDirectorDate(item.last_update)}</small>
            </div>
            <div className="decision-action" onClick={(event) => event.stopPropagation()}>
              <label>
                <span>Action</span>
                <select aria-label={`Director action for ${item.title}`} defaultValue="" onChange={(event) => { const action = event.target.value; event.target.value = ''; onAction(item, action); }}>
                  <option value="" disabled>Select decision</option>
                  {actions.map((action) => <option key={action} value={action}>{action}</option>)}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
      <p>Click any row to open the workflow detail instantly. The dropdown records Director decisions without forcing extra navigation.</p>
    </section>
  );
}

function normalizeDirectorStatus(status) {
  if (status === 'Founder Review Required' || status === 'Waiting Founder Action' || status === 'High Risk') return 'Review Required';
  if (status === 'Revision Requested') return 'Clarification Needed';
  if (status === 'Approved for Release') return 'Approved';
  return status || 'Pending';
}

function getDirectorDirectOpenRoute(query) {
  const q = query.toLowerCase();
  if ((q.includes('open') || q.includes('create') || q.includes('new')) && q.includes('lead') && (q.includes('form') || q.includes('intake') || q.includes('new'))) {
    return '/export-os/leads/new';
  }
  if ((q.includes('open') || q.includes('create')) && q.includes('invoice')) return '/export-os/invoices/new';
  if ((q.includes('open') || q.includes('create')) && q.includes('pricing')) return '/export-os/pricing-engine';
  return null;
}

function buildDirectorCommandErrorResponse(query, message) {
  return {
    query,
    routedExecutives: ['Director Command'],
    summary: message,
    currentStatus: 'Error',
    risks: 'Route unavailable.',
    pendingItems: [],
    recommendedNextAction: 'Use a connected command such as "open new lead form", "open invoice", or "open pricing".',
    responsibleExecutive: 'Director Command',
    confidence: 'High',
    urgency: 'Attention',
    linkedWorkflows: []
  };
}

function buildDirectorCommandResponse(query, items = [], directorData = {}) {
  const q = query.toLowerCase();
  const routes = [];
  if (q.includes('marketing') || q.includes('campaign') || q.includes('content') || q.includes('budget')) routes.push('CMO Command', 'CFO Command');
  if (q.includes('shipment') || q.includes('dispatch') || q.includes('warehouse') || q.includes('supplier')) routes.push('COO Command');
  if (q.includes('invoice') || q.includes('payment') || q.includes('pricing') || q.includes('margin') || q.includes('cash')) routes.push('CFO Command');
  if (q.includes('api') || q.includes('automation') || q.includes('incident') || q.includes('integration')) routes.push('CTO Command');
  if (q.includes('uae') || q.includes('opportun') || q.includes('market') || q.includes('importer') || q.includes('buyer')) routes.push('CIO Command', 'CMO Command');
  if (q.includes('delay') || q.includes('pending') || q.includes('blocking') || q.includes('blocked')) routes.push('COO Command', 'CFO Command');
  const routedExecutives = Array.from(new Set(routes.length ? routes : ['COO Command', 'CFO Command']));

  const relevantItems = items.filter((item) => {
    const text = `${item.title} ${item.description} ${item.summary} ${item.source_executive} ${item.global_impact}`.toLowerCase();
    return q.split(/\s+/).filter((word) => word.length > 3).some((word) => text.includes(word)) || routedExecutives.includes(item.source_executive);
  }).slice(0, 4);

  const opportunityMatches = (directorData.globalOpportunities || []).filter((item) => {
    const text = `${item.country} ${item.product} ${item.summary}`.toLowerCase();
    return q.includes('opportun') || q.includes('uae') || q.includes('market') || text.includes(q);
  }).slice(0, 3);

  const delayMatches = (directorData.workflowDelayIntelligence || []).filter((item) => q.includes('delay') || q.includes('blocked') || q.includes('pending') || q.includes('what is')).slice(0, 3);
  const primaryRisk = relevantItems.find((item) => ['Critical', 'High'].includes(item.risk_level || item.priority));
  const linkedWorkflows = Array.from(new Set([...relevantItems.map((item) => item.route || item.linked_route), ...opportunityMatches.map(() => '/export-os/cio')].filter(Boolean))).slice(0, 4);

  let summary = 'Director reviewed the operational queue and routed the question to the relevant executive systems.';
  if (q.includes('marketing') && q.includes('budget')) summary = 'Marketing budget questions route through CMO for campaign context and CFO for budget/spend control.';
  else if (q.includes('shipment') || q.includes('dispatch')) summary = 'Shipment questions route through COO, warehouse, invoice readiness, and supplier follow-up signals.';
  else if (q.includes('uae') || q.includes('opportun')) summary = 'Country pending and opportunity questions route through CIO market intelligence, CMO outreach, and CFO pricing viability.';
  else if (q.includes('delay') || q.includes('pending')) summary = 'Pending and delayed workflow questions route across tasks, invoices, shipments, suppliers, payments, and Director queue items.';
  else if (q.includes('invoice')) summary = 'Invoice blockers route through CFO validation, company/LUT data, document readiness, and operational release status.';
  else if (q.includes('payment')) summary = 'Payment questions route through CFO controls, Payment Vault, CTO renewal triggers, and Director decision rules.';

  return {
    query,
    routedExecutives,
    summary,
    currentStatus: relevantItems.length ? `${relevantItems.length} matching workflow signals found.` : 'No exact match found; showing nearest operational intelligence.',
    risks: primaryRisk ? `${primaryRisk.priority || primaryRisk.risk_level}: ${primaryRisk.title}` : (delayMatches[0]?.business_impact || 'Monitoring. No critical matching risk detected in Awaiting Sync.'),
    pendingItems: relevantItems.map((item) => item.title).concat(opportunityMatches.map((item) => `${item.country} ${item.product} opportunity`)).slice(0, 5),
    recommendedNextAction: primaryRisk?.nextAction || delayMatches[0]?.business_impact || opportunityMatches[0]?.summary || 'Open the most relevant workflow or ask for clarification from the responsible executive.',
    responsibleExecutive: routedExecutives.join(' + '),
    confidence: relevantItems.length || opportunityMatches.length || delayMatches.length ? 'High' : 'Medium',
    urgency: primaryRisk?.priority || (delayMatches.length ? 'Attention' : 'Monitoring'),
    linkedWorkflows
  };
}

function DirectorCommandConsole({ value, setValue, onRun, response, history, navigate, onEscalate, onCreateFollowup }) {
  const suggestions = ['What is pending this month?', 'How much marketing budget pending?', 'Show delayed shipments.', 'Any high-risk buyers?', 'What is blocking invoices?', 'What payments are pending?', 'Any Country pending opportunities?', "Show todays priorities."];
  return (
    <section className="director-panel director-command-console">
      <div className="approval-section-header"><div><span>Director Command Input</span><h2>Ask GOPU OS anything operational</h2></div><Bot size={18} /></div>
      <div className="director-input-row">
        <textarea aria-label="Command prompt" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onRun(); }} placeholder="What is pending this month?  -  Show delayed shipments.  -  Any Country pending opportunities?  -  What is blocking invoices?" />
        <button className="tactical-button" onClick={() => onRun()}>Ask Director</button>
      </div>
      <div className="director-suggestion-row">
        {suggestions.map((item) => <button key={item} onClick={() => onRun(item)}>{item}</button>)}
      </div>
      {response && <ExecutiveResponsePanel response={response} navigate={navigate} onEscalate={onEscalate} onCreateFollowup={onCreateFollowup} />}
      <DirectorCommandHistory history={history} />
    </section>
  );
}

function ExecutiveResponsePanel({ response, navigate, onEscalate, onCreateFollowup }) {
  return (
    <section className="director-response-panel">
      <div className="director-response-grid">
        {[
          ['Summary', response.summary],
          ['Current status', response.currentStatus],
          ['Risks', response.risks],
          ['Pending items', response.pendingItems.length ? response.pendingItems.join(' / ') : 'No matching pending item found.'],
          ['Recommended next action', response.recommendedNextAction],
          ['Responsible executive', response.responsibleExecutive]
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className="director-response-meta">
        <StatusBadge label={`Confidence: ${response.confidence}`} state="progress" />
        <StatusBadge label={`Urgency: ${response.urgency}`} state={getApprovalState(response.urgency)} />
        <span>Sources: {response.routedExecutives.join(', ')}</span>
      </div>
      <div className="director-response-actions">
        <button className="tactical-button" onClick={() => response.linkedWorkflows[0] && navigate(response.linkedWorkflows[0])}>Open Workflow</button>
        <button className="ghost-button" onClick={onEscalate}>Escalate</button>
        <button className="ghost-button">Approve</button>
        <button className="ghost-button">Request Clarification</button>
        <button className="ghost-button" onClick={onCreateFollowup}>Create Follow-up</button>
        <button className="ghost-button" onClick={() => navigate('/export-os/security-audit')}>Open Audit</button>
      </div>
    </section>
  );
}

function DirectorCommandHistory({ history = [] }) {
  if (!history.length) return null;
  return (
    <div className="director-command-history">
      {history.map((item) => <article key={item.id}><strong>{item.query_text}</strong><span>{item.routed_executives.join(' + ')}</span><small>{item.created_at}</small><p>{item.response_summary}</p></article>)}
    </div>
  );
}

function DirectorWarRoom({ items = [], recommendations = [] }) {
  return (
    <section className="director-panel director-war-room">
      <div className="approval-section-header"><div><span>Director War Room Mode</span><h2>Executive crisis + opportunity control</h2></div><RadioTower size={18} /></div>
      <div className="director-war-grid">
        {items.map((item) => <article key={`${item.type}-${item.title}`}><span>{item.type}</span><strong>{item.title}</strong><small>{item.owner}</small><p>{item.next_action}</p></article>)}
      </div>
      <div className="director-war-recommendations">
        {recommendations.slice(0, 2).map((item) => <div key={item.recommendation}><StatusBadge label={item.risk_level} state={getApprovalState(item.risk_level)} /><span>{item.next_action}</span></div>)}
      </div>
    </section>
  );
}

function WhatsAppApprovalSync({ actions = [], onSync }) {
  return (
    <section className="director-panel director-sync-panel">
      <div className="approval-section-header"><div><span>WhatsApp Approval Sync</span><h2>Director actions from mobile/chat</h2></div><Mail size={18} /></div>
      <div className="director-compact-list">
        {actions.map((action) => <article key={action.id}><div><strong>{action.action_type}</strong><StatusBadge label={action.sync_status} state={getApprovalState(action.sync_status)} /></div><p>{action.founder_message}</p><small>{action.created_at}</small><button onClick={() => onSync(action)}>Sync Action</button></article>)}
      </div>
    </section>
  );
}

function ExecutiveEventStream({ events = [], navigate }) {
  return (
    <section className="director-panel director-event-stream">
      <div className="approval-section-header"><div><span>Executive Event Stream</span><h2>Unified command activity</h2></div><Activity size={18} /></div>
      <div className="director-timeline-list">
        {events.map((event) => <button key={event.id} onClick={() => navigate(event.linked_workflow)}><time>{event.created_at}</time><strong>{event.executive_type}</strong><span>{event.event}</span><SeverityBadge severity={event.severity} /></button>)}
      </div>
    </section>
  );
}

function GlobalOpportunityFeed({ opportunities = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>World Trade Opportunities</span><h2>Importer and market signals</h2></div><Network size={18} /></div>
      <div className="director-card-list">
        {opportunities.map((item) => <article key={item.id}><div><strong>{item.country} / {item.product}</strong><StatusBadge label={item.urgency} state={getApprovalState(item.urgency)} /></div><span>{item.opportunity_type} / {item.confidence} confidence</span><p>{item.summary}</p></article>)}
      </div>
    </section>
  );
}

function WorldwideTradeEvents({ events = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>Global Export Event Feed</span><h2>Trade events and sourcing windows</h2></div><CalendarClock size={18} /></div>
      <div className="director-card-list">
        {events.map((event) => <article key={event.id}><div><strong>{event.country} / {event.city}</strong><StatusBadge label={event.opportunity_score} state={getApprovalState(event.opportunity_score)} /></div><span>{event.event_type} / {event.industry_relevance}</span><p>{event.recommended_participation}</p></article>)}
      </div>
    </section>
  );
}

function WorkflowDelayIntelligence({ delays = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>Delayed Workflow Intelligence</span><h2>Oldest and highest-impact delays</h2></div><TimerReset size={18} /></div>
      <div className="director-card-list">
        {delays.map((delay) => <article key={delay.id}><div><strong>{delay.delay_reason}</strong><StatusBadge label={delay.escalation_level} state={getApprovalState(delay.escalation_level)} /></div><p>{delay.business_impact}</p><small>{delay.owner}</small></article>)}
      </div>
    </section>
  );
}

function OperationalHeatmap({ heatmap = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>Operational Heatmap</span><h2>Regions, risk zones, opportunity lanes</h2></div><RadioTower size={18} /></div>
      <div className="director-heatmap-grid">
        {heatmap.map((item) => <article key={item.region} className={`heat-${String(item.severity).toLowerCase()}`}><strong>{item.region}</strong><span>{item.signal}</span><small>{item.note}</small></article>)}
      </div>
    </section>
  );
}

function ExecutivePerformanceInsights({ insights = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>Executive Performance Insights</span><h2>Operational speed, not gamification</h2></div><Gauge size={18} /></div>
      <div className="director-card-list">
        {insights.map((item) => <article key={item.metric}><div><strong>{item.metric}</strong><StatusBadge label={item.status} state={getApprovalState(item.status)} /></div><span>{item.value}</span><p>{item.note}</p></article>)}
      </div>
    </section>
  );
}

function DirectorAIRecommendations({ recommendations = [] }) {
  return (
    <section className="director-panel">
      <div className="approval-section-header"><div><span>AI Operational Recommendations</span><h2>AI Recommendation -- Human Review Advised</h2></div><BrainCircuit size={18} /></div>
      <div className="director-card-list">
        {recommendations.map((item) => <article key={item.recommendation}><div><strong>{item.recommendation}</strong><SeverityBadge severity={item.risk_level} /></div><span>Confidence: {item.confidence}</span><p>{item.next_action}</p></article>)}
      </div>
    </section>
  );
}

function ExecutiveFollowupEngine({ followups, selectedItem, onRun }) {
  return (
    <aside className="director-panel director-followup-panel">
      <div className="approval-section-header"><div><span>Executive Follow-Up Engine</span><h2>Automated reminders</h2></div><TimerReset size={18} /></div>
      <div className="director-rule-list">
        <span>After 1 hour: remind owner executive.</span>
        <span>After repeated delay: push COO operational follow-up.</span>
        <span>Every 1 hour: reminder until resolved.</span>
        <span>After 48 hours: AI recommendation may be generated for human review.</span>
      </div>
      <button className="tactical-button" onClick={onRun}>Trigger Follow-Up</button>
      <div className="director-followup-list">
        {followups.length === 0 && <small>No follow-up reminders generated yet for {selectedItem?.title || 'selected item'}.</small>}
        {followups.map((item) => <article key={item.id}><strong>{item.followup_type}</strong><span>{item.sent_to}</span><small>{item.created_at}</small></article>)}
      </div>
    </aside>
  );
}

function normalizeFounderQueueRequest(request) {
  const validStatuses = ['Pending Approval', 'Approved', 'Rejected', 'Needs Review'];
  const nextStatus = validStatuses.includes(request.status)
    ? request.status
    : request.status === 'Revision Requested'
      ? 'Needs Review'
      : 'Pending Approval';
  return {
    ...request,
    status: nextStatus,
    approval_status: nextStatus,
    related_record: request.related_record || request.related_workflow_id || request.buyer_name || request.id,
    requested_by_label: request.requested_by_label || request.executive_owner || 'Workflow Owner',
    requested_time: request.requested_time || request.created_at,
    reason: request.reason || request.summary || request.details?.risk_reason || 'Founder approval required before execution.'
  };
}

function FounderApprovalWall({ onBack, onOpenTasks }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeFilters, setActiveFilters] = useState(null);
  const [requests, setRequests] = useState(() => approvalWallRequests.map(normalizeFounderQueueRequest));
  const [selectedId, setSelectedId] = useState(approvalWallRequests[0]?.id);
  const [founderNote, setFounderNote] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [approvalStatusMessage, setApprovalStatusMessage] = useState('Approval engine loading...');
  const { show, ToastUI } = useToast();
  const { confirm, Dialog } = useConfirm();
  const selectedRequest = requests.find((request) => request.id === selectedId) || requests[0];

  useEffect(() => {
    let disposed = false;
    async function loadQueue() {
      const result = await getApprovalQueue(demoTenantId);
      if (disposed) return;
      if (result.data?.length) {
        setRequests(result.data.map(normalizeFounderQueueRequest));
        setSelectedId((current) => result.data.some((request) => request.id === current) ? current : result.data[0].id);
      }
      setApprovalStatusMessage(result.backend.mode === 'Connected' ? 'Live Connected - approval queue synced.' : 'Integration pending - approval queue awaiting Supabase sync.');
    }
    loadQueue();
    const onCreated = (event) => {
      const created = normalizeFounderQueueRequest(event.detail);
      setRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
      setSelectedId(event.detail.id);
      setApprovalStatusMessage('New approval request added to Director Command Center.');
    };
    window.addEventListener('gopu:approval-created', onCreated);
    return () => {
      disposed = true;
      window.removeEventListener('gopu:approval-created', onCreated);
    };
  }, []);

  const filteredRequests = requests.filter((request) => {
    const matchesLegacyFilter = (() => {
      if (activeFilter === 'All') return true;
      if (['Pending Approval', 'Needs Review', 'Approved', 'Rejected'].includes(activeFilter)) return request.status === activeFilter;
      if (activeFilter === 'High Risk') return ['High', 'Critical'].includes(request.risk_level);
      return request.category === activeFilter || request.department === activeFilter;
    })();
    if (!matchesLegacyFilter) return false;
    if (!activeFilters) return true;

    const searchable = [
      request.title,
      request.summary,
      request.status,
      request.department,
      request.category,
      request.request_type,
      request.related_record,
      request.related_workflow_id,
      request.buyer_name,
      request.requested_by_label,
      request.executive_owner,
      request.source_module,
      request.reason,
      request.priority,
      request.risk_level,
      request.created_at,
      request.requested_time
    ].filter(Boolean).join(' ').toLowerCase();
    const search = activeFilters.search?.trim().toLowerCase();
    if (search && !searchable.includes(search)) return false;

    const statusMap = {
      pending: ['pending approval', 'pending'],
      approved: ['approved'],
      rejected: ['rejected'],
      review: ['needs review', 'in review', 'review']
    };
    if (activeFilters.status?.length) {
      const statusText = `${request.status || ''} ${request.approval_status || ''}`.toLowerCase();
      if (!activeFilters.status.some((status) => statusMap[status]?.some((match) => statusText.includes(match)))) return false;
    }

    if (activeFilters.division?.length) {
      const divisionText = `${request.department || ''} ${request.executive_owner || ''} ${request.requested_by_label || ''} ${request.category || ''} ${request.source_module || ''}`.toLowerCase();
      if (!activeFilters.division.some((division) => divisionText.includes(division))) return false;
    }

    if (activeFilters.priority?.length) {
      const priorityText = `${request.priority || ''} ${request.risk_level || ''}`.toLowerCase();
      if (!activeFilters.priority.some((priority) => priorityText.includes(priority))) return false;
    }

    const requestDate = String(request.created_at || request.requested_time || '').slice(0, 10);
    if (activeFilters.dateFrom && requestDate && requestDate < activeFilters.dateFrom) return false;
    if (activeFilters.dateTo && requestDate && requestDate > activeFilters.dateTo) return false;

    return true;
  });

  const replaceRequest = React.useCallback((updatedRequest) => {
    setRequests((current) => current.map((request) => (
      request.id === updatedRequest.id ? { ...request, ...updatedRequest, updated_at: new Date().toISOString() } : request
    )));
  }, []);

  const runApprovalAction = React.useCallback(async (action) => {
    if (!selectedRequest) return;
    try {
      let result;
      if (action === 'Approve Selected') result = await approveRequest(demoTenantId, selectedRequest, founderNote);
      else if (action === 'Reject Selected') result = await rejectRequest(demoTenantId, selectedRequest, founderNote);
      else if (action === 'Needs Review') result = await needsReviewRequest(demoTenantId, selectedRequest, founderNote);
      else if (action === 'Request Revision') result = await requestRevision(demoTenantId, selectedRequest, founderNote);
      else if (action === 'Escalate to Executive') result = await escalateRequest(demoTenantId, selectedRequest, founderNote);
      else if (action === 'Add Founder Note') result = await addApprovalComment(demoTenantId, selectedRequest.id, founderNote || 'Founder note added.', 'Founder');

      if (result?.ok && result.data?.id) {
        replaceRequest(result.data);
        setApprovalStatusMessage(`${action.replace(' Selected', '')} recorded. Originating workflow sync event emitted.`);
        if (action === 'Approve Selected') {
          show('Approved successfully');
          announceToSR('Request approved successfully');
        }
        if (action === 'Reject Selected') {
          show('Rejected', 'warning');
          announceToSR('Request rejected', 'assertive');
        }
        if (action === 'Escalate to Executive') show('Escalated to Director', 'warning');
      } else if (result?.ok) {
        setApprovalStatusMessage('Founder note saved to approval comments.');
      } else {
        setApprovalStatusMessage(result?.error?.message || 'Approval action failed.');
        show('Action failed -- please retry', 'error');
      }
    } catch (error) {
      setApprovalStatusMessage(error?.message || 'Approval action failed.');
      show('Action failed -- please retry', 'error');
    }
    setModalAction(null);
  }, [founderNote, replaceRequest, selectedRequest, show]);

  const requestApprovalAction = React.useCallback(async (action) => {
    if (action === 'Approve Selected') {
      const ok = await confirm({
        title: 'Approve this request?',
        message: `This will approve "${selectedRequest?.title || 'this request'}" and notify the team.`,
        confirmLabel: 'Approve',
      });
      if (ok) await runApprovalAction(action);
      return;
    }
    if (action === 'Reject Selected') {
      const ok = await confirm({
        title: 'Reject this request?',
        message: 'This action will be logged and cannot be undone.',
        confirmLabel: 'Reject',
        confirmClass: 'tactical-button danger-button',
      });
      if (ok) await runApprovalAction(action);
      return;
    }
    if (action === 'Escalate to Executive') {
      const ok = await confirm({
        title: 'Escalate to Director?',
        message: 'This will flag the item as urgent and alert the Director command.',
        confirmLabel: 'Escalate',
      });
      if (ok) await runApprovalAction(action);
      return;
    }
    setModalAction(action);
  }, [confirm, runApprovalAction, selectedRequest]);

  const handleApprovalFilterChange = React.useCallback((filter) => setActiveFilter(filter), []);
  const handleApprovalSelect = React.useCallback((id) => setSelectedId(id), []);
  const handleApprovalModalCancel = React.useCallback(() => setModalAction(null), []);
  const handleApprovalModalConfirm = React.useCallback(() => runApprovalAction(modalAction), [modalAction, runApprovalAction]);

  return (
    <ExportOSShell className="operational-export-shell approval-wall-shell">
      <ApprovalWallHeader
        onBack={onBack}
        onOpenTasks={onOpenTasks}
        pendingCount={requests.filter((request) => ['Pending Approval', 'Needs Review'].includes(request.status)).length}
        highRiskCount={requests.filter((request) => ['High', 'Critical'].includes(request.risk_level)).length}
      />
      <section className="approval-wall-hero">
        <div>
          <span>Executive Decision Layer</span>
          <h1>Founder Approval Queue</h1>
          <p>Sensitive actions remain blocked until the founder approves, rejects, or requests review.</p>
        </div>
        <div className="approval-model-strip">
          {approvalModels.map((model) => <code key={model}>{model}</code>)}
        </div>
      </section>
      <div className="approval-engine-status"><StatusPulse /><span>{approvalStatusMessage}</span></div>
      <div className="approval-wall-layout">
        <ApprovalQueueList
          requests={filteredRequests}
          filters={approvalFilters}
          activeFilter={activeFilter}
          setActiveFilter={handleApprovalFilterChange}
          onFilterChange={(filters) => setActiveFilters(filters)}
          selectedId={selectedRequest?.id}
          onSelect={handleApprovalSelect}
          onBulkApprove={async (items) => {
            for (const item of items) {
              const r = await approveRequest(demoTenantId, item, 'Bulk approved by Founder');
              if (r?.ok && r.data?.id) replaceRequest(r.data);
            }
            show(`${items.length} request(s) approved`);
          }}
          onBulkReject={async (items) => {
            for (const item of items) {
              const r = await rejectRequest(demoTenantId, item, 'Bulk rejected by Founder');
              if (r?.ok && r.data?.id) replaceRequest(r.data);
            }
            show(`${items.length} request(s) rejected`, 'warning');
          }}
        />
        <div className="approval-center-stack">
          <ApprovalDetailPanel request={selectedRequest} onAction={requestApprovalAction} />
          <FounderNotesPanel value={founderNote} setValue={setFounderNote} />
          <ApprovalAnalytics />
        </div>
        <aside className="approval-side-stack">
          <RiskAuditOverview
            requests={requests}
            auditEvents={approvalAuditEvents}
            expanded={auditExpanded}
            setExpanded={setAuditExpanded}
          />
          <ExecutiveAlertsPanel alerts={urgentExecutiveAlerts} />
          <ApprovalMemoryPanel patterns={approvalMemoryPatterns} />
        </aside>
      </div>
      <ApprovalActionBar selectedRequest={selectedRequest} onAction={requestApprovalAction} />
      {modalAction && (
        <ApprovalConfirmationModal
          action={modalAction}
          request={selectedRequest}
          note={founderNote}
          onCancel={handleApprovalModalCancel}
          onConfirm={handleApprovalModalConfirm}
        />
      )}
      {Dialog}
      {ToastUI}
    </ExportOSShell>
  );
}

function ApprovalWallHeader({ onBack, onOpenTasks, pendingCount, highRiskCount }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="deck-header approval-wall-header">
      <div className="deck-header-copy">
        <span>GOPU Export OS</span>
        <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'Director Console' }]} />
        <h1>Director Command Center</h1>
        <p>Executive Decision Layer</p>
      </div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><FileCheck2 size={15} /><strong>Pending Approvals: {pendingCount}</strong></div>
        <div className="coo-status"><TriangleAlert size={15} /><strong>High-Risk Alerts: {highRiskCount}</strong></div>
        <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
        <button className="ghost-button deck-logout" onClick={onOpenTasks}><Workflow size={15} />Task Engine</button>
        <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
      </div>
    </header>
  );
}

function ApprovalQueueList({ requests, filters, activeFilter, setActiveFilter, onFilterChange, selectedId, onSelect, onBulkApprove, onBulkReject }) {
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 20;
  const approvalRows = React.useMemo(() => requests.map((request) => ({
    ...request,
    title: request.title || request.summary || 'Approval request',
    department: request.department || request.executive_owner || request.category || 'Executive',
    risk_level: request.risk_level || request.priority || 'Medium'
  })), [requests]);
  const { sorted: sortedApprovals, sortKey: aSort, sortDir: aDir, toggle: toggleASort } = useSortable(approvalRows, 'created_at');
  const { selected: aSelected, toggle: aToggle, toggleAll: aToggleAll, clear: aClear, isSelected: aIsSelected, allSelected: aAll, someSelected: aSome, selectedItems: aItems } = useRowSelection(sortedApprovals);
  const APPROVAL_COLS = React.useMemo(() => [
    { key: 'title', label: 'Title', flex: 2 },
    { key: 'department', label: 'Department', flex: 1 },
    { key: 'status', label: 'Status', flex: 0.9, sortable: false },
    { key: 'created_at', label: 'Date', flex: 0.9 },
    { key: 'risk_level', label: 'Risk', flex: 0.8 },
  ], []);
  const paged = sortedApprovals.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  React.useEffect(() => {
    setPage(1);
  }, [activeFilter, requests.length]);
  return (
    <section className="approval-panel approval-queue-panel">
      <div className="approval-section-header">
        <div>
          <span>Founder Gate</span>
          <h2>Founder Approval Queue</h2>
        </div>
        <small>{requests.length} visible</small>
      </div>
      <FilterBar
        storageKey="gopuos_command_filters"
        searchPlaceholder="Search commands, buyers, shipments..."
        statusOptions={[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'review', label: 'In Review' },
        ]}
        divisionOptions={[
          { value: 'coo', label: 'COO' },
          { value: 'cfo', label: 'CFO' },
          { value: 'cto', label: 'CTO' },
          { value: 'cmo', label: 'CMO' },
          { value: 'cio', label: 'CIO' },
        ]}
        priorityOptions={[
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ]}
        onFilterChange={onFilterChange}
      />
      <div className="approval-filter-row">
        {filters.map((filter) => (
          <button className={activeFilter === filter ? 'active' : ''} key={filter} onClick={() => setActiveFilter(filter)}>
            {filter}
          </button>
        ))}
      </div>
      <BulkActionBar
        count={aSelected.size}
        onClear={aClear}
        onExport={() => exportCSV(aItems, APPROVAL_COLS, 'approvals')}
        actions={[
          { label: 'Approve All', icon: CheckCircle2, onClick: async () => { if (onBulkApprove) { await onBulkApprove(aItems); aClear(); } } },
          { label: 'Reject All', icon: AlertTriangle, cls: 'danger-button', onClick: async () => { if (onBulkReject) { await onBulkReject(aItems); aClear(); } } },
        ]}
      />
      <SortableTableHeader
        columns={APPROVAL_COLS}
        sortKey={aSort}
        sortDir={aDir}
        onSort={toggleASort}
        allSelected={aAll}
        someSelected={aSome}
        onToggleAll={aToggleAll}
      />
      <div className="approval-queue-list">
        {sortedApprovals.length === 0
          ? <EmptyState icon={CheckCircle2} title="All clear" description="No pending approvals at this time." />
          : paged.map((request) => (
            <ApprovalQueueCard
              key={request.id}
              request={request}
              selected={selectedId === request.id}
              checked={aIsSelected(request.id)}
              onToggle={() => aToggle(request.id)}
              onSelect={() => onSelect(request.id)}
            />
          ))}
      </div>
      <Pagination total={sortedApprovals.length} perPage={PER_PAGE} page={page} onPage={setPage} />
    </section>
  );
}

const ApprovalQueueCard = React.memo(function ApprovalCard({ request, selected, checked, onToggle, onSelect }) {
  return (
    <button className={`approval-queue-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="approval-select-box" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select approval ${request.title}`}
        />
      </span>
      <div>
        <strong>{request.title}</strong>
        <StatusBadge label={request.status} state={getApprovalState(request.status)} />
      </div>
      <p>{request.summary}</p>
      <dl>
        <div><dt>Request type</dt><dd>{request.request_type}</dd></div>
        <div><dt>Related record</dt><dd>{request.related_record || request.related_workflow_id || request.buyer_name}</dd></div>
        <div><dt>Requested by</dt><dd>{request.requested_by_label || request.executive_owner}</dd></div>
        <div><dt>Requested time</dt><dd>{request.created_at}</dd></div>
        <div><dt>WhatsApp</dt><dd>{request.whatsapp_status || 'Pending'}</dd></div>
        <div><dt>Reason</dt><dd>{request.reason || request.summary}</dd></div>
      </dl>
      <footer>
        <PriorityBadge priority={request.priority} />
        <span>{request.risk_level} Risk</span>
        <time>{request.created_at}</time>
      </footer>
    </button>
  );
});

function ApprovalDetailPanel({ request, onAction }) {
  if (!request) return null;
  const entries = Object.entries(request.details || {});
  return (
    <section className="approval-panel approval-detail-panel">
      <div className="approval-detail-top">
        <div>
          <span>{request.request_type}</span>
          <h2>{request.title}</h2>
          <p>{request.summary}</p>
        </div>
        <div className="approval-detail-status">
          <StatusBadge label={request.status} state={getApprovalState(request.status)} />
          <PriorityBadge priority={request.priority} />
        </div>
      </div>
      <div className="approval-detail-meta">
        <div><span>Request Type</span><strong>{request.request_type}</strong></div>
        <div><span>Related Record</span><strong>{request.related_record || request.related_workflow_id || 'Not linked'}</strong></div>
        <div><span>Requested By</span><strong>{request.requested_by_label || request.executive_owner}</strong></div>
        <div><span>Requested Time</span><strong>{request.created_at}</strong></div>
        <div><span>Risk Level</span><strong>{request.risk_level}</strong></div>
        <div><span>Reason</span><strong>{request.reason || request.summary}</strong></div>
        <div><span>Department</span><strong>{request.department}</strong></div>
        <div><span>Value</span><strong>{request.amount || 'Workflow approval'}</strong></div>
        <div><span>WhatsApp Status</span><strong>{request.whatsapp_status || 'Pending'}</strong></div>
        <div><span>Workflow Source</span><strong>{request.details?.workflow_source || request.source_module || request.category}</strong></div>
        <div><span>Linked Record</span><strong>{request.details?.linked_invoice || request.details?.linked_quote || request.related_workflow_id || 'Not linked'}</strong></div>
      </div>
      <div className="approval-warning whatsapp-approval-status"><Mail size={16} />WhatsApp approval request: {request.whatsapp_status || 'Pending'} via {request.whatsapp_provider || 'provider-ready layer'}.</div>
      <div className="approval-detail-grid">
        {entries.map(([key, value]) => (
          <div key={key}>
            <span>{key.replaceAll('_', ' ')}</span>
            <p>{value}</p>
          </div>
        ))}
      </div>
      {request.request_type === 'Document Review' && (
        <div className="approval-warning"><TriangleAlert size={16} />Founder review required before document release.</div>
      )}
      {request.request_type === 'Marketing Claim Review' && (
        <div className="approval-warning"><TriangleAlert size={16} />Founder/legal review required before publishing claim.</div>
      )}
      <div className="founder-decision-required">
        <strong>Founder decision required</strong>
        <span>The sensitive action is blocked until this queue records Approved, Rejected, or Needs Review.</span>
      </div>
      <div className="approval-detail-actions">
        {['Approve Selected', 'Reject Selected', 'Needs Review', 'Request Revision', 'Escalate to Executive', 'Add Founder Note'].map((action) => (
          <button key={action} className={action === 'Approve Selected' ? 'tactical-button' : 'ghost-button'} onClick={() => onAction(action)}>{action.replace(' Selected', '')}</button>
        ))}
      </div>
    </section>
  );
}

function FounderNotesPanel({ value, setValue }) {
  return (
    <section className="approval-panel founder-notes-panel">
      <div className="approval-section-header">
        <div>
          <span>Founder Decision Notes</span>
          <h2>Audit-bound decision context</h2>
        </div>
        <FileText size={18} />
      </div>
      <textarea
        aria-label="Approval comment"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add decision comments, approval conditions, revision requests, or escalation notes."
      />
      <small>Notes are local-local for now and prepared for approval_comments audit history.</small>
    </section>
  );
}

function RiskAuditOverview({ requests, auditEvents, expanded, setExpanded }) {
  return (
    <section className="approval-panel risk-audit-panel">
      <div className="approval-section-header">
        <div>
          <span>Risk & Audit Overview</span>
          <h2>Decision pressure</h2>
        </div>
        <Activity size={18} />
      </div>
      <div className="risk-stat-grid">
        <div><span>High-risk today</span><strong>{requests.filter((request) => ['High', 'Critical'].includes(request.risk_level)).length}</strong></div>
        <div><span>Financial pending</span><strong>{requests.filter((request) => request.category === 'Financial').length}</strong></div>
        <div><span>Compliance reviews</span><strong>{requests.filter((request) => request.category === 'Compliance').length}</strong></div>
        <div><span>Escalated workflows</span><strong>{requests.filter((request) => request.status === 'Escalated').length}</strong></div>
        <div><span>Avg approval time</span><strong>2h 15m</strong></div>
        <div><span>Founder backlog</span><strong>{requests.length}</strong></div>
      </div>
      <button className="approval-inline-button" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Collapse Audit Timeline' : 'Expand Audit Timeline'}
      </button>
      <div className={`approval-audit-list ${expanded ? 'expanded' : ''}`}>
        {(expanded ? auditEvents : auditEvents.slice(0, 3)).map((event) => (
          <div key={event.id}>
            <time>{event.time}</time>
            <strong>{event.event}</strong>
            <span>{event.actor} - {event.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalActionBar({ selectedRequest, onAction }) {
  return (
    <div className="approval-action-bar">
      <div>
        <span>Selected approval</span>
        <strong>{selectedRequest?.title || 'No request selected'}</strong>
      </div>
      <button onClick={() => onAction('Approve Selected')}>Approve Selected</button>
      <button onClick={() => onAction('Reject Selected')}>Reject Selected</button>
      <button onClick={() => onAction('Needs Review')}>Needs Review</button>
      <button onClick={() => onAction('Request Revision')}>Request Revision</button>
      <button onClick={() => onAction('Escalate to Executive')}>Escalate to Executive</button>
      <button onClick={() => onAction('Add Founder Note')}>Add Founder Note</button>
    </div>
  );
}

function ApprovalAnalytics() {
  const analytics = [
    ['Approvals by department', 'Finance leads current queue'],
    ['Approval delays', 'Compliance reviews wait longest'],
    ['Repeated escalations', 'Origin claims and payment terms'],
    ['Common risk triggers', 'Low margin, missing fields, legal claims'],
    ['Revisions required', '3 requests need clearer evidence'],
    ['Department bottleneck', 'Documentation review']
  ];
  return (
    <section className="approval-panel approval-analytics-panel">
      <div className="approval-section-header">
        <div>
          <span>Approval Intelligence</span>
          <h2>Decision analytics</h2>
        </div>
        <Gauge size={18} />
      </div>
      <div className="approval-analytics-grid">
        {analytics.map(([label, value], index) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <i style={{ width: `${46 + index * 7}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutiveAlertsPanel({ alerts }) {
  return (
    <section className="approval-panel executive-alerts-panel">
      <div className="approval-section-header">
        <div>
          <span>Urgent Executive Alerts</span>
          <h2>Exception watch</h2>
        </div>
        <TriangleAlert size={18} />
      </div>
      {alerts.map((alert) => (
        <article className={`executive-alert-row risk-${alert.risk.toLowerCase()}`} key={alert.title}>
          <strong>{alert.title}</strong>
          <span>{alert.risk} - {alert.owner}</span>
          <p>{alert.action}</p>
        </article>
      ))}
    </section>
  );
}

function ApprovalMemoryPanel({ patterns }) {
  const [message, setMessage] = useState('Memory');
  function local(messageText) {
    setMessage(messageText);
    window.setTimeout(() => setMessage('Memory'), 3600);
  }
  return (
    <section className="approval-panel approval-memory-panel">
      <div className="approval-section-header">
        <div>
          <span>Approval Intelligence Memory</span>
          <h2>{message}</h2>
        </div>
        <Database size={18} />
      </div>
      <div className="approval-memory-list">
        {patterns.map((pattern) => <span key={pattern}>{pattern}</span>)}
      </div>
      <div className="side-action-stack">
        <button onClick={() => local('Local rule staged - no backend write')}>Save Approval Rule</button>
        <button onClick={() => local('Local policy editor ready')}>Create New Approval Policy</button>
        <button onClick={() => local('Local approval history opened')}>Review Approval History</button>
      </div>
    </section>
  );
}

function ApprovalConfirmationModal({ action, request, note, onCancel, onConfirm }) {
  const finalAction = !['Add Founder Note'].includes(action);
  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="approval-confirm-title">
      <div className="article-modal approval-confirm-modal">
        <button className="login-back" onClick={onCancel}>Cancel</button>
        <span className="selected-os-badge">{request.request_type}</span>
        <h2 id="approval-confirm-title">{action}</h2>
        <p>This records a founder decision for <strong>{request.title}</strong>. It updates approval status, writes audit records, and emits a source workflow sync event. It does not release payments, shipments, emails, or external documents directly.</p>
        {note && <p><strong>Founder note:</strong> {note}</p>}
        <div className="approval-confirm-actions">
          <button className="ghost-button" onClick={onCancel}>Keep Reviewing</button>
          <button className="tactical-button" onClick={onConfirm}>{finalAction ? 'Confirm Decision' : 'Save Note'}</button>
        </div>
      </div>
    </div>
  );
}

export { FounderApprovalWall };
export { ApprovalConfirmationModal };

function DirectorDecisionDetailPage({ decisionId, navigate, onBack }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [actionDone, setActionDone] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/director/approvals')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!mounted) return;
        const all = json?.approvals || [];
        const found = all.find((a) => a.id === decisionId);
        setItem(found || null);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [decisionId]);

  async function doAction(action) {
    if (!item || acting) return;
    setActing(true);
    const client = supabase;
    const error = !isSupabaseConfigured ? new Error('not configured') : null;
    if (!error && client) {
      const statusMap = { Approve: 'Approved', Reject: 'Rejected', Clarify: 'Needs Review', Escalate: 'Escalated' };
      const newStatus = statusMap[action] || action;
      await client.from('founder_approvals')
        .update({ status: newStatus, approval_status: newStatus, decision_note: note, decided_by: 'Director', decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', item.id);
      // If approved — advance export order to Stage 2
      if (action === 'Approve') {
        const meta = item.metadata || {};
        if (meta.export_order_id) {
          await client.from('export_orders')
            .update({ current_stage: 2, current_stage_name: 'Order Confirmed', updated_at: new Date().toISOString() })
            .eq('id', meta.export_order_id);
        }
        if (meta.lead?.id || meta.lead_id) {
          await client.from('lead_intake')
            .update({ status: 'Director Approved', updated_at: new Date().toISOString() })
            .eq('id', meta.lead?.id || meta.lead_id);
        }
      }
    }
    setActionDone(action);
    setActing(false);
    setItem((prev) => prev ? { ...prev, status: action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : 'Needs Review' } : prev);
  }

  if (loading) return (
    <div className="dir-detail-page">
      <button className="director-back-link" onClick={onBack}><ArrowLeft size={15} /> Director Command</button>
      <div className="dir-detail-loading">Loading decision details…</div>
    </div>
  );

  if (!item) return (
    <div className="dir-detail-page">
      <button className="director-back-link" onClick={onBack}><ArrowLeft size={15} /> Director Command</button>
      <div className="dir-detail-loading">Decision not found.</div>
    </div>
  );

  const meta = item.metadata || {};
  const lead = meta.lead || {};
  const pricing = meta.pricing || {};
  const logistics = meta.logistics || {};
  const compliance = meta.compliance || {};
  const buyerReply = meta.buyer_reply_draft || '';
  const createdAt = item.created_at ? new Date(item.created_at) : null;
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const pricingLines = pricing.lines || [];
  const isActioned = ['Approved', 'Rejected'].includes(item.status) || actionDone;

  const timelineSteps = [
    {
      id: 'slack',
      icon: <Zap size={16} />,
      color: '#22c55e',
      label: 'Lead received from Slack',
      time: fmtTime(item.created_at),
      detail: [
        lead.buyer_name || item.buyer_name ? `Buyer: ${lead.buyer_name || item.buyer_name}` : null,
        lead.company_name ? `Company: ${lead.company_name}` : null,
        lead.product || item.product ? `Product: ${lead.product || item.product}` : null,
        lead.quantity ? `Quantity: ${lead.quantity} ${lead.unit || ''}`.trim() : null,
        lead.country || lead.destination_country ? `Destination: ${lead.country || lead.destination_country}` : null,
        lead.incoterm ? `Incoterm: ${lead.incoterm}` : null,
        lead.email ? `Email: ${lead.email}` : null,
      ].filter(Boolean),
    },
    {
      id: 'coo',
      icon: <Activity size={16} />,
      color: '#10b981',
      label: 'COO Agent — Feasibility Check',
      time: fmtTime(item.created_at),
      detail: [
        'Verified export feasibility for buyer destination.',
        lead.destination_country && lead.destination_country !== 'Not provided' ? `✓ Destination: ${lead.destination_country}` : '⚠ Destination needs verification',
        lead.product && lead.product !== 'Requested product' ? `✓ Product: ${lead.product}` : '⚠ Product needs verification',
        lead.quantity ? `✓ Quantity captured: ${lead.quantity} ${lead.unit || ''}`.trim() : '⚠ Quantity not specified',
        logistics.estimated_freight_days ? `Estimated freight: ${logistics.estimated_freight_days} days` : null,
        logistics.port_of_loading ? `Port: ${logistics.port_of_loading}` : null,
      ].filter(Boolean),
    },
    {
      id: 'cfo',
      icon: <CircleDollarSign size={16} />,
      color: '#f59e0b',
      label: 'CFO Agent — Pricing Calculation',
      time: fmtTime(item.created_at),
      detail: [
        pricing.recommendedPricePerUnit ? `Price per unit: ${pricing.currency || 'USD'} ${pricing.recommendedPricePerUnit}` : null,
        pricing.totalCost ? `Total cost: ${pricing.currency || 'USD'} ${pricing.totalCost}` : null,
        item.amount ? `Quotation amount: ${item.amount}` : null,
        pricing.achievedMarginPercent != null ? `Margin: ${pricing.achievedMarginPercent}%` : null,
        pricing.targetMargin != null ? `Target margin: ${pricing.targetMargin}%` : null,
        pricing.achievedMarginPercent < pricing.minMargin ? '⚠ Below minimum margin — risk flagged' : pricing.achievedMarginPercent ? '✓ Margin within acceptable range' : null,
        ...pricingLines.slice(0, 5).map((l) => `${l.label || l.key}: ${l.lineTotal != null ? `${pricing.currency || 'USD'} ${l.lineTotal}` : l.value || ''}`),
      ].filter(Boolean),
    },
    compliance.documents?.length ? {
      id: 'compliance',
      icon: <ShieldCheck size={16} />,
      color: '#6366f1',
      label: 'Compliance Agent — Document Check',
      time: fmtTime(item.created_at),
      detail: (compliance.documents || []).slice(0, 6).map((d) => `${d.required ? '✓' : '○'} ${d.name || d}`),
    } : null,
    {
      id: 'director',
      icon: <AlertTriangle size={16} />,
      color: '#ff5a5a',
      label: 'Routed to Director — Approval Required',
      time: fmtTime(item.created_at),
      detail: [
        item.reason || 'Director approval required before quote, invoice, or buyer commitment.',
        `Risk level: ${item.risk_level || 'Medium'}`,
        `Request type: ${item.approval_type || item.request_type || 'Quote Approval'}`,
      ].filter(Boolean),
    },
  ].filter(Boolean);

  return (
    <div className="dir-detail-page">
      <div className="dir-detail-topbar">
        <button className="director-back-link" onClick={onBack}><ArrowLeft size={15} /> Director Command</button>
        <span className={`director-priority-badge director-priority-${String(item.priority || 'medium').toLowerCase()}`}>{item.priority || 'Medium'}</span>
        <span className="dir-detail-status" data-status={item.status}>{item.status || 'Pending'}</span>
      </div>

      <div className="dir-detail-hero">
        <div className="director-glow-orb" aria-hidden="true" />
        <h1>{item.title || 'Director Decision'}</h1>
        <div className="dir-detail-hero-meta">
          {(item.buyer_name || lead.company_name) && <span><User size={13} /> {item.buyer_name || lead.company_name}</span>}
          {item.amount && <span><CircleDollarSign size={13} /> {item.amount}</span>}
          {(lead.product || item.product) && <span><Boxes size={13} /> {lead.product || item.product}</span>}
          {item.source_executive && <span><Activity size={13} /> {item.source_executive}</span>}
        </div>
      </div>

      <div className="dir-detail-layout">
        <div className="dir-detail-main">
          <section className="dir-timeline-section">
            <h2>Pipeline Timeline</h2>
            <div className="dir-timeline">
              {timelineSteps.map((step, i) => (
                <div key={step.id} className="dir-timeline-step">
                  <div className="dir-timeline-connector">
                    <span className="dir-timeline-dot" style={{ background: step.color, boxShadow: `0 0 8px ${step.color}` }}>{step.icon}</span>
                    {i < timelineSteps.length - 1 && <span className="dir-timeline-line" />}
                  </div>
                  <div className="dir-timeline-body">
                    <div className="dir-timeline-header">
                      <strong style={{ color: step.color }}>{step.label}</strong>
                      <time>{step.time}</time>
                    </div>
                    <ul className="dir-timeline-detail">
                      {step.detail.map((d, j) => <li key={j}>{d}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {pricingLines.length > 0 && (
            <section className="dir-pricing-breakdown">
              <h2>CFO Pricing Breakdown</h2>
              <table className="dir-pricing-table">
                <thead><tr><th>Line Item</th><th>Value</th><th>Total</th></tr></thead>
                <tbody>
                  {pricingLines.map((line, i) => (
                    <tr key={i}>
                      <td>{line.label || line.key}</td>
                      <td>{line.value != null ? line.value : '—'}</td>
                      <td className="dir-pricing-total">{line.lineTotal != null ? `${pricing.currency || 'USD'} ${Number(line.lineTotal).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total Quotation</strong></td>
                    <td className="dir-pricing-grand">{item.amount || '—'}</td>
                  </tr>
                  {pricing.achievedMarginPercent != null && (
                    <tr>
                      <td colSpan={2}><strong>Margin</strong></td>
                      <td className={pricing.achievedMarginPercent < pricing.minMargin ? 'dir-pricing-risk' : 'dir-pricing-ok'}>{pricing.achievedMarginPercent}%</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </section>
          )}

          {buyerReply && (
            <section className="dir-buyer-reply">
              <h2>Draft Buyer Reply <span>(holds until Director approves)</span></h2>
              <pre className="dir-reply-text">{buyerReply}</pre>
            </section>
          )}
        </div>

        <aside className="dir-detail-sidebar">
          <div className="dir-sidebar-card">
            <h3>Decision Details</h3>
            <dl>
              <dt>Buyer</dt><dd>{item.buyer_name || lead.company_name || '—'}</dd>
              <dt>Product</dt><dd>{lead.product || item.product || '—'}</dd>
              <dt>Quantity</dt><dd>{lead.quantity ? `${lead.quantity} ${lead.unit || ''}`.trim() : '—'}</dd>
              <dt>Destination</dt><dd>{lead.country || lead.destination_country || '—'}</dd>
              <dt>Incoterm</dt><dd>{lead.incoterm || '—'}</dd>
              <dt>Amount</dt><dd className="dir-sidebar-amount">{item.amount || '—'}</dd>
              <dt>Risk Level</dt><dd>{item.risk_level || 'Medium'}</dd>
              <dt>Received</dt><dd>{fmtTime(item.created_at)}</dd>
              <dt>Status</dt><dd>{item.status || 'Pending'}</dd>
            </dl>
          </div>

          {!isActioned ? (
            <div className="dir-action-card">
              <h3>Director Decision</h3>
              <p>Once you approve, the quotation is released and the export order advances to Stage 2 — Order Confirmed.</p>
              <textarea
                className="dir-note-input"
                placeholder="Add a note (optional)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <div className="dir-action-buttons">
                <button className="dir-btn-approve dir-btn-lg" disabled={acting} onClick={() => doAction('Approve')}>
                  {acting ? 'Processing…' : '✓ Approve'}
                </button>
                <button className="dir-btn-reject dir-btn-lg" disabled={acting} onClick={() => doAction('Reject')}>
                  ✗ Reject
                </button>
                <button className="dir-btn-ghost" disabled={acting} onClick={() => doAction('Clarify')}>
                  Clarify
                </button>
                <button className="dir-btn-ghost" disabled={acting} onClick={() => doAction('Escalate')}>
                  Escalate
                </button>
              </div>
            </div>
          ) : (
            <div className="dir-action-card dir-action-card--done">
              <h3>{actionDone === 'Approve' || item.status === 'Approved' ? '✓ Approved' : item.status === 'Rejected' ? '✗ Rejected' : 'Decision Recorded'}</h3>
              {(actionDone === 'Approve' || item.status === 'Approved') && (
                <>
                  <p style={{ color: '#22c55e' }}>Quotation released. Export order advanced to Stage 2.</p>
                  <button className="tactical-button" onClick={() => navigate('/export-os/invoices/new')}>Create Invoice <ChevronRight size={14} /></button>
                  <button className="ghost-button" style={{ marginTop: 8 }} onClick={() => navigate('/export-os/shipments')}>View Shipments <ChevronRight size={14} /></button>
                </>
              )}
              {(actionDone === 'Reject' || item.status === 'Rejected') && (
                <p style={{ color: '#ff5a5a' }}>Rejection recorded. Source executive notified.</p>
              )}
              <button className="ghost-button" style={{ marginTop: 12 }} onClick={onBack}>← Back to Queue</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default DirectorCommandCenter;
export { DirectorDecisionDetailPage };