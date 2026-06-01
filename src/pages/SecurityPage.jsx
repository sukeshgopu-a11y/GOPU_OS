import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Database,
  Eye,
  FileBarChart,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  TriangleAlert,
  UsersRound,
  X
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { SeverityBadge, StatusBadge } from '../shared/uiPrimitives.jsx';
import { demoTenantId } from '../services/companyService.js';
import { createAuditLog, listAuditLogs } from '../services/auditService.js';
import { createSecurityAuditEvent, loadSecurityDashboard } from '../services/securityService.js';
import { formatDisplayDate } from '../utils/dateFormat.js';

function getSecurityState(status) {
  if (status === 'Critical' || status === 'Access Revoked' || status === 'Suspended') return 'error';
  if (status === 'Attention' || status === 'Review Required' || status === 'Pending Invite') return 'attention';
  if (status === 'Monitoring') return 'progress';
  return 'online';
}

function PaymentGovernancePanel({ compact = false }) {
  return (
    <section className={`cto-panel payment-governance-panel ${compact ? 'compact' : ''}`}>
      <div className="approval-section-header"><div><span>Payment Governance</span><h2>CFO execution / Founder OTP authority</h2></div><LockKeyhole size={18} /></div>
      <div className="payment-limit-grid">
        <div><span>Safe auto-pay</span><strong>₹0-₹1,000</strong><small>Trusted infrastructure only</small></div>
        <div><span>Controlled cap</span><strong>₹1,001-₹1,500</strong><small>CFO + COO confirmation</small></div>
        <div><span>Founder required</span><strong>Above ₹1,500</strong><small>No auto-pay above cap</small></div>
        <div><span>OTP owner</span><strong>Founder</strong><small>CFO enters once after founder shares</small></div>
      </div>
      <div className="payment-policy-callout">
        <strong>CTO does not control payments.</strong>
        <p>CTO creates payment requirements and captures receipts. CFO validates and executes payments. Founder owns OTP authority and high-risk approvals. OTP values are never stored, logged, remembered, or reused.</p>
      </div>
    </section>
  );
}
const securityUsersDefault = [
  ['Sukesh Reddy', 'founder.local@gopu.local', 'Founder', 'GOPU Exports', 'Active', 'Just now', 'Required'],
  ['Operations Lead', 'ops.local@gopu.local', 'COO', 'GOPU Exports', 'Active', '22 min ago', 'Required'],
  ['Finance Reviewer', 'finance.local@gopu.local', 'CFO', 'GOPU Exports', 'Pending Invite', 'Not active', 'Pending'],
  ['Platform Admin', 'cto.local@gopu.local', 'CTO', 'GOPU Exports', 'Active', 'Today 09:10', 'Required'],
  ['Marketing Lead', 'marketing.local@gopu.local', 'CMO', 'GOPU Exports', 'Suspended', 'Yesterday', 'Required']
].map(([full_name, email, role, tenant, status, last_active, mfa_status], index) => ({
  id: `security-user-${index}`,
  full_name,
  email,
  role,
  tenant,
  status,
  last_active,
  mfa_status
}));

const securityRolesDefault = [
  ['Founder', 'Full access, final approval authority, integration management, invoice release, pricing override, workflow escalation.'],
  ['Admin', 'Administrative controls under founder governance, no bypass of founder approval gates.'],
  ['COO', 'Operations, tasks, workflows, logistics, follow-up. No final invoice release.'],
  ['CFO', 'Pricing, margins, quote validation, financial review. No legal release authority.'],
  ['CTO', 'Integrations, monitoring, deployments, API systems, automation controls. No financial approvals.'],
  ['CMO', 'Content, campaigns, outreach, marketing approval routing. No invoice or pricing release.'],
  ['Operations Staff', 'Task execution and operations data needed for assigned work.'],
  ['Finance Staff', 'Finance workflow support without final commercial approval authority.'],
  ['Documentation Staff', 'Document preparation and validation support without final release authority.'],
  ['Marketing Staff', 'Campaign and content drafting without risky claim approval authority.'],
  ['Viewer', 'Read-only dashboard visibility.']
].map(([role_name, description], index) => ({ id: `security-role-${index}`, role_name, description }));

