import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Search,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  Workflow
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { EmptyState, PriorityBadge, StatusBadge } from '../shared/uiPrimitives.jsx';
import { displayDateTime } from '../utils/dateTime.js';
import { demoTenantId } from '../services/companyService.js';
import { createApprovalRequest } from '../services/approvalService.js';
import { generateCOODailyPlan } from '../services/cooService.js';
import { sendSlackNotification } from '../services/slackNotificationService.js';
import {
  addTaskComment,
  createTaskFromWorkflow,
  escalateTask as escalateWorkflowTask,
  getTasks,
  updateTaskStatus as updateWorkflowTaskStatus
} from '../services/taskService.js';

const taskEngineModels = ['tasks', 'task_comments', 'task_status_history', 'task_escalations', 'task_followups', 'escalation_rules'];

const initialTaskItems = [
  {
    id: 'task-uae-buyer',
    title: 'Verify buyer details for UAE enquiry',
    description: 'Confirm buyer company, country, email, delivery address, and intended product before pricing moves forward.',
    workflow_source: 'Lead Intake',
    linked_record_id: 'LEAD-UAE-024',
    linked_label: 'UAE spice enquiry',
    department: 'Operations',
    owner_command: 'COO Command',
    assigned_to: 'Operations desk',
    priority: 'High',
    status: 'In Progress',
    due_date: 'Today',
    escalation_level: 'COO if buyer data remains incomplete by evening',
    blocking_reason: '',
    next_action: 'Validate buyer identity and complete intake fields.',
    buyer: 'UAE enquiry',
    product: 'Spice mix',
    created_at: 'Today 08:40',
    updated_at: 'Today 09:20'
  },
  {
    id: 'task-pepper-margin',
    title: 'Review pricing margin for black pepper quote',
    description: 'CFO review needed before quote is routed to founder approval.',
    workflow_source: 'Pricing Engine',
    linked_record_id: 'GX-QTN-1042',
    linked_label: 'Black pepper quote',
    department: 'Finance',
    owner_command: 'CFO Command',
    assigned_to: 'Finance desk',
    priority: 'High',
    status: 'Waiting Review',
    due_date: 'Today',
    escalation_level: 'Founder if margin remains below threshold',
    blocking_reason: '',
    next_action: 'Confirm margin threshold and freight assumption.',
    buyer: 'Gulf Foods LLC',
    product: 'Black pepper',
    created_at: 'Today 09:10',
    updated_at: 'Today 09:45'
  },
  {
    id: 'task-lut-data',
    title: 'Complete LUT data before invoice release',
    description: 'LUT ARN, financial year, validity, document upload, and founder verification are required before invoice release.',
    workflow_source: 'Invoice System',
    linked_record_id: 'GX-INV-DRAFT-001',
    linked_label: 'LUT invoice draft',
    department: 'Finance',
    owner_command: 'Founder / Finance',
    assigned_to: 'Founder office',
    priority: 'Critical',
    status: 'Blocked',
    due_date: 'Today',
    escalation_level: 'Founder approval required before release',
    blocking_reason: 'LUT details incomplete in Company Master Data Vault.',
    next_action: 'Complete LUT fields and upload document pending.',
    buyer: 'Draft Buyer',
    product: 'Export invoice',
    created_at: 'Today 09:30',
    updated_at: 'Today 10:05'
  },
  {
    id: 'task-api-form',
    title: 'Check website enquiry form API',
    description: 'Review lead intake capture and notification reliability for website enquiries.',
    workflow_source: 'Platform Monitoring',
    linked_record_id: 'CTO-API-018',
    linked_label: 'Website enquiry API',
    department: 'Technical',
    owner_command: 'CTO Command',
    assigned_to: 'Technology desk',
    priority: 'Medium',
    status: 'In Progress',
    due_date: 'Tomorrow',
    escalation_level: 'CTO if form failure repeats',
    blocking_reason: '',
    next_action: 'Check API logs and failed form capture path.',
    buyer: '',
    product: '',
    created_at: 'Today 10:00',
    updated_at: 'Today 10:20'
  },
  {
    id: 'task-linkedin-post',
    title: 'Prepare LinkedIn export post',
    description: 'Draft export capability post and route any compliance-sensitive claim for founder review.',
    workflow_source: 'Content Engine',
    linked_record_id: 'CMO-CONTENT-011',
    linked_label: 'LinkedIn content draft',
    department: 'Marketing',
    owner_command: 'CMO Command',
    assigned_to: 'Marketing desk',
    priority: 'Medium',
    status: 'New',
    due_date: 'Today',
    escalation_level: 'CMO + Founder if public claim requires approval',
    blocking_reason: '',
    next_action: 'Draft content without unverified claims.',
    buyer: '',
    product: 'Brand content',
    created_at: 'Today 10:25',
    updated_at: 'Today 10:25'
  },
  {
    id: 'task-document-validation',
    title: 'Fix missing HSN before invoice PDF draft',
    description: 'Invoice validation blocks final PDF until HSN review is completed.',
    workflow_source: 'Documents',
    linked_record_id: 'GX-INV-DRAFT-001',
    linked_label: 'Invoice validation',
    department: 'Documentation',
    owner_command: 'COO Command',
    assigned_to: 'Documentation desk',
    priority: 'Critical',
    status: 'Escalated',
    due_date: 'Overdue',
    escalation_level: 'Founder review if HSN/origin remains pending',
    blocking_reason: 'HSN code and origin review are pending.',
    next_action: 'Complete HSN review and route founder approval.',
    buyer: 'Draft Buyer',
    product: 'Premium spice product',
    created_at: 'Yesterday 16:10',
    updated_at: 'Today 09:05'
  }
];

