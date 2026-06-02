import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Mail,
  PackageCheck,
  Route,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UsersRound,
  Workflow
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { StatusBadge } from '../shared/uiPrimitives.jsx';
import { demoLeadId } from '../config/demoLeadProfile.js';
import { getAgentHeartbeatSummary } from '../services/agentHeartbeatService.js';

const demoLeadRoute = `/export-os/coo/leads/${demoLeadId}`;

const moduleLinks = [
  { label: 'Dashboard', detail: 'Clean launch control', route: '/export-os', icon: LayoutDashboard, owner: 'Founder' },
  { label: 'Leads', detail: 'Buyer enquiries and intake', route: '/export-os/leads', icon: UsersRound, owner: 'COO' },
  { label: 'Buyer CRM', detail: 'Buyer records and follow-up', route: '/export-os/buyer-crm', icon: Search, owner: 'CMO/CIO' },
  { label: 'Pricing', detail: 'CFO quotes and rates', route: '/export-os/executives/cfo', icon: CircleDollarSign, owner: 'CFO' },
  { label: 'Approvals', detail: 'Founder/Director queue', route: '/export-os/director', icon: ShieldCheck, owner: 'Director' },
  { label: 'Invoices', detail: 'Invoice builder and library', route: '/export-os/invoices', icon: FileText, owner: 'CFO' },
  { label: 'COO Flow', detail: 'Lead to shipment execution', route: demoLeadRoute, icon: Workflow, owner: 'COO' },
  { label: 'Documents', detail: 'Certificates and export docs', route: '/export-os/document-factory', icon: FileCheck2, owner: 'COO' },
  { label: 'Shipments', detail: 'Bookings and delivery tracking', route: '/export-os/shipments', icon: Route, owner: 'COO' },
  { label: 'Payments', detail: 'Payment vault and receivables', route: '/export-os/payment-vault', icon: ClipboardCheck, owner: 'CFO' },
  { label: 'CMO', detail: 'LinkedIn and campaigns', route: '/export-os/executives/cmo', icon: Send, owner: 'CMO' },
  { label: 'Settings', detail: 'Company data and integrations', route: '/export-os/company-master-data', icon: Settings, owner: 'Admin' }
];

const flowSteps = [
  { step: '01', title: 'Lead received', owner: 'COO', route: '/export-os/leads', status: 'Ready', detail: 'Website, Slack, WhatsApp, or manual buyer intake.' },
  { step: '02', title: 'CFO price generated', owner: 'CFO', route: '/export-os/executives/cfo', status: 'Ready', detail: 'Market rate, margin, currency, and quote control.' },
  { step: '03', title: 'Founder approval', owner: 'Director', route: '/export-os/director', status: 'Complete', detail: 'Demo approval is recorded before buyer-facing release.' },
  { step: '04', title: 'Invoice generated', owner: 'CFO + COO', route: demoLeadRoute, status: 'Complete', detail: 'Proforma and commercial invoice viewer with download.' },
  { step: '05', title: 'Buyer email/payment', owner: 'CFO', route: '/export-os/payment-vault', status: 'Complete', detail: 'Advance payment marked confirmed for demo testing.' },
  { step: '06', title: 'Documents/certificates', owner: 'COO', route: demoLeadRoute, status: 'Complete', detail: 'Product documents, certificates, and compliance checks are marked ready.' },
  { step: '07', title: 'Shipment booking', owner: 'COO', route: '/export-os/shipments', status: 'Complete', detail: 'Container booking and dispatch are ready to test.' }
];

const qaActions = [
  ['Create lead', '/export-os/leads/new', 'Lead intake opens'],
  ['Open demo flow', demoLeadRoute, 'COO execution page opens'],
  ['View invoice', demoLeadRoute, 'Use Documents > Proforma Invoice > View'],
  ['Open pricing', '/export-os/executives/cfo', 'CFO pricing dashboard opens'],
  ['Open approvals', '/export-os/director', 'Director approval queue opens'],
  ['Open invoice library', '/export-os/invoices', 'Invoice library opens'],
  ['Open shipments', '/export-os/shipments', 'Shipment tracker opens'],
  ['Open CMO', '/export-os/executives/cmo', 'CMO workspace opens']
];

function routeState(status) {
  if (status === 'Complete') return 'success';
  if (status === 'Ready') return 'success';
  if (status === 'Blocked') return 'attention';
  if (status === 'Required') return 'attention';
  return 'progress';
}