const permissionModules = ['Pricing Engine', 'Invoice System', 'Director Queue', 'Document Factory', 'Task Engine', 'Integrations Vault', 'CTO Monitoring', 'Content Engine', 'Company Master Data', 'Workflow Automation', 'Morning Briefings'];
const permissionColumns = ['Founder', 'COO', 'CFO', 'CTO', 'CMO', 'Staff', 'Viewer'];
const permissionLegend = {
  Founder: 'View Create Edit Approve Delete Configure',
  COO: 'View Create Edit',
  CFO: 'View Create Edit',
  CTO: 'View Create Edit Configure',
  CMO: 'View Create Edit',
  Staff: 'View Create',
  Viewer: 'View'
};

const moduleRoleOverrides = {
  'Pricing Engine': { CFO: 'View Create Edit', Founder: permissionLegend.Founder, Staff: 'View', Viewer: 'View' },
  'Invoice System': { COO: 'View Create Edit', CFO: 'View Edit', Founder: permissionLegend.Founder, Staff: 'View Create', Viewer: 'View' },
  'Director Queue': { Founder: 'View Create Edit Approve Configure', COO: 'View Create', CFO: 'View Create', CTO: 'View Create', CMO: 'View Create', Staff: 'View', Viewer: 'View' },
  'Integrations Vault': { Founder: permissionLegend.Founder, CTO: 'View Create Edit Configure', COO: 'No Access', CFO: 'No Access', CMO: 'No Access', Staff: 'No Access', Viewer: 'No Access' },
  'Workflow Automation': { Founder: permissionLegend.Founder, CTO: 'View Create Edit Configure', COO: 'View Create Edit', Staff: 'View', Viewer: 'View' },
  'Content Engine': { CMO: 'View Create Edit', Founder: permissionLegend.Founder, Staff: 'View Create', Viewer: 'View' }
};

const securitySessionsDefault = [
  ['Founder workstation', 'Codex in-app browser', 'Local session', 'Active', 'Just now'],
  ['Finance laptop', 'Chrome', 'Location pending', 'Monitoring', 'Today 09:40'],
  ['Old admin session', 'Unknown browser', 'Location pending', 'Attention', 'Yesterday']
].map(([device, browser, ip_address, status, last_active], index) => ({ id: `session-${index}`, device, browser, ip_address, status, last_active }));

const securityAuditDefault = [
  ['Founder', 'Founder session verified', 'Security', 'Low', 'Session marker only.', 'Just now'],
  ['System', 'Permission matrix reviewed', 'Roles', 'Medium', 'No permission changes executed externally.', 'Today 10:12'],
  ['CTO Command', 'Integration metadata reviewed', 'Integrations Vault', 'High', 'Raw secrets remain hidden.', 'Today 10:30'],
  ['Founder Local', 'Workflow freeze prepared', 'Automation Center', 'Medium', 'Local control only; no external workflow disabled.', 'Today 11:00']
].map(([actor, action, module, severity, notes, created_at], index) => ({ id: `security-audit-${index}`, actor, action, module, severity, notes, created_at }));

const securityIncidentsDefault = [
  ['Failed login spike', 'Medium', 'Login', 'Unknown', 'Multiple failed login attempts need review.', 'Monitoring'],
  ['Permission escalation', 'High', 'Roles', 'Admin', 'Role change requires founder review before activation.', 'Review Required'],
  ['Integration change attempt', 'Medium', 'Integrations Vault', 'CTO Command', 'Masked key metadata update prepared.', 'Attention'],
  ['Approval bypass attempt', 'Critical', 'Director Queue', 'System Guard', 'Invoice release remains blocked until founder approval.', 'Review Required']
].map(([incident_type, severity, affected_module, actor, description, status], index) => ({ id: `security-incident-${index}`, incident_type, severity, affected_module, actor, description, status }));