const taskEscalationRules = [
  ['Overdue by 1 day', 'Notify owner', 'Owner notification local'],
  ['Overdue by 2 days', 'Escalate to COO Command', 'COO escalation local'],
  ['Blocks buyer quote', 'Escalate to Founder', 'Founder review local'],
  ['Affects invoice release', 'Escalate to CFO + Founder', 'Finance/founder local'],
  ['Affects website/API/form', 'Escalate to CTO', 'Technical escalation local'],
  ['Affects public claim/content', 'Escalate to CMO + Founder', 'Marketing/founder local']
].map(([rule_name, trigger_condition, escalation_target], index) => ({ id: `task-rule-${index}`, rule_name, trigger_condition, escalation_target, active_status: 'Active Local' }));


function useDragDrop(onDrop) {
  const dragging = React.useRef(null);
  const [overCol, setOverCol] = React.useState(null);
  function onDragStart(e, item) {
    dragging.current = item;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }
  function onDragEnd(e) {
    dragging.current = null;
    setOverCol(null);
    e.currentTarget.classList.remove('dragging');
  }
  function onDragOver(e, col) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverCol(col);
  }
  function onDragLeave() { setOverCol(null); }
  function onDropCol(e, col) {
    e.preventDefault();
    setOverCol(null);
    if (dragging.current) onDrop(dragging.current, col);
    dragging.current = null;
  }
  return { onDragStart, onDragEnd, onDragOver, onDragLeave, onDropCol, overCol };
}