function handleCrmLink(event, navigate, route) {
  if (!navigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate(route);
}

function LaunchButton({ children, route, navigate, variant = 'ghost-button' }) {
  return (
    <a className={variant} href={route} onClick={(event) => handleCrmLink(event, navigate, route)}>
      {children}
      <ChevronRight size={14} />
    </a>
  );
}

function ModuleCard({ item, navigate }) {
  const Icon = item.icon;
  return (
    <a className="temp-crm-module-card" href={item.route} onClick={(event) => handleCrmLink(event, navigate, item.route)}>
      <span className="temp-crm-module-icon"><Icon size={18} /></span>
      <span>
        <strong>{item.label}</strong>
        <small>{item.detail}</small>
      </span>
      <em>{item.owner}</em>
    </a>
  );
}

function FlowStep({ item, navigate }) {
  return (
    <article className="temp-crm-flow-step">
      <div className="temp-crm-flow-index">{item.step}</div>
      <div>
        <div className="temp-crm-flow-head">
          <strong>{item.title}</strong>
          <StatusBadge label={item.status} state={routeState(item.status)} size="sm" />
        </div>
        <p>{item.detail}</p>
        <span>{item.owner}</span>
      </div>
      <a href={item.route} aria-label={`Open ${item.title}`} onClick={(event) => handleCrmLink(event, navigate, item.route)}>
        <ArrowUpRight size={16} />
      </a>
    </article>
  );
}

function QaMatrix({ navigate }) {
  const [checked, setChecked] = useState(false);
  const rows = useMemo(() => qaActions.map(([label, route, expected]) => ({
    label,
    route,
    expected,
    status: checked ? 'Linked' : 'Not checked'
  })), [checked]);

  return (
    <section className="temp-crm-panel temp-crm-qa">
      <div className="temp-crm-panel-head">
        <div>
          <span>Button QA</span>
          <h2>Launch route checklist</h2>
        </div>
        <button className="tactical-button" type="button" onClick={() => setChecked(true)}>
          <CheckCircle2 size={15} />
          Check Links
        </button>
      </div>
      <div className="temp-crm-qa-table">
        <div className="temp-crm-qa-row temp-crm-qa-head">
          <span>Action</span><span>Expected</span><span>Status</span><span>Open</span>
        </div>
        {rows.map((row) => (
          <div className="temp-crm-qa-row" key={row.label}>
            <span>{row.label}</span>
            <span>{row.expected}</span>
            <span><StatusBadge label={row.status} state={checked ? 'success' : 'progress'} size="sm" /></span>
            <span><a href={row.route} onClick={(event) => handleCrmLink(event, navigate, row.route)}>Open</a></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CurrentWorkTable({ navigate }) {
  const rows = [
    ['Sukesh Reddy', 'Turmeric Powder', 'Australia', 'COO Flow', 'Completed demo flow', demoLeadRoute],
    ['Draft buyer', 'Red Chilli Powder', 'Destination pending', 'CFO', 'Complete pricing fields', '/export-os/executives/cfo'],
    ['Content approval', 'LinkedIn export insight', 'LinkedIn', 'CMO', 'Founder approval before publish', '/export-os/executives/cmo']
  ];

  return (
    <section className="temp-crm-panel">
      <div className="temp-crm-panel-head">
        <div>
          <span>Work Queue</span>
          <h2>Records to check first</h2>
        </div>
        <LaunchButton route="/export-os/tasks" navigate={navigate}>All Tasks</LaunchButton>
      </div>
      <div className="temp-crm-record-table">
        <div className="temp-crm-record-row temp-crm-record-head">
          <span>Buyer</span><span>Product</span><span>Market</span><span>Owner</span><span>Next action</span><span></span>
        </div>
        {rows.map(([buyer, product, market, owner, action, route]) => (
          <div className="temp-crm-record-row" key={`${buyer}-${product}`}>
            <span><strong>{buyer}</strong></span>
            <span>{product}</span>
            <span>{market}</span>
            <span>{owner}</span>
            <span>{action}</span>
            <span><a href={route} onClick={(event) => handleCrmLink(event, navigate, route)}>Open</a></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentHeartbeatPanel({ navigate }) {
  const heartbeat = useMemo(() => getAgentHeartbeatSummary(), []);
  return (
    <section className="temp-crm-panel">
      <div className="temp-crm-panel-head">
        <div>
          <span>24/7 Agent Heartbeat</span>
          <h2>What runs automatically</h2>
        </div>
        <StatusBadge label={`${heartbeat.totalJobs} jobs`} state="success" size="sm" />
      </div>
      <div className="temp-crm-record-table temp-crm-agent-table">
        <div className="temp-crm-record-row temp-crm-record-head">
          <span>Agent</span><span>Job</span><span>Cadence</span><span>Status</span><span>Route</span>
        </div>
        {heartbeat.jobs.map((job) => (
          <div className="temp-crm-record-row" key={job.id}>
            <span><strong>{job.agent}</strong></span>
            <span>{job.label}<small>{job.purpose}</small></span>
            <span>{job.cadence}</span>
            <span><StatusBadge label={job.status} state={job.status === 'Approval gated' ? 'attention' : 'success'} size="sm" /></span>
            <span><a href={job.route} onClick={(event) => handleCrmLink(event, navigate, job.route)}>Open</a></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentLinksPanel({ navigate }) {
  const heartbeat = useMemo(() => getAgentHeartbeatSummary(), []);
  return (
    <section className="temp-crm-panel">
      <div className="temp-crm-panel-head">
        <div>
          <span>Agent Links</span>
          <h2>How work moves between agents</h2>
        </div>
        <Workflow size={18} />
      </div>
      <div className="temp-crm-link-chain">
        {heartbeat.links.map(([from, to, route]) => (
          <a key={`${from}-${to}`} href={route} onClick={(event) => handleCrmLink(event, navigate, route)}>
            <strong>{from}</strong>
            <ChevronRight size={14} />
            <span>{to}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function TomorrowRemindersPanel({ navigate }) {
  const heartbeat = useMemo(() => getAgentHeartbeatSummary(), []);
  return (
    <section className="temp-crm-panel temp-crm-launch-notes">
      <div className="temp-crm-panel-head">
        <div>
          <span>Tomorrow</span>
          <h2>Reminders for 2026-06-02</h2>
        </div>
        <CalendarClock size={18} />
      </div>
      <div className="temp-crm-note-list">
        {heartbeat.reminders.map((item) => (
          <p key={item.id}>
            <ClipboardCheck size={15} />
            <a href={item.route} onClick={(event) => handleCrmLink(event, navigate, item.route)}>{item.title}</a>
            <span>{item.owner}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

export default function TemporaryCRMHome({ navigate, onLogout }) {
  return (
    <ExportOSShell className="temp-crm-shell" statusMessage="Temporary clean CRM launch workspace">
      <div className="temp-crm-workspace">
        <aside className="temp-crm-sidebar" aria-label="Temporary CRM navigation">
          <div className="temp-crm-brand">
            <strong>GOPU OS</strong>
            <span>Temporary CRM View</span>
          </div>
          <nav>
            {moduleLinks.slice(0, 9).map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.label} href={item.route} onClick={(event) => handleCrmLink(event, navigate, item.route)}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
          <button className="temp-crm-logout" type="button" onClick={onLogout}>Logout</button>
        </aside>

        <main className="temp-crm-main">
          <section className="temp-crm-hero">
            <div>
              <span>Launch Testing Workspace</span>
              <h1>Clean CRM view for GOPU Export OS</h1>
              <p>Use this temporary screen to test the full lead, approval, invoice, document, payment, and shipment flow in a clear order.</p>
            </div>
            <div className="temp-crm-hero-actions">
              <LaunchButton route="/export-os/leads/new" navigate={navigate} variant="tactical-button">New Lead</LaunchButton>
              <LaunchButton route={demoLeadRoute} navigate={navigate}>Demo Lead Flow</LaunchButton>
              <LaunchButton route="/export-os/director" navigate={navigate}>Approvals</LaunchButton>
            </div>
          </section>

          <section className="temp-crm-kpis" aria-label="Launch KPIs">
            {[
              ['Demo buyer', 'Sukesh Reddy', 'Australia'],
              ['Product', 'Turmeric Powder', '20 MT / 20 ft FCL'],
              ['Approval gate', 'Complete', 'Demo approval recorded'],
              ['Invoice view', 'Complete', 'Download + print'],
              ['System mode', 'Testing', 'All demo blockers cleared']
            ].map(([label, value, note]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </section>

          <section className="temp-crm-grid">
            <section className="temp-crm-panel temp-crm-flow-panel">
              <div className="temp-crm-panel-head">
                <div>
                  <span>Ordered Flow</span>
                  <h2>Lead to shipment pipeline</h2>
                </div>
                <Workflow size={18} />
              </div>
              <div className="temp-crm-flow-list">
                {flowSteps.map((item) => <FlowStep key={item.step} item={item} navigate={navigate} />)}
              </div>
            </section>

            <section className="temp-crm-panel">
              <div className="temp-crm-panel-head">
                <div>
                  <span>Modules</span>
                  <h2>Simple CRM navigation</h2>
                </div>
                <BarChart3 size={18} />
              </div>
              <div className="temp-crm-module-grid">
                {moduleLinks.map((item) => <ModuleCard key={item.label} item={item} navigate={navigate} />)}
              </div>
            </section>
          </section>

          <CurrentWorkTable navigate={navigate} />

          <section className="temp-crm-grid temp-crm-grid-bottom">
            <AgentHeartbeatPanel navigate={navigate} />
            <AgentLinksPanel navigate={navigate} />
          </section>

          <section className="temp-crm-grid temp-crm-grid-bottom">
            <QaMatrix navigate={navigate} />
            <section className="temp-crm-panel temp-crm-launch-notes">
              <div className="temp-crm-panel-head">
                <div>
                  <span>Launch Notes</span>
                  <h2>What to test next</h2>
                </div>
                <PackageCheck size={18} />
              </div>
              <div className="temp-crm-note-list">
                <p><Mail size={15} /> Lead approval should reach Slack before buyer email release.</p>
                <p><FileText size={15} /> Invoice View should show the generated invoice and download button.</p>
                <p><ShieldCheck size={15} /> Director approval must stay before publishing, sending, or booking.</p>
                <p><Route size={15} /> Shipment booking should remain blocked until payment and documents are ready.</p>
              </div>
            </section>
          </section>

          <TomorrowRemindersPanel navigate={navigate} />
        </main>
      </div>
    </ExportOSShell>
  );
}