function SecurityDashboard({ navigate, onBack, view = 'security' }) {
  const [users, setUsers] = useState(securityUsersDefault);
  const [roles, setRoles] = useState(securityRolesDefault);
  const [sessions, setSessions] = useState(securitySessionsDefault);
  const [incidents, setIncidents] = useState(securityIncidentsDefault);
  const [audit, setAudit] = useState(securityAuditDefault);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedRole, setSelectedRole] = useState(view === 'roles' ? 'Founder' : 'Founder');
  const [auditFilter, setAuditFilter] = useState('All');
  const [expandedIncident, setExpandedIncident] = useState(securityIncidentsDefault[0].id);
  const [notice, setNotice] = useState('Security governance console ready in Connect Supabase to activate.');
  const [freezeState, setFreezeState] = useState('Monitoring');

  useEffect(() => {
    let disposed = false;
    async function load() {
      const result = await loadSecurityDashboard(demoTenantId);
      if (disposed) return;
      if (result.backend.mode === 'Connected') {
        if (result.data.users?.length) setUsers(result.data.users.map((user, index) => ({
          ...securityUsersDefault[index % securityUsersDefault.length],
          ...user,
          tenant: 'GOPU Exports',
          mfa_status: securityUsersDefault[index % securityUsersDefault.length].mfa_status,
          last_active: securityUsersDefault[index % securityUsersDefault.length].last_active
        })));
        if (result.data.roles?.length) setRoles(result.data.roles);
        if (result.data.sessions?.length) setSessions(result.data.sessions);
        if (result.data.incidents?.length) setIncidents(result.data.incidents);
        if (result.data.audit?.length) setAudit(result.data.audit);
      }
      const auditLogResult = await listAuditLogs(50);
      if (!disposed && auditLogResult.data?.length) setAuditLogs(auditLogResult.data);
      setNotice(result.backend.mode === 'Connected' ? 'Backend Connected - RBAC tables available.' : 'Connect Supabase to activate - backend not connected; controls update local state only.');
    }
    load();
    return () => {
      disposed = true;
    };
  }, []);

  function pushAudit(action, module = 'Security', severity = 'Medium', notes = 'Local security action only.') {
    setAudit((current) => [createSecurityAuditEvent(action, module, severity, notes), ...current]);
  }

  function changeUserRole(userId) {
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, role: user.role === 'Viewer' ? 'Operations Staff' : 'Viewer' } : user));
    pushAudit('User role changed in local state', 'Users', 'High', 'Role changes require founder approval before production enforcement.');
    setNotice('User role changed locally. Production role changes must be persisted through Supabase auth/RLS governance.');
  }

  function suspendUser(userId) {
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, status: user.status === 'Suspended' ? 'Active' : 'Suspended' } : user));
    pushAudit('User suspension toggled', 'Users', 'High', 'Local user status changed locally.');
  }

  function revokeSession(sessionId) {
    setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, status: 'Access Revoked' } : session));
    pushAudit('Session revoked in local state', 'Sessions', 'Medium', 'Production session revocation must invalidate active auth sessions server-side.');
  }

  function togglePermission(moduleName, roleName) {
    pushAudit(`Permission toggle prepared: ${roleName} / ${moduleName}`, 'Roles', 'Medium', 'Permission matrix changed visually only in Connect Supabase to activate.');
    setNotice(`${roleName} permission toggle prepared for ${moduleName}. Founder approval required before enforcement.`);
  }

  function freezeWorkflow(action) {
    setFreezeState(action);
    pushAudit(action, 'Founder Security Controls', action === 'Emergency Read-Only Mode' ? 'Critical' : 'High', 'Founder control prepared in local state; no external system changed.');
    setNotice(`${action} prepared in local state. Connected backend enforcement is required before this affects live workflows.`);
  }

  const filteredAudit = auditFilter === 'All' ? audit : audit.filter((item) => item.severity === auditFilter || item.module === auditFilter);

  return (
    <ExportOSShell className="security-shell">
      <header className="deck-header security-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'users' ? 'User Access Management' : view === 'roles' ? 'Role Permissions Matrix' : view === 'access-audit' ? 'Access Audit' : 'RBAC + Founder Security Layer'}</h1>
          <p>Security and governance layer for roles, permissions, sessions, approvals, integrations, automation controls, and audit visibility.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={notice.includes('Backend Connected') ? 'Backend Connected' : 'Connect Supabase to activate'} state={notice.includes('Backend Connected') ? 'online' : 'progress'} />
          <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/users')}><UsersRound size={15} />Users</button>
          <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/roles')}><SlidersHorizontal size={15} />Roles</button>
          <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/access-audit')}><FileBarChart size={15} />Audit</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="security-hero">
        <div>
          <span className="coo-kicker">Founder Security Governance</span>
          <h2>Protect pricing, invoices, approvals, company data, integrations, and automation authority.</h2>
          <p>No role can self-approve final business actions. Founder remains final authority for commercial release, invoice release, pricing override, integration management, and emergency workflow controls.</p>
        </div>
        <div className="security-hero-metrics">
          {[
            ['Users', users.length],
            ['Roles', securityRolesDefault.length],
            ['Incidents', incidents.length],
            ['Freeze State', freezeState]
          ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="briefing-model-strip">
        {['roles', 'permissions', 'user_sessions', 'security_incidents', 'security_audit_log'].map((model) => <code key={model}>{model}</code>)}
      </section>

      <main className="security-layout">
        <section className="security-left-stack">
          <RoleListPanel roles={roles} selectedRole={selectedRole} onSelect={setSelectedRole} />
          <UserManagementPanel users={users} onChangeRole={changeUserRole} onSuspend={suspendUser} />
          <SessionMonitoringPanel sessions={sessions} onRevoke={revokeSession} />
        </section>
        <section className="security-center-stack">
          <RolePermissionMatrix onToggle={togglePermission} />
          <FounderSecurityControls freezeState={freezeState} onControl={freezeWorkflow} />
          <ApprovalAuthorityRules />
          <MFASettingsPanel />
        </section>
        <aside className="security-right-stack">
          <IntegrationAccessPanel />
          <TenantIsolationPanel />
          <SecurityIncidentCenter incidents={incidents} expandedIncident={expandedIncident} onExpand={setExpandedIncident} />
          <AuditLogsCard logs={auditLogs} />
          <SecurityAuditTimeline audit={filteredAudit} filter={auditFilter} onFilter={setAuditFilter} />
          <SecurityMemoryPanel />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function RoleListPanel({ roles, selectedRole, onSelect }) {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Role List</span><h2>Executive authority map</h2></div><Fingerprint size={18} /></div>
      <div className="security-role-list">
        {roles.map((role) => (
          <button key={role.id} className={selectedRole === role.role_name ? 'selected' : ''} onClick={() => onSelect(role.role_name)}>
            <strong>{role.role_name}</strong>
            <span>{role.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function UserManagementPanel({ users, onChangeRole, onSuspend }) {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>User Access Management</span><h2>People and access states</h2></div><UsersRound size={18} /></div>
      <div className="security-user-list">
        {users.map((user) => (
          <article key={user.id}>
            <div><strong>{user.full_name}</strong><StatusBadge label={user.status} state={getSecurityState(user.status)} /></div>
            <span>{user.email}</span>
            <dl>
              <div><dt>Role</dt><dd>{user.role}</dd></div>
              <div><dt>Tenant</dt><dd>{user.tenant}</dd></div>
              <div><dt>Last active</dt><dd>{user.last_active}</dd></div>
              <div><dt>MFA</dt><dd>{user.mfa_status}</dd></div>
            </dl>
            <div className="security-action-row">
              <button onClick={() => onChangeRole(user.id)}>Change Role</button>
              <button onClick={() => onSuspend(user.id)}>{user.status === 'Suspended' ? 'Restore' : 'Suspend'}</button>
              <button>Reset Access</button>
              <button>Require MFA</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RolePermissionMatrix({ onToggle }) {
  function permissionFor(moduleName, roleName) {
    return moduleRoleOverrides[moduleName]?.[roleName] || permissionLegend[roleName] || 'View';
  }
  return (
    <section className="security-panel permission-matrix-panel">
      <div className="approval-section-header"><div><span>Role Permissions Matrix</span><h2>Module authority</h2></div><SlidersHorizontal size={18} /></div>
      <div className="permission-matrix">
        <div className="permission-matrix-head">
          <span>Module</span>
          {permissionColumns.map((role) => <span key={role}>{role}</span>)}
        </div>
        {permissionModules.map((moduleName) => (
          <div className="permission-row" key={moduleName}>
            <strong>{moduleName}</strong>
            {permissionColumns.map((roleName) => {
              const value = permissionFor(moduleName, roleName);
              return <button key={`${moduleName}-${roleName}`} className={value === 'No Access' ? 'blocked' : value.includes('Approve') ? 'approve' : ''} onClick={() => onToggle(moduleName, roleName)}>{value}</button>;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function FounderSecurityControls({ freezeState, onControl }) {
  const controls = ['Freeze Workflow Engine', 'Emergency Payment Freeze', 'Lock Invoice Release', 'Disable Automation', 'Force Founder Review', 'Emergency Read-Only Mode'];
  return (
    <section className="security-panel founder-security-controls">
      <div className="approval-section-header"><div><span>Founder Security Controls</span><h2>{freezeState}</h2></div><LockKeyhole size={18} /></div>
      <div className="security-control-grid">
        {controls.map((control) => <button key={control} onClick={() => onControl(control)}>{control}</button>)}
      </div>
      <p>These controls are founder-authority gates. Emergency Payment Freeze immediately stops all auto-payment eligibility in connected mode. In Connect Supabase to activate, controls create audit evidence only.</p>
      <PaymentGovernancePanel compact />
    </section>
  );
}

function SessionMonitoringPanel({ sessions, onRevoke }) {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Session & Device Monitoring</span><h2>Active sessions</h2></div><Activity size={18} /></div>
      <div className="security-session-list">
        {sessions.map((session) => (
          <article key={session.id}>
            <div><strong>{session.device}</strong><StatusBadge label={session.status} state={getSecurityState(session.status)} /></div>
            <span>{session.browser} - {session.ip_address}</span>
            <small>Last active: {session.last_active}</small>
            <div className="security-action-row three">
              <button onClick={() => onRevoke(session.id)}>Revoke Session</button>
              <button>Sign Out Everywhere</button>
              <button>Require Re-auth</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationAccessPanel() {
  const services = ['OpenAI keys', 'Supabase', 'WhatsApp', 'SMTP', 'Forex APIs', 'News APIs', 'n8n'];
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Integration Access Control</span><h2>Secrets protected</h2></div><KeyRound size={18} /></div>
      <div className="security-chip-list">
        {services.map((service) => <span key={service}>{service}: Founder + CTO only</span>)}
      </div>
      <p>Masked metadata only. Raw API secrets must never be visible in frontend state, logs, or exported audit records.</p>
    </section>
  );
}

function ApprovalAuthorityRules() {
  const rows = [
    ['Founder', 'Final commercial authority'],
    ['COO', 'Operational routing only'],
    ['CFO', 'Pricing validation only'],
    ['CTO', 'Technical recommendation only'],
    ['CMO', 'Marketing recommendation only']
  ];
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Approval Authority Rules</span><h2>No self-approval</h2></div><ShieldCheck size={18} /></div>
      <div className="authority-rule-list">
        {rows.map(([role, rule]) => <div key={role}><strong>{role}</strong><span>{rule}</span></div>)}
      </div>
      <p>No executive command can self-approve final pricing, legal, invoice, release, banking, or contractual actions.</p>
    </section>
  );
}

function AuditLogsCard({ logs = [] }) {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Audit Logs</span><h2>System action history</h2></div><ClipboardList size={18} /></div>
      <div className="security-audit-list">
        {logs.slice(0, 12).map((event) => (
          <article key={event.id}>
            <i />
            <div>
              <strong>{event.action_type}</strong>
              <span>{event.module} - {event.actor} - {formatDisplayDate(event.created_at)}</span>
              <small>{event.description || 'Action recorded.'}</small>
            </div>
            <SeverityBadge severity={event.risk_level} />
          </article>
        ))}
        {!logs.length && (
          <article>
            <i />
            <div>
              <strong>No audit logs loaded</strong>
              <span>audit_logs - GOPU OS - Live feed pending</span>
              <small>Logs will appear here after authenticated Supabase reads are available.</small>
            </div>
            <SeverityBadge severity="Low" />
          </article>
        )}
      </div>
    </section>
  );
}

function SecurityAuditTimeline({ audit, filter, onFilter }) {
  const filters = ['All', 'Low', 'Medium', 'High', 'Critical', 'Roles', 'Integrations Vault', 'Automation Center'];
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Audit & Security Logs</span><h2>Access evidence</h2></div><FileBarChart size={18} /></div>
      <div className="security-filter-row">
        {filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}
      </div>
      <div className="security-audit-list">
        {audit.map((event) => (
          <article key={event.id}>
            <i />
            <div>
              <strong>{event.action}</strong>
              <span>{event.actor} - {event.module} - {event.created_at}</span>
              <small>{event.notes}</small>
            </div>
            <SeverityBadge severity={event.severity} />
          </article>
        ))}
      </div>
    </section>
  );
}

function MFASettingsPanel() {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>MFA & Security Settings</span><h2>Founder account hardening</h2></div><Fingerprint size={18} /></div>
      <div className="automation-status-grid">
        {[
          ['MFA status', 'Required'],
          ['Backup recovery', 'Founder review required'],
          ['Session expiry', 'Short-lived recommended'],
          ['Password rotation', 'Policy prepared'],
          ['Environment access', 'Founder + Admin controlled'],
          ['Recovery codes', 'Regenerate through backend only']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="security-action-row three">
        <button>Enable MFA</button>
        <button>Rotate Password</button>
        <button>Regenerate Codes</button>
      </div>
    </section>
  );
}

function TenantIsolationPanel() {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Tenant Security Isolation</span><h2>Protected / Monitoring</h2></div><Database size={18} /></div>
      <div className="automation-status-grid">
        {[
          ['Tenant separation', 'Protected'],
          ['Row-level security', 'Enabled in migration'],
          ['Data isolation health', 'Monitoring'],
          ['Cross-tenant warnings', 'None in local'],
          ['Public grants', 'Authenticated + RLS'],
          ['Security review', 'Required before launch']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}

function SecurityIncidentCenter({ incidents, expandedIncident, onExpand }) {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Security Incident Center</span><h2>Suspicious activity</h2></div><TriangleAlert size={18} /></div>
      <div className="security-incident-list">
        {incidents.map((incident) => (
          <button key={incident.id} className={expandedIncident === incident.id ? 'expanded' : ''} onClick={() => onExpand(incident.id)}>
            <div><strong>{incident.incident_type}</strong><SeverityBadge severity={incident.severity} /></div>
            <span>{incident.affected_module} - {incident.actor}</span>
            {expandedIncident === incident.id && <p>{incident.description}</p>}
            <StatusBadge label={incident.status} state={getSecurityState(incident.status)} />
          </button>
        ))}
      </div>
    </section>
  );
}

function SecurityMemoryPanel() {
  return (
    <section className="security-panel">
      <div className="approval-section-header"><div><span>Security Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div>
      <div className="security-chip-list">
        {['Repeated incidents', 'Approval abuse patterns', 'Suspicious behavior history', 'Recurring integration failures', 'Permission conflict history'].map((item) => <span key={item}>{item}</span>)}
      </div>
      <p>Future connected memory should identify recurring security patterns without exposing secrets or sensitive session data to frontend logs.</p>
    </section>
  );
}

function ExecutiveCommandPlaceholder({ command, onBack, onOpenApprovalWall, navigate }) {
  const Icon = command?.icon ?? Command;

  return (
    <ExportOSShell>
      <header className="deck-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{command?.name}</h1>
          <p>{command?.title}</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          {command?.id === 'cto' && <button className="ghost-button deck-logout" onClick={() => navigate('/export-os/executives/cto/integrations')}><KeyRound size={15} />{ctoLabels.integrationVaultButton}</button>}
          <button className="ghost-button deck-logout" onClick={onOpenApprovalWall}><FileCheck2 size={15} />Director Queue</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>
      <section className="placeholder-command-page">
        <div className="identity-orb"><Icon size={34} /><StatusPulse /></div>
        <span className="coo-kicker">Executive Command</span>
        <h2>{command?.name}</h2>
        <p>{command?.role}</p>
        <div className="executive-focus">
          <strong>Current Focus</strong>
          <p>{command?.current_focus}</p>
        </div>
        <div className="coo-mode-note">
          <strong>Connect Supabase to activate</strong>
          <p>This command page route is ready for Connected Memory Mode and Automation Mode. It uses static frontend data until backend memory and workflow triggers are connected.</p>
          <small>Final legal, customs, tax, banking, contractual, pricing, discount, and irreversible financial actions still require founder approval.</small>
        </div>
      </section>
    </ExportOSShell>
  );
}


export default SecurityDashboard;