const KANBAN_COLS = [
  { key: 'To Do', label: 'To Do', color: 'var(--muted)' },
  { key: 'In Progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'Blocked', label: 'Blocked', color: 'var(--error)' },
  { key: 'Done', label: 'Done', color: 'var(--success)' },
];

function normalizeKanbanStatus(status = 'To Do') {
  if (status === 'Done') return 'Done';
  if (status === 'In Progress') return 'In Progress';
  if (['Blocked', 'Escalated', 'Waiting Founder Approval', 'Revision Required'].includes(status)) return 'Blocked';
  return 'To Do';
}

function KanbanBoard({ tasks = [], onStatusChange, onCreateTask }) {
  const { onDragStart, onDragEnd, onDragOver, onDragLeave, onDropCol, overCol } = useDragDrop((task, newStatus) => onStatusChange(task, newStatus));
  return (
    <div className="kanban-board" role="region" aria-label="Task board">
      {KANBAN_COLS.map((col) => {
        const colTasks = tasks.filter((t) => normalizeKanbanStatus(t.status) === col.key);
        return (
          <div key={col.key} className={`kanban-col ${overCol === col.key ? 'drag-over' : ''}`} onDragOver={(e) => onDragOver(e, col.key)} onDragLeave={onDragLeave} onDrop={(e) => onDropCol(e, col.key)} aria-label={`${col.label} column, ${colTasks.length} tasks`}>
            <header className="kanban-col-header"><span className="kanban-col-dot" style={{ background: col.color }} aria-hidden="true" /><span className="kanban-col-title">{col.label}</span><span className="kanban-col-count">{colTasks.length}</span></header>
            <div className="kanban-cards stagger-list">
              {colTasks.length === 0 && (
                <div className="kanban-empty task-kanban-empty">
                  <ClipboardCheck size={22} />
                  <strong>No {col.label.toLowerCase()} tasks</strong>
                  <button onClick={onCreateTask}>Create Task</button>
                </div>
              )}
              {colTasks.map((task) => {
                const due = task.due_date ? new Date(task.due_date) : null;
                const validDue = due && !Number.isNaN(due.getTime());
                const dueLabel = validDue ? due.toLocaleDateString([], { month: 'short', day: 'numeric' }) : task.due_date;
                return (
                  <div key={task.id} className="kanban-card" draggable="true" onDragStart={(e) => onDragStart(e, task)} onDragEnd={onDragEnd} role="article" aria-label={`Task: ${task.title}`} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}>
                    <div className="kanban-card-top"><span className="kanban-card-title">{task.title}</span>{task.priority && <span className="kanban-priority" style={{ color: task.priority === 'High' ? 'var(--error)' : task.priority === 'Medium' ? 'var(--warning)' : 'var(--muted)' }}>{task.priority}</span>}</div>
                    {task.description && <p className="kanban-card-desc">{task.description}</p>}
                    <footer className="kanban-card-footer">
                      {task.owner_command && <span className="kanban-owner">{task.owner_command}</span>}
                      {dueLabel && <time className="kanban-due" dateTime={validDue ? due.toISOString() : undefined} style={{ color: task.due_date === 'Overdue' || (validDue && due < new Date()) ? 'var(--error)' : 'var(--dim)' }}>{dueLabel}</time>}
                    </footer>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TaskFollowupEngine({ navigate, onBack }) {
  const [tasks, setTasks] = useState(initialTaskItems);
  const [auditEvents, setAuditEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [taskView, setTaskView] = React.useState('list');
  const [selectedId, setSelectedId] = useState(initialTaskItems[0].id);
  const [note, setNote] = useState('');
  const [dailyPlan, setDailyPlan] = useState('');
  const [founderSummary, setFounderSummary] = useState('');
  const [taskNotice, setTaskNotice] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState({
    title: '',
    owner: 'COO Command',
    priority: 'High',
    dueDate: 'Today',
    description: ''
  });
  const selectedTask = tasks.find((task) => task.id === selectedId) || tasks[0];
  const openTaskCount = tasks.filter((task) => !['Done', 'Completed'].includes(String(task.status || ''))).length;
  const escalatedTaskCount = tasks.filter((task) => ['Escalated', 'Waiting Founder Approval', 'Revision Required'].includes(task.status)).length;
  const filters = ['All', 'My Tasks', 'Overdue', 'Blocked Only', 'Due Today', 'COO', 'CFO', 'CTO', 'CMO', 'Founder Approval', 'Lead Intake', 'Pricing', 'Invoice', 'Documents', 'Shipments', 'Marketing', 'Technical', 'Blocked', 'High Priority'];
  const handleTaskSearch = React.useCallback((event) => setSearch(event.target.value), []);
  const handleTaskFilterChange = React.useCallback((filter) => setActiveFilter(filter), []);
  const filteredTasks = tasks.filter((task) => {
    const haystack = `${task.title} ${task.owner_command} ${task.buyer} ${task.product} ${task.workflow_source} ${task.linked_record_id}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All'
      || task.owner_command.startsWith(activeFilter)
      || task.workflow_source.includes(activeFilter)
      || task.department === activeFilter
      || (activeFilter === 'My Tasks' && String(task.owner_command || '').includes('Founder'))
      || (activeFilter === 'Founder Approval' && task.escalation_level.includes('Founder'))
      || (activeFilter === 'Overdue' && task.due_date === 'Overdue')
      || (activeFilter === 'Blocked Only' && task.status === 'Blocked')
      || (activeFilter === 'Due Today' && task.due_date === 'Today')
      || (activeFilter === 'Blocked' && task.status === 'Blocked')
      || (activeFilter === 'High Priority' && ['High', 'Critical'].includes(task.priority))
      || (activeFilter === 'Invoice' && task.workflow_source.includes('Invoice'))
      || (activeFilter === 'Pricing' && task.workflow_source.includes('Pricing'));
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    let mounted = true;
    getTasks(demoTenantId).then((result) => {
      if (!mounted || !result.data?.length) return;
      setTasks(result.data);
      setSelectedId((current) => result.data.some((task) => task.id === current) ? current : result.data[0].id);
    });
    const handleCreated = (event) => {
      setTasks((current) => current.some((task) => task.id === event.detail.id) ? current : [event.detail, ...current]);
      setSelectedId(event.detail.id);
    };
    const handleUpdated = (event) => {
      setTasks((current) => current.map((task) => task.id === event.detail.id ? { ...task, ...event.detail } : task));
    };
    const handleAudit = (event) => setAuditEvents((current) => [event.detail, ...current].slice(0, 20));
    window.addEventListener('gopu:task-created', handleCreated);
    window.addEventListener('gopu:task-updated', handleUpdated);
    window.addEventListener('gopu:task-audit', handleAudit);
    return () => {
      mounted = false;
      window.removeEventListener('gopu:task-created', handleCreated);
      window.removeEventListener('gopu:task-updated', handleUpdated);
      window.removeEventListener('gopu:task-audit', handleAudit);
    };
  }, []);

  async function updateTaskStatus(status, notes = '') {
    const result = await updateWorkflowTaskStatus(demoTenantId, selectedTask.id, status, notes, 'COO Command');
    const updated = result.data || { ...selectedTask, status, updated_at: 'Now' };
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? updated : task));
    if (status === 'Blocked') {
      await sendSlackNotification({
        type: 'Task Blocked',
        priority: 'WARNING',
        reference: selectedTask.id,
        buyer: selectedTask.title,
        status: 'Blocked',
        actionRequired: selectedTask.blocking_reason || notes || selectedTask.next_action,
        source: 'Task Engine'
      });
      setTaskNotice('Blocked task notification sent to Slack.');
    }
    if (notes) {
      await addTaskComment(demoTenantId, selectedTask.id, notes, 'COO Command');
      setNote('');
    }
  }

  async function updateTaskFromBoard(task, status) {
    const result = await updateWorkflowTaskStatus(demoTenantId, task.id, status, 'Task moved from kanban board.', 'COO Command');
    const updated = result.data || { ...task, status, updated_at: 'Now' };
    setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    setSelectedId(task.id);
  }

  async function addNoteToTask(notes = '') {
    if (!notes.trim()) return;
    await addTaskComment(demoTenantId, selectedTask.id, notes, 'COO Command');
    setAuditEvents((current) => [{ id: `note-${Date.now()}`, task_id: selectedTask.id, actor: 'COO Command', notes: `note added - ${notes}`, created_at: new Date().toISOString() }, ...current]);
    setNote('');
  }

  async function escalateSelectedTask(task, notes = '', notifySlack = true) {
    await escalateWorkflowTask(demoTenantId, task.id, notes || task.blocking_reason || task.escalation_level, 'Founder / COO');
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: 'Escalated', updated_at: 'Now' } : item));
    if (notifySlack) {
      await sendSlackNotification({
        type: 'Task Escalated',
        priority: 'URGENT',
        reference: task.id,
        buyer: task.title,
        status: 'Escalated',
        actionRequired: 'Founder review required',
        source: 'Task Engine'
      });
      setTaskNotice('Escalation notification sent to Slack.');
    }
  }

  async function routeTaskApproval(task, notes = '') {
    await createApprovalRequest({
      tenant_id: demoTenantId,
      request_type: task.status === 'Blocked' ? 'Operational Exception' : 'Shipment Risk Escalation',
      title: `${task.title} requires founder attention`,
      department: task.department,
      executive_owner: task.owner_command,
      buyer_name: task.buyer || task.linked_label || 'Operational workflow',
      related_workflow_id: null,
      risk_level: task.priority === 'Critical' ? 'Critical' : task.priority === 'High' ? 'High' : 'Medium',
      priority: task.priority,
      status: 'Founder Review Required',
      summary: task.blocking_reason || task.description,
      source_module: 'task-engine',
      category: 'Operations',
      details: {
        workflow_source: 'Task Engine',
        linked_task: task.linked_record_id,
        risk_reason: task.blocking_reason || task.escalation_level,
        operational_impact: task.next_action,
        coo_notes: notes || 'COO requests founder decision before workflow moves forward.'
      }
    });
    await sendSlackNotification({
      type: 'Founder Approval Required',
      priority: 'URGENT',
      reference: task.id,
      buyer: task.title,
      status: 'Pending Founder Approval',
      actionRequired: 'Open Director Command to approve',
      source: 'Task Engine'
    });
    setTaskNotice('Founder approval notification sent to Slack.');
    await escalateSelectedTask(task, notes, false);
    navigate('/export-os/director');
  }

  async function runAIAgentAgain(task) {
    if (!task?.id) return;
    setTaskNotice(`Running ${task.owner_command || 'AI Agent'} again...`);
    try {
      const response = await fetch('/api/ai-agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });
      const result = await response.json().catch(() => ({}));
      setTaskNotice(result.ok ? `${task.owner_command || 'AI Agent'} rerun completed.` : result.message || 'AI agent rerun needs review.');
      const refreshed = await getTasks(demoTenantId);
      if (refreshed.data?.length) {
        setTasks(refreshed.data);
        setSelectedId(task.id);
      }
    } catch (error) {
      setTaskNotice(error?.message || 'AI agent rerun failed.');
    }
  }

  async function createNewTask() {
    if (!newTaskDraft.title.trim()) {
      setTaskNotice('Task title is required.');
      return;
    }
    const result = await createTaskFromWorkflow({
      tenant_id: demoTenantId,
      title: newTaskDraft.title.trim(),
      description: newTaskDraft.description.trim() || 'Manual task created from Task Engine.',
      workflow_source: 'Task Engine',
      linked_record_id: `TASK-${Date.now()}`,
      linked_label: newTaskDraft.title.trim(),
      linked_route: '/export-os/tasks',
      department: newTaskDraft.owner === 'Founder' ? 'Founder Office' : newTaskDraft.owner.replace(' Command', ''),
      owner_command: newTaskDraft.owner,
      assigned_role: newTaskDraft.owner,
      priority: newTaskDraft.priority,
      status: 'New',
      due_date: newTaskDraft.dueDate,
      blocking_reason: '',
      next_action: newTaskDraft.description.trim() || 'Review and complete task.',
      buyer: newTaskDraft.title.trim(),
      product: 'Task Engine'
    });
    const created = result.data || {
      id: `task-local-${Date.now()}`,
      title: newTaskDraft.title.trim(),
      description: newTaskDraft.description.trim(),
      workflow_source: 'Task Engine',
      linked_record_id: `TASK-${Date.now()}`,
      linked_label: newTaskDraft.title.trim(),
      department: newTaskDraft.owner === 'Founder' ? 'Founder Office' : newTaskDraft.owner.replace(' Command', ''),
      owner_command: newTaskDraft.owner,
      assigned_to: newTaskDraft.owner,
      priority: newTaskDraft.priority,
      status: 'New',
      due_date: newTaskDraft.dueDate,
      escalation_level: newTaskDraft.owner === 'Founder' ? 'Founder review' : `${newTaskDraft.owner} follow-up`,
      blocking_reason: '',
      next_action: newTaskDraft.description.trim() || 'Review and complete task.',
      buyer: newTaskDraft.title.trim(),
      product: 'Task Engine',
      created_at: 'Now',
      updated_at: 'Now'
    };
    setTasks((current) => current.some((task) => task.id === created.id) ? current : [created, ...current]);
    setSelectedId(created.id);
    setShowNewTaskForm(false);
    setNewTaskDraft({ title: '', owner: 'COO Command', priority: 'High', dueDate: 'Today', description: '' });
    setTaskNotice(`${created.title} created.`);
  }

  async function generateDailyPlan() {
    const result = await generateCOODailyPlan(demoTenantId);
    const planText = result.data || '';
    setDailyPlan(planText);
    await sendSlackNotification({
      type: 'COO Daily Plan',
      priority: 'INFO',
      reference: 'DAILY-PLAN',
      status: 'Generated',
      actionRequired: planText,
      source: 'COO Command'
    });
    setTaskNotice('Plan sent to Slack Done');
  }

  function prepareFounderSummary() {
    setFounderSummary(`Founder Task Summary\nOpen tasks: ${tasks.filter((task) => task.status !== 'Done').length}\nBlocked: ${tasks.filter((task) => task.status === 'Blocked').length}\nOverdue: ${tasks.filter((task) => task.due_date === 'Overdue').length}\nRecommended COO action: clear LUT and HSN blockers before invoice release.`);
  }

  return (
    <ExportOSShell className="operational-export-shell task-engine-shell">
      <TaskEngineHeader onBack={onBack} onNewTask={() => setShowNewTaskForm(true)} />
      <div className="invoice-model-strip">
        {taskEngineModels.map((model) => (
          <code key={model}>
            {model}
            {model === 'tasks' && <span className="task-tab-count-badge">{openTaskCount}</span>}
            {model === 'task_escalations' && <span className="task-tab-count-badge">{escalatedTaskCount}</span>}
          </code>
        ))}
      </div>
      {taskNotice && <div className="coo-action-notice">{taskNotice}</div>}
      {showNewTaskForm && (
        <NewTaskInlineForm
          draft={newTaskDraft}
          setDraft={setNewTaskDraft}
          onCreate={createNewTask}
          onCancel={() => setShowNewTaskForm(false)}
        />
      )}
      <TaskSummaryCards tasks={tasks} />
      <section className="task-engine-layout">
        <aside className="task-left-stack">
          <TaskFilters filters={filters} activeFilter={activeFilter} onFilter={handleTaskFilterChange} search={search} onSearch={handleTaskSearch} />
          <WorkflowSourceMap />
          <EscalationRulesPanel rules={taskEscalationRules} />
        </aside>
        <main className="task-center-stack">
          <div className="task-view-header">
            <div>
              <span>Task Workspace</span>
              <h2>{taskView === 'board' ? 'Kanban execution board' : 'Operational task list'}</h2>
            </div>
            <div className="view-toggle" role="group" aria-label="View mode">
              <button className={`view-toggle-btn ${taskView === 'list' ? 'active' : ''}`} onClick={() => setTaskView('list')} aria-pressed={taskView === 'list'} aria-label="List view">
                <ClipboardList size={14} />
              </button>
              <button className={`view-toggle-btn ${taskView === 'board' ? 'active' : ''}`} onClick={() => setTaskView('board')} aria-pressed={taskView === 'board'} aria-label="Board view">
                <Boxes size={14} />
              </button>
            </div>
          </div>
          {taskView === 'board'
            ? <KanbanBoard tasks={filteredTasks} onStatusChange={updateTaskFromBoard} onCreateTask={() => setShowNewTaskForm(true)} />
            : <TaskBoard tasks={filteredTasks} selectedId={selectedTask?.id} onSelect={setSelectedId} />}
          <DailyFollowupPanel tasks={tasks} output={dailyPlan} onGenerate={generateDailyPlan} />
        </main>
        <aside className="task-right-stack">
          <TaskDetailPanel task={selectedTask} note={note} setNote={setNote} updateTaskStatus={updateTaskStatus} navigate={navigate} onFounderApproval={routeTaskApproval} onEscalate={escalateSelectedTask} onAddNote={addNoteToTask} onRunAiAgain={runAIAgentAgain} auditEvents={auditEvents} />
          <COOControlSummary tasks={tasks} output={founderSummary} onPrepare={prepareFounderSummary} />
        </aside>
      </section>
      <section className="task-engine-audit-bottom">
        <TaskAuditTrail task={selectedTask} note="" auditEvents={auditEvents} />
      </section>
    </ExportOSShell>
  );
}

function TaskEngineHeader({ onBack, onNewTask }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <header className="deck-header task-engine-header">
      <div className="deck-header-copy"><span>GOPU Export OS</span><h1>Task & Follow-up Engine</h1><p>COO Execution Layer - Operational task control, owner assignment, deadline tracking, and escalation management.</p></div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><Workflow size={15} /><strong>Task Engine: Monitoring</strong></div>
        <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
        <button className="tactical-button" onClick={onNewTask}>New Task</button>
        <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
      </div>
    </header>
  );
}


function NewTaskInlineForm({ draft, setDraft, onCreate, onCancel }) {
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <section className="task-panel new-task-inline-form">
      <div className="approval-section-header">
        <div><span>New Task</span><h2>Create operational follow-up</h2></div>
        <ClipboardCheck size={18} />
      </div>
      <div className="new-task-form-grid">
        <label>Title<input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Task title" /></label>
        <label>Owner<select value={draft.owner} onChange={(event) => update('owner', event.target.value)}>{['COO Command', 'CFO Command', 'CTO Command', 'CMO Command', 'CIO Command', 'Founder'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Priority<select value={draft.priority} onChange={(event) => update('priority', event.target.value)}>{['Critical', 'High', 'Medium', 'Low'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Due Date<select value={draft.dueDate} onChange={(event) => update('dueDate', event.target.value)}>{['Today', 'Tomorrow', 'This Week'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="new-task-description">Description<textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the task, blocker, or follow-up context" /></label>
      </div>
      <div className="task-action-grid">
        <button className="tactical-button" onClick={onCreate}>Create Task</button>
        <button className="ghost-button" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function TaskSummaryCards({ tasks }) {
  const data = [
    ['Open Tasks', tasks.filter((task) => task.status !== 'Done').length, 'Open'],
    ['Due Today', tasks.filter((task) => task.due_date === 'Today').length, 'Due Today'],
    ['Overdue', tasks.filter((task) => task.due_date === 'Overdue').length, 'Overdue'],
    ['Blocked', tasks.filter((task) => task.status === 'Blocked').length, 'Blocked'],
    ['Waiting Founder Approval', tasks.filter((task) => task.escalation_level.includes('Founder')).length, 'Waiting Approval'],
    ['Escalated', tasks.filter((task) => task.status === 'Escalated').length, 'Escalated']
  ];
  return <section className="task-summary-grid">{data.map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{status}</small></article>)}</section>;
}

const TaskFilters = React.memo(function TaskFilters({ filters, activeFilter, onFilter, search, onSearch }) {
  return <section className="task-panel"><div className="approval-section-header"><div><span>Task Filters</span><h2>Source and owner control</h2></div><Search size={18} /></div><input aria-label="Search tasks" className="task-search" value={search} onChange={onSearch} placeholder="Search task title, owner, buyer, product, workflow ID" /><div className="approval-filter-row">{filters.map((filter) => <button className={activeFilter === filter ? 'active' : ''} key={filter} onClick={() => onFilter(filter)}>{filter}</button>)}</div></section>;
});

function TaskBoard({ tasks, selectedId, onSelect }) {
  const columns = ['New', 'In Progress', 'Waiting Review', 'Blocked', 'Escalated', 'Done'];
  const columnTasks = (column) => tasks.filter((task) => column === 'Escalated' ? ['Escalated', 'Waiting Founder Approval', 'Revision Required'].includes(task.status) : task.status === column);
  if (tasks.length === 0) {
    return <section className="task-board"><EmptyState icon={ClipboardCheck} title="No tasks" description="No tasks match the current filters." /></section>;
  }
  return <section className="task-board">{columns.map((column) => <div className="task-column" key={column}><header><strong>{column}</strong><span>{columnTasks(column).length}</span></header>{columnTasks(column).map((task) => <TaskCard key={task.id} task={task} selected={selectedId === task.id} onSelect={() => onSelect(task.id)} />)}</div>)}</section>;
}

function TaskCard({ task, selected, onSelect }) {
  return <button className={`task-card-item ${selected ? 'selected' : ''} priority-${task.priority.toLowerCase()}`} onClick={onSelect}><strong>{task.title}</strong><p>{task.workflow_source} - {task.linked_label}</p><div><StatusBadge label={task.status} state={task.status === 'Blocked' || task.status === 'Escalated' ? 'attention' : 'progress'} /><PriorityBadge priority={task.priority} /></div><dl><div><dt>Owner</dt><dd>{task.owner_command}</dd></div><div><dt>Due</dt><dd>{task.due_date}</dd></div><div><dt>Dept</dt><dd>{task.department}</dd></div><div><dt>Link</dt><dd>{task.linked_record_id}</dd></div></dl></button>;
}

function TaskDetailPanel({ task, note, setNote, updateTaskStatus, onFounderApproval, onEscalate, onAddNote, onRunAiAgain, navigate, auditEvents }) {
  if (!task) return null;
  const isAiAgentTask = String(task.owner_command || '').startsWith('AI ');
  return <section className="task-panel task-detail-panel"><div className="approval-section-header"><div><span>Task Detail</span><h2>{task.title}</h2></div><PriorityBadge priority={task.priority} /></div><p>{task.description}</p><div className="task-detail-grid">{[['Owner', task.owner_command], ['Assigned Role', task.assigned_role || task.assigned_to], ['Department', task.department], ['Source Module', task.workflow_source], ['Linked Record', task.linked_record_id], ['Due Date', task.due_date], ['Status', task.status], ['Blocking Reason', task.blocking_reason || 'None'], ['Next Action', task.next_action], ['Escalation Rule', task.escalation_level]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add note, revision request, or follow-up context." /><div className="task-action-grid">{isAiAgentTask && <button onClick={() => onRunAiAgain(task)}>Run AI Again</button>}<button onClick={() => updateTaskStatus('In Progress', note)}>Mark In Progress</button><button onClick={() => updateTaskStatus('Waiting Review', note)}>Request Review</button><button onClick={() => updateTaskStatus('Blocked', note)}>Mark Blocked</button><button onClick={() => onEscalate(task, note)}>Escalate</button><button onClick={() => onAddNote(note)}>Add Note</button><button onClick={() => updateTaskStatus('Done', note)}>Done</button><button onClick={() => navigate(task.linked_route || '/export-os/tasks')}>Open Linked Module</button><button onClick={() => onFounderApproval(task, note)}>Send to Founder Approval</button></div><TaskAuditTrail task={task} note={note} auditEvents={auditEvents} /></section>;
}

function DailyFollowupPanel({ tasks, output, onGenerate }) {
  return <section className="task-panel"><div className="approval-section-header"><div><span>Daily Follow-up Review</span><h2>COO daily operating rhythm</h2></div><TimerReset size={18} /></div><div className="task-followup-grid">{[['Due Today', tasks.filter((task) => task.due_date === 'Today').length], ['Overdue', tasks.filter((task) => task.due_date === 'Overdue').length], ['Blocked', tasks.filter((task) => task.status === 'Blocked').length], ['Founder Pending', tasks.filter((task) => task.escalation_level.includes('Founder')).length], ['Executive Owners', new Set(tasks.map((task) => task.owner_command)).size]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><button className="tactical-button" onClick={onGenerate}>Generate Daily Follow-up Plan</button>{output && <pre className="task-local-output">{output}</pre>}</section>;
}

function EscalationRulesPanel({ rules }) {
  return <section className="task-panel"><div className="approval-section-header"><div><span>Escalation Rules</span><h2>Editable local rules</h2></div><TriangleAlert size={18} /></div><div className="task-rule-list">{rules.map((rule) => <article key={rule.id}><strong>{rule.rule_name}</strong><span>{rule.trigger_condition}</span><small>{rule.escalation_target} - {rule.active_status}</small><button>Edit</button></article>)}</div></section>;
}

function WorkflowSourceMap() {
  const steps = ['Lead Intake', 'Task Created', 'Owner Assigned', 'Deadline Set', 'Daily Follow-up', 'Escalation if Blocked', 'Founder Review if Required', 'Closed / Updated'];
  return <section className="task-panel"><div className="approval-section-header"><div><span>Workflow Source Map</span><h2>Execution path</h2></div><Workflow size={18} /></div><div className="workflow-source-map">{steps.map((step, index) => <div key={step}><span>{step}</span>{index < steps.length - 1 && <ChevronRight size={14} />}</div>)}</div></section>;
}

function TaskAuditTrail({ task, note, auditEvents = [] }) {
  const taskEvents = auditEvents.filter((event) => event.task_id === task?.id).slice(0, 8);
  const fallbackEvents = [
    { created_at: task?.created_at, notes: 'task created - workflow blocker detected', actor: task?.workflow_source, previous_status: '-', new_status: 'New' },
    { created_at: task?.updated_at, notes: 'owner assigned - task routed to responsible command', actor: 'Task Engine', previous_status: 'New', new_status: task?.status },
    { created_at: 'Local', notes: 'linked module opened - audit-ready navigation available', actor: 'COO Command', previous_status: task?.status, new_status: task?.status }
  ];
  const events = taskEvents.length ? taskEvents : fallbackEvents;
  return <div className="task-audit-mini"><strong>Audit Timeline</strong>{events.map((event, index) => <div key={`${event.notes}-${index}`}><time>{event.created_at || 'Now'}</time><span>{event.notes || 'task event'}</span><small>{event.actor || 'Task Engine'} - {event.previous_status || '-'} to {event.new_status || task?.status}</small></div>)}{note && <p>Pending note: {note}</p>}</div>;
}

function COOControlSummary({ tasks, output, onPrepare }) {
  const bottleneck = tasks.filter((task) => task.status === 'Blocked').length ? 'Finance / invoice release' : 'None detected';
  return <section className="task-panel"><div className="approval-section-header"><div><span>COO Execution Control</span><h2>Founder-ready summary</h2></div><ClipboardCheck size={18} /></div><div className="task-detail-grid">{[['Total Open Tasks', tasks.filter((task) => task.status !== 'Done').length], ['Blocked Operations', tasks.filter((task) => task.status === 'Blocked').length], ['Overdue Follow-ups', tasks.filter((task) => task.due_date === 'Overdue').length], ['Founder Review', tasks.filter((task) => task.escalation_level.includes('Founder') || task.status === 'Waiting Founder Approval').length], ['Supplier Follow-ups', tasks.filter((task) => `${task.title} ${task.workflow_source}`.toLowerCase().includes('supplier')).length], ['Invoice/Document Blockers', tasks.filter((task) => ['Invoice System', 'Document Factory', 'Documents'].includes(task.workflow_source) && ['Blocked', 'Escalated', 'Waiting Review'].includes(task.status)).length], ['Department Bottleneck', bottleneck], ['Recommended COO Action', 'Clear blocked invoice/LUT work first']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><button className="tactical-button" onClick={onPrepare}>Prepare Founder Task Summary</button>{output && <pre className="task-local-output">{output}</pre>}</section>;
}
