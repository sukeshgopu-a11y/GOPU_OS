import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Boxes,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Database,
  FileBarChart,
  FileText,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PackageCheck,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TimerReset,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  Workflow,
  Zap
} from 'lucide-react';
import { GopuLogoMark } from '../components/brand/BrandIcons.jsx';
import { backendStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from '../services/companyService.js';
import { getNotificationCenterData } from '../services/notificationService.js';
import { EmptyState } from './uiPrimitives.jsx';
import { announceToSR, getRouteAnnouncement, highlightMatch } from './runtimeHelpers.jsx';
function ConnectionBanner() {
  const [offline, setOffline] = React.useState(!navigator.onLine);
  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return (
    <div className="connection-banner" role="alert" aria-live="assertive">
      <AlertTriangle size={14} aria-hidden="true" />
      You are offline - changes may not save until connection is restored.
    </div>
  );
}

function Tooltip({ text, children }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="tooltip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

function TopLoadingBar({ loading }) {
  const [width, setWidth] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (loading) {
      setVisible(true);
      setWidth(0);
      const t1 = setTimeout(() => setWidth(40), 50);
      const t2 = setTimeout(() => setWidth(70), 400);
      const t3 = setTimeout(() => setWidth(90), 900);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);
  if (!visible) return null;
  return (
    <div
      className="top-loading-bar"
      role="progressbar"
      aria-label="Loading"
      aria-valuenow={width}
      style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1 }}
    />
  );
}

function SessionTimeoutWarning({ onExtend, onLogout, minutesLeft = 5 }) {
  return (
    <div className="confirm-overlay" role="alertdialog" aria-modal="true"
      aria-labelledby="timeout-title" aria-describedby="timeout-msg">
      <div className="confirm-dialog" style={{ borderColor: 'rgba(255,90,90,0.3)' }}>
        <TimerReset size={28} style={{ color: 'var(--warning)' }} aria-hidden="true" />
        <h2 id="timeout-title">Session expiring soon</h2>
        <p id="timeout-msg">
          Your session will expire in <strong>{minutesLeft} minutes</strong> due to inactivity.
          Stay signed in or you will be logged out automatically.
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onLogout}>Sign out now</button>
          <button className="tactical-button" onClick={onExtend}>Stay signed in</button>
        </div>
      </div>
    </div>
  );
}

function useSessionTimeout(onTimeout, timeoutMs = 25 * 60 * 1000, warningMs = 5 * 60 * 1000) {
  const [showWarning, setShowWarning] = React.useState(false);
  const warningTimer = React.useRef(null);
  const logoutTimer = React.useRef(null);
  const reset = React.useCallback(() => {
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
    warningTimer.current = setTimeout(() => setShowWarning(true), timeoutMs - warningMs);
    logoutTimer.current = setTimeout(() => onTimeout(), timeoutMs);
  }, [onTimeout, timeoutMs, warningMs]);
  React.useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [reset]);
  return { showWarning, extend: reset };
}

export const Pagination = React.memo(function Pagination({ total, perPage = 20, page, onPage }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => onPage(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        className="page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
});

function useFocusTrap(ref, isActive) {
  React.useEffect(() => {
    if (!isActive || !ref.current) return;
    const focusable = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const previouslyFocused = document.activeElement;
    if (first) first.focus();
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (focusable.length === 1) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused) previouslyFocused.focus();
    };
  }, [isActive, ref]);
}

function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const workspace = document.querySelector('.workspace');
    const target = workspace || document.scrollingElement || document.documentElement;
    if (!target) return undefined;

    const readScrollTop = () => (workspace ? workspace.scrollTop : window.scrollY || document.documentElement.scrollTop);
    const onScroll = () => setVisible(readScrollTop() > 400);
    const listenerTarget = workspace || window;
    listenerTarget.addEventListener('scroll', onScroll);
    onScroll();
    return () => listenerTarget.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      className="scroll-top-btn"
      onClick={() => {
        const workspace = document.querySelector('.workspace');
        if (workspace) {
          workspace.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      aria-label="Scroll to top"
    >
      Up
    </button>
  );
}

export function ProgressBar({ value, max = 100, color = 'var(--cyan)', label, showValue = true }) {
  const numericValue = Number(value) || 0;
  const pct = Math.min(100, Math.max(0, (numericValue / max) * 100));
  return (
    <div className="progress-bar-wrap" role="progressbar"
      aria-valuenow={numericValue} aria-valuemin={0} aria-valuemax={max}
      aria-label={label || `${pct.toFixed(0)}%`}>
      {(label || showValue) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showValue && <span className="progress-bar-value">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Sparkline({ data = [], color = 'var(--cyan)', height = 36, width = 120 }) {
  const gradientId = React.useId();
  if (!data || data.length < 2) return null;
  const nums = data.map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastPct = ((nums[nums.length - 1] - min) / range);
  const lastX = width;
  const lastY = height - lastPct * (height - 4) - 2;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

function RingProgress({ value, max = 100, size = 56, stroke = 4, color = 'var(--cyan)', label }) {
  const numericValue = Number(value) || 0;
  const pct = Math.min(100, Math.max(0, (numericValue / max) * 100));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="ring-progress" style={{ width: size, height: size }}
      role="img" aria-label={label || `${pct.toFixed(0)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 700ms var(--ease)' }}
        />
      </svg>
      <span className="ring-progress-label">
        {pct.toFixed(0)}<small>%</small>
      </span>
    </div>
  );
}

function getNotificationSection(item) {
  const type = String(item.notification_type || item.source_module || '').toLowerCase();
  const severity = String(item.severity || '').toLowerCase();
  const status = String(item.status || '').toLowerCase();
  if (severity === 'critical') return 'Critical Alerts';
  if (type.includes('approval') || status.includes('review') || status.includes('approval')) return 'Pending Reviews';
  if (type.includes('shipment') || type.includes('logistic')) return 'Shipment Risks';
  if (type.includes('payment') || type.includes('financial') || type.includes('cfo')) return 'Payment Alerts';
  if (type.includes('technical') || type.includes('cto')) return 'Technical Incidents';
  if (type.includes('opportunity') || type.includes('lead') || type.includes('cmo') || type.includes('cio')) return 'Strategic Opportunities';
  if (status.includes('escalated')) return 'Executive Escalations';
  return 'Executive Escalations';
}

function normalizeTopNotification(item) {
  return {
    id: item.id,
    section: getNotificationSection(item),
    title: item.title || item.message || 'Notification',
    message: item.message || item.description || 'Workflow notification requires review.',
    severity: item.severity || item.priority || 'Attention',
    owner: item.owner || item.source_module || item.notification_type || 'GOPU OS',
    route: item.linked_route || item.route || '/export-os/notification-center',
    status: item.status || 'Monitoring',
    created_at: item.created_at,
    viewed_by_founder: item.viewed_by_founder
  };
}

function NotificationCentre({ open, onClose, notifications = [] }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  const groups = React.useMemo(() => {
    const critical = notifications.filter((n) => ['critical', 'high risk'].includes(String(n.severity || n.type || '').toLowerCase()) || n.type === 'error');
    const warnings = notifications.filter((n) => ['warning', 'attention', 'review required', 'high'].includes(String(n.severity || n.type || '').toLowerCase()) || n.type === 'warning');
    const info = notifications.filter((n) => !critical.includes(n) && !warnings.includes(n));
    return [
      { key: 'critical', label: 'Critical', items: critical, cls: 'error' },
      { key: 'warnings', label: 'Warnings', items: warnings, cls: 'warning' },
      { key: 'info', label: 'Updates', items: info, cls: 'info' },
    ].filter((g) => g.items.length > 0);
  }, [notifications]);

  return (
    <>
      <div
        className={`notif-backdrop ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={ref}
        className={`notif-panel ${open ? 'open' : ''}`}
        aria-label="Notification centre"
        aria-hidden={!open}
      >
        <header className="notif-header">
          <div>
            <span className="notif-eyebrow">Live Feed</span>
            <h2>Notifications</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close notifications">
            <ArrowLeft size={16} />
          </button>
        </header>

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All clear"
            description="No active alerts or notifications."
          />
        ) : (
          <div className="notif-scroll" aria-live="polite" aria-relevant="additions removals">
            {groups.map((group) => (
              <section key={group.key}>
                <div className={`notification-group-header ${group.cls}`}>
                  <span>{group.label}</span>
                  <span className="notif-count">{group.items.length}</span>
                </div>
                {group.items.map((n, i) => (
                  <div key={i} className={`notif-item notif-${group.cls}`}>
                    <div className="notif-item-body">
                      <strong>{n.title || n.message}</strong>
                      {n.detail && <p>{n.detail}</p>}
                    </div>
                    <time className="notification-timestamp">
                      {n.time || n.created_at
                        ? new Date(n.time || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Now'}
                    </time>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

function SettingsPanel({ open, onClose, prefs, onPref }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  return (
    <>
      <div className={`notif-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        className={`notif-panel settings-panel ${open ? 'open' : ''}`}
        aria-label="Settings"
        aria-hidden={!open}
      >
        <header className="notif-header">
          <div>
            <span className="notif-eyebrow">Preferences</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <ArrowLeft size={16} />
          </button>
        </header>
        <div className="settings-body">
          <section className="settings-section">
            <h3 className="settings-section-title">Display</h3>
            <SettingToggle
              label="Compact mode"
              description="Reduce padding for denser information view"
              value={prefs.compact}
              onChange={(v) => onPref('compact', v)}
            />
            <SettingToggle
              label="Reduced motion"
              description="Disable animations and transitions"
              value={prefs.reducedMotion}
              onChange={(v) => onPref('reducedMotion', v)}
            />
            <SettingToggle
              label="Show live clock"
              description="Display current time in the header"
              value={prefs.showClock}
              onChange={(v) => onPref('showClock', v)}
            />
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">Appearance</span>
                <span className="setting-desc">Switch between dark and light mode</span>
              </div>
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${prefs.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onPref('theme', 'dark')}
                  aria-pressed={prefs.theme === 'dark'}
                  aria-label="Dark mode"
                >
                  Dark
                </button>
                <button
                  className={`view-toggle-btn ${prefs.theme === 'light' ? 'active' : ''}`}
                  onClick={() => onPref('theme', 'light')}
                  aria-pressed={prefs.theme === 'light'}
                  aria-label="Light mode"
                >
                  Light
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-label">Accent colour</span>
                <span className="setting-desc">Choose the interface highlight colour</span>
              </div>
              <div className="accent-swatches" role="radiogroup" aria-label="Accent colour">
                {[
                  { key: 'cyan', color: '#2ef2ff' },
                  { key: 'blue', color: '#5b8cff' },
                  { key: 'green', color: '#3ddc84' },
                  { key: 'amber', color: '#ffb547' },
                  { key: 'purple', color: '#a78bfa' },
                ].map((a) => (
                  <button
                    key={a.key}
                    className={`accent-swatch ${prefs.accent === a.key ? 'active' : ''}`}
                    style={{ background: a.color }}
                    onClick={() => onPref('accent', a.key)}
                    role="radio"
                    aria-checked={prefs.accent === a.key}
                    aria-label={`${a.key} accent`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Notifications</h3>
            <SettingToggle
              label="Critical alerts"
              description="Show error and blocked workflow alerts"
              value={prefs.alertsCritical}
              onChange={(v) => onPref('alertsCritical', v)}
            />
            <SettingToggle
              label="Approval reminders"
              description="Notify when approvals are pending over 2 hours"
              value={prefs.alertsApprovals}
              onChange={(v) => onPref('alertsApprovals', v)}
            />
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Data</h3>
            <SettingToggle
              label="Auto-refresh dashboard"
              description="Reload metrics every 5 minutes"
              value={prefs.autoRefresh}
              onChange={(v) => onPref('autoRefresh', v)}
            />
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dim)', marginBottom: 'var(--space-2)' }}>
                Onboarding
              </p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  localStorage.removeItem('gopuos_tour_done');
                  window.location.reload();
                }}
              >
                Restart welcome tour
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function SettingToggle({ label, description, value, onChange }) {
  const id = React.useId();
  return (
    <label className="setting-row" htmlFor={id}>
      <div className="setting-copy">
        <span className="setting-label">{label}</span>
        <span className="setting-desc">{description}</span>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`toggle-switch ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  );
}

function UserChip({ session, onSettings }) {
  const email = session?.user?.email || 'Founder';
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <button className="user-chip" onClick={onSettings} aria-label="Open settings" data-tour="settings-trigger">
      <span className="user-avatar" aria-hidden="true">{initials}</span>
      <span className="user-email">{email.split('@')[0]}</span>
      <Settings size={13} aria-hidden="true" />
    </button>
  );
}

const COMMAND_ITEMS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigate', icon: 'Gauge', page: 'dashboard' },
  { id: 'nav-director', label: 'Open Director Console', category: 'Navigate', icon: 'Target', page: 'director' },
  { id: 'nav-shipments', label: 'Go to Shipments', category: 'Navigate', icon: 'Route', page: 'shipments' },
  { id: 'nav-approvals', label: 'Go to Approvals', category: 'Navigate', icon: 'ShieldCheck', page: 'approvals' },
  { id: 'nav-tasks', label: 'Go to Tasks', category: 'Navigate', icon: 'ClipboardList', page: 'tasks' },
  { id: 'nav-leads', label: 'Go to Leads', category: 'Navigate', icon: 'UsersRound', page: 'leads' },
  { id: 'nav-pricing', label: 'Go to Pricing Engine', category: 'Navigate', icon: 'CircleDollarSign', page: 'pricing' },
  { id: 'nav-invoices', label: 'Go to Invoices', category: 'Navigate', icon: 'FileText', page: 'invoices' },
  { id: 'nav-coo', label: 'Open COO Operations', category: 'Navigate', icon: 'Workflow', page: 'coo' },
  { id: 'nav-cfo', label: 'Open CFO Finance', category: 'Navigate', icon: 'CircleDollarSign', page: 'cfo' },
  { id: 'nav-cmo', label: 'Open CMO Marketing', category: 'Navigate', icon: 'TrendingUp', page: 'cmo' },
  { id: 'nav-cto', label: 'Open CTO Command', category: 'Navigate', icon: 'Database', page: 'cto' },
  { id: 'nav-cio', label: 'Open CIO Intelligence', category: 'Navigate', icon: 'BrainCircuit', page: 'cio' },
  { id: 'nav-buyers', label: 'Go to Buyers', category: 'Navigate', icon: 'UsersRound', page: 'buyers' },
  { id: 'nav-suppliers', label: 'Go to Suppliers', category: 'Navigate', icon: 'PackageCheck', page: 'suppliers' },
  { id: 'nav-warehouse', label: 'Go to Warehouse', category: 'Navigate', icon: 'Boxes', page: 'warehouse' },
  { id: 'nav-vault', label: 'Go to Payment Vault', category: 'Navigate', icon: 'LockKeyhole', page: 'payment-vault' },
  { id: 'nav-documents', label: 'Go to Document Factory', category: 'Navigate', icon: 'FileBarChart', page: 'documents' },
  { id: 'nav-automation', label: 'Go to Automation Center', category: 'Navigate', icon: 'Zap', page: 'automation' },
  { id: 'nav-security', label: 'Go to Security', category: 'Navigate', icon: 'Fingerprint', page: 'security' },
  { id: 'nav-company', label: 'Go to Company Master Data', category: 'Navigate', icon: 'Building2', page: 'company' },
  { id: 'nav-learning', label: 'Go to Learning Centre', category: 'Navigate', icon: 'BrainCircuit', page: 'learning' },
  { id: 'action-shipment', label: 'Create New Shipment', category: 'Actions', icon: 'PackageCheck', page: 'shipments' },
  { id: 'action-invoice', label: 'Create New Invoice', category: 'Actions', icon: 'FileBarChart', page: 'invoices' },
  { id: 'action-approvals', label: 'Review Pending Approvals', category: 'Actions', icon: 'CheckCircle2', page: 'approvals' },
  { id: 'action-briefing', label: 'Run Daily Briefing', category: 'Actions', icon: 'Zap', page: 'dashboard' },
  { id: 'action-settings', label: 'Open Settings', category: 'Settings', icon: 'Settings', action: 'settings' },
  { id: 'action-signout', label: 'Sign Out', category: 'Settings', icon: 'LockKeyhole', action: 'signout' },
];

const ICON_MAP = {
  Gauge, Route, ShieldCheck, ClipboardList, CircleDollarSign,
  Workflow, TrendingUp, Database, Target, FileText, UsersRound,
  LockKeyhole, Fingerprint, BrainCircuit, PackageCheck,
  FileBarChart, CheckCircle2, Zap, Settings, Boxes, Building2,
};

function CommandPalette({ open, onClose, onNavigate, onAction }) {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!debouncedQuery.trim()) return COMMAND_ITEMS;
    const q = debouncedQuery.toLowerCase();
    return COMMAND_ITEMS.filter(
      (item) =>
        item.label?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.page?.toLowerCase().includes(q)
    );
  }, [debouncedQuery]);

  const grouped = React.useMemo(() => {
    const map = {};
    filtered.forEach((item) => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return Object.entries(map);
  }, [filtered]);

  const flat = filtered;

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[cursor];
      if (item) runItem(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  function runItem(item) {
    onClose();
    if (item.action === 'settings') { onAction('settings'); return; }
    if (item.action === 'signout') { onAction('signout'); return; }
    if (item.page) onNavigate(item.page);
  }

  React.useEffect(() => {
    const el = listRef.current?.querySelector('.cmd-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmd-search-row">
          <Search size={16} className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Search pages, actions, settings..."
            aria-label="Command search"
            aria-autocomplete="list"
            aria-controls="cmd-list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc-hint">ESC</kbd>
        </div>

        <div id="cmd-list" ref={listRef} className="cmd-results" role="listbox">
          {grouped.length === 0 && (
            <div className="cmd-empty">No results for "{query}"</div>
          )}
          {grouped.map(([category, items]) => (
            <div key={category} className="cmd-group">
              <div className="cmd-group-label" role="presentation">{category}</div>
              {items.map((item) => {
                const idx = flat.indexOf(item);
                const Icon = ICON_MAP[item.icon];
                return (
                  <button
                    key={item.id}
                    className={`cmd-item ${idx === cursor ? 'active' : ''}`}
                    role="option"
                    aria-selected={idx === cursor}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => runItem(item)}
                  >
                    <span className="cmd-item-icon">
                      {Icon && <Icon size={15} aria-hidden="true" />}
                    </span>
                    <span className="cmd-item-label">
                      {highlightMatch(item.label, query)}
                    </span>
                    <kbd className="cmd-item-hint">Enter</kbd>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="cmd-footer">
          <span><kbd>UpDown</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
          <span><kbd>Ctrl K</kbd> toggle</span>
        </footer>
      </div>
    </div>
  );
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useLoadingState(initialLoading = true, minDuration = 400) {
  const [loading, setLoading] = React.useState(initialLoading);
  const startRef = React.useRef(Date.now());

  function done() {
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, minDuration - elapsed);
    setTimeout(() => setLoading(false), remaining);
  }

  return [loading, done];
}

function usePrevious(value) {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

export function useRowSelection(items = [], idKey = 'id') {
  const [selected, setSelected] = React.useState(new Set());

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((s) =>
    s.size === items.length ? new Set() : new Set(items.map((i) => i[idKey]))
  );
  const clear = () => setSelected(new Set());
  const isSelected = (id) => selected.has(id);
  const allSelected = selected.size === items.length && items.length > 0;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedItems = items.filter((i) => selected.has(i[idKey]));

  return { selected, toggle, toggleAll, clear, isSelected, allSelected, someSelected, selectedItems };
}

export function exportCSV(rows, columns, filename = 'export') {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.accessor ? c.accessor(row) : (row[c.key] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const InvoiceDocument = React.memo(function InvoiceDocument({ invoice }) {
  if (!invoice) return null;
  const items = invoice.line_items || invoice.items || [];
  const subtotal = items.reduce((s, i) => {
    const amount = Number(i.amount ?? (Number(i.quantity || 0) * Number(i.rate || i.unit_price || 0)));
    return s + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const tax = invoice.tax_amount || invoice.igst_amount || 0;
  const total = invoice.total_amount || (subtotal + Number(tax));
  const currency = invoice.currency || 'USD';
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const statusClass = String(invoice.status || 'draft').toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  return (
    <div className="invoice-doc-wrap" id="invoice-print-area">
      <div className="no-print invoice-print-actions">
        <PrintButton label="Print Invoice / Save PDF" />
      </div>
      <header className="invoice-doc-header">
        <div className="invoice-doc-brand">
          <strong>GOPU EXPORTS</strong>
          <span>
            {invoice.seller_address || invoice.company_address || 'Export Division'}<br />
            GSTIN: {invoice.seller_gstin || invoice.gstin || '-'}<br />
            IEC: {invoice.iec_code || '-'}
          </span>
        </div>
        <div className="invoice-doc-meta">
          <span className="invoice-doc-type">{invoice.invoice_type || 'Commercial Invoice'}</span>
          <span className="invoice-doc-number">{invoice.invoice_number || invoice.reference || 'DRAFT'}</span>
          <span className="invoice-doc-date">Date: {invoice.invoice_date || new Date().toLocaleDateString()}</span>
          {invoice.due_date && <span className="invoice-doc-date">Due: {invoice.due_date}</span>}
          <div aria-label={`Invoice status: ${invoice.status || 'Draft'}`} style={{ marginTop: 8 }} className={`invoice-status-stamp ${statusClass}`}>
            {invoice.status || 'Draft'}
          </div>
        </div>
      </header>
      <div className="invoice-doc-parties">
        <div className="invoice-party-block">
          <span className="invoice-party-role">Bill From</span>
          <span className="invoice-party-name">{invoice.seller_name || 'GOPU Exports Pvt Ltd'}</span>
          <span className="invoice-party-detail">{invoice.seller_address || '-'}</span>
        </div>
        <div className="invoice-party-block">
          <span className="invoice-party-role">Bill To</span>
          <span className="invoice-party-name">{invoice.buyer_name || invoice.buyer?.company_name || '-'}</span>
          <span className="invoice-party-detail">
            {invoice.buyer_address || '-'}<br />
            {invoice.buyer_country && `Country: ${invoice.buyer_country}`}
          </span>
        </div>
      </div>
      <table className="invoice-items-table" aria-label="Invoice line items">
        <thead>
          <tr><th style={{ width: 32 }}>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Rate ({currency})</th><th>Amount ({currency})</th></tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const amount = item.amount ?? (Number(item.quantity || 0) * Number(item.rate || item.unit_price || 0));
            return (
              <tr key={`${item.description || item.product_name || item.product_description || 'item'}-${i}`}>
                <td>{i + 1}</td>
                <td><div className="invoice-item-desc"><strong>{item.description || item.product_name || item.product_description}</strong>{item.note && <span>{item.note}</span>}</div></td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.hsn_code || '-'}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.quantity || '-'}</span></td>
                <td>{item.unit || 'PCS'}</td>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(item.rate || item.unit_price || 0)}</span></td>
                <td>{fmt(amount || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="invoice-totals">
        <div className="invoice-total-row"><span>Subtotal</span><span>{currency} {fmt(subtotal)}</span></div>
        {invoice.freight_amount && <div className="invoice-total-row"><span>Freight</span><span>{currency} {fmt(invoice.freight_amount)}</span></div>}
        {tax > 0 && <div className="invoice-total-row"><span>Tax / IGST ({invoice.tax_rate || invoice.igst_rate || 0}%)</span><span>{currency} {fmt(tax)}</span></div>}
        <div className="invoice-total-row grand"><span>Total Due</span><span>{currency} {fmt(total)}</span></div>
      </div>
      {(invoice.bank_name || invoice.account_number) && (
        <div className="invoice-bank-block">
          <span className="invoice-bank-title">Payment Details</span>
          <div className="invoice-bank-grid">
            {[
              ['Bank', invoice.bank_name],
              ['Account', invoice.account_number],
              ['SWIFT / IFSC', invoice.swift_code || invoice.ifsc_code],
              ['Branch', invoice.bank_branch],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="invoice-bank-field"><label>{label}</label><span>{value}</span></div>
            ))}
          </div>
        </div>
      )}
      <footer className="invoice-doc-footer" role="contentinfo">
        <p className="invoice-doc-notes">{invoice.terms || invoice.payment_terms || 'Payment due within 30 days. Please reference invoice number in all communications.'}</p>
        <div className="invoice-doc-seal">
          <div style={{ width: 80, height: 80, border: '2px solid var(--border-cyan)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--cyan)' }}>
            <ShieldCheck size={32} aria-hidden="true" />
          </div>
          <span>Authorised Signatory</span>
        </div>
      </footer>
    </div>
  );
});

const NAV_GROUPS = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, route: '/export-os', exact: true },
      { label: 'Director', icon: Target, route: '/export-os/director' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Leads', icon: UsersRound, route: '/export-os/leads' },
      { label: 'Pricing Engine', icon: CircleDollarSign, route: '/export-os/pricing-engine' },
      { label: 'Invoices', icon: FileText, route: '/export-os/invoices' },
      { label: 'Shipments', icon: Route, route: '/export-os/shipments' },
      { label: 'Tasks', icon: ClipboardList, route: '/export-os/tasks' },
    ],
  },
  {
    label: 'Executives',
    items: [
      { label: 'COO', icon: Workflow, route: '/export-os/executives/coo' },
      { label: 'CFO', icon: CircleDollarSign, route: '/export-os/executives/cfo' },
      { label: 'CMO', icon: TrendingUp, route: '/export-os/executives/cmo' },
      { label: 'CTO', icon: Database, route: '/export-os/executives/cto' },
      { label: 'CIO', icon: BrainCircuit, route: '/export-os/executives/cio' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Buyers', icon: UsersRound, route: '/export-os/buyers' },
      { label: 'Suppliers', icon: PackageCheck, route: '/export-os/suppliers' },
      { label: 'Warehouse', icon: Boxes, route: '/export-os/warehouse' },
      { label: 'Payments', icon: LockKeyhole, route: '/export-os/payment-vault' },
      { label: 'Documents', icon: FileBarChart, route: '/export-os/document-factory' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Automation', icon: Zap, route: '/export-os/automation-center' },
      { label: 'Learning', icon: BrainCircuit, route: '/export-os/learning-centre' },
      { label: 'Security', icon: ShieldCheck, route: '/export-os/security' },
      { label: 'Company', icon: Building2, route: '/export-os/company-master-data' },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle, pathname, liveDataConnected, notificationCount, onOpenNotifications, onOpenSettings, onOpenCommandPalette }) {
  function navigate(route) {
    window.history.pushState({}, '', route);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function isActive(route, exact) {
    if (exact) return pathname === route;
    if (route === '/export-os') return pathname === '/export-os';
    return pathname.startsWith(route);
  }

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand" role="banner">
        <GopuLogoMark size={28} />
        {!collapsed && (
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-name">GOPU OS</span>
            <span className="sidebar-brand-sub">Export Command</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="sidebar-search-wrap">
        <button
          className="sidebar-search-btn"
          onClick={onOpenCommandPalette}
          title="Command palette (Ctrl+K)"
          aria-label="Open command palette"
        >
          <Search size={14} aria-hidden="true" />
          {!collapsed && <span>Quick search…</span>}
          {!collapsed && <kbd className="sidebar-kbd">⌘K</kbd>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Module navigation">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            {group.label && !collapsed && (
              <span className="sidebar-group-label" aria-hidden="true">{group.label}</span>
            )}
            {group.items.map((item) => {
              const active = isActive(item.route, item.exact);
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                  onClick={() => navigate(item.route)}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="sidebar-nav-icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className={`sidebar-status-dot ${liveDataConnected ? 'online' : 'offline'}`}
            title={liveDataConnected ? 'Live data connected' : 'Offline'} />
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Sukesh Reddy</span>
              <span className="sidebar-user-role">Founder</span>
            </div>
          )}
        </div>
        <div className="sidebar-footer-actions">
          <button
            className="sidebar-icon-btn"
            onClick={onOpenNotifications}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
            title="Notifications"
          >
            <Bell size={14} aria-hidden="true" />
            {notificationCount > 0 && (
              <span className="sidebar-badge" aria-hidden="true">{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>
          <button className="sidebar-icon-btn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
            <Settings size={14} aria-hidden="true" />
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft size={14} className={`sidebar-chevron ${collapsed ? 'rotated' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

const ShellControlsContext = React.createContext(null);

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="deck-header">
      <div className="deck-header-copy">
        {eyebrow && <span>{eyebrow}</span>}
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="deck-header-controls">{children}</div>}
    </div>
  );
}

export function PageBody({ children, className = '' }) {
  return <div className={`page-body ${className}`} style={{ padding: 'var(--space-6) var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minHeight: 0 }}>{children}</div>;
}

export function SectionCard({ title, actions, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel-header">
          {title && <h2>{title}</h2>}
          {actions && <div className="deck-header-controls">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function ExportOSShell({ children, className = '', liveDataConnected = backendStatus.mode === 'Connected', statusMessage, loading = false }) {
  const isCtoShell = className.includes('cto-shell');
  const backendMessage = statusMessage || (isCtoShell && liveDataConnected ? 'Supabase live connected' : isCtoShell && !liveDataConnected ? 'No live data connected' : backendStatus.message);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem('gopu-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [shellPathname, setShellPathname] = React.useState(
    typeof window !== 'undefined' ? window.location.pathname : '/export-os'
  );

  React.useEffect(() => {
    function sync() { setShellPathname(window.location.pathname); }
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  React.useEffect(() => {
    function toggle() {
      setSidebarCollapsed((c) => {
        const next = !c;
        try { localStorage.setItem('gopu-sidebar-collapsed', String(next)); } catch {}
        return next;
      });
    }
    window.addEventListener('gopu:toggle-sidebar', toggle);
    return () => window.removeEventListener('gopu:toggle-sidebar', toggle);
  }, []);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [showSearch, setShowSearch] = React.useState(false);
  const [prefs, setPrefs] = React.useState(() => {
    const defaults = {
      compact: false,
      reducedMotion: false,
      showClock: true,
      alertsCritical: true,
      alertsApprovals: true,
      autoRefresh: false,
      theme: 'dark',
      accent: 'cyan',
    };
    try {
      const saved = localStorage.getItem('gopu-os-prefs');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const handlePref = (key, val) => setPrefs((p) => {
    const next = { ...p, [key]: val };
    try { localStorage.setItem('gopu-os-prefs', JSON.stringify(next)); } catch {}
    return next;
  });
  const refreshNotifications = React.useCallback(async () => {
    const result = await getNotificationCenterData(demoTenantId);
    setNotifications(result.data?.notifications || []);
  }, []);

  const shellControls = React.useMemo(() => ({
    prefs,
    notifications,
    notificationCount: notifications.filter((item) => !item.viewed_by_founder).length,
    refreshNotifications,
    openNotifications: () => setNotifOpen(true),
    openSettings: () => setSettingsOpen(true),
    openCommandPalette: () => setShowSearch(true)
  }), [notifications, prefs, refreshNotifications]);

  React.useEffect(() => {
    refreshNotifications();
    const events = [
      'gopu:task-created',
      'gopu:task-updated',
      'gopu:task-audit',
      'gopu:approval-updated',
      'gopu:slack-notification-activity'
    ];
    events.forEach((eventName) => window.addEventListener(eventName, refreshNotifications));
    const timer = window.setInterval(refreshNotifications, 30000);
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, refreshNotifications));
      window.clearInterval(timer);
    };
  }, [refreshNotifications]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    document.documentElement.setAttribute('data-accent', prefs.accent);
    if (prefs.reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [prefs.theme, prefs.accent, prefs.reducedMotion]);

  React.useEffect(() => {
    function openPalette() {
      setShowSearch(true);
    }
    window.addEventListener('gopu:open-command-palette', openPalette);
    return () => {
      window.removeEventListener('gopu:open-command-palette', openPalette);
    };
  }, []);

  function navigateCommandPage(page) {
    const routes = {
      dashboard: '/export-os',
      director: '/export-os/director',
      shipments: '/export-os/shipments',
      approvals: '/export-os/director',
      tasks: '/export-os/tasks',
      leads: '/export-os/leads',
      pricing: '/export-os/pricing-engine',
      invoices: '/export-os/invoices',
      coo: '/export-os/executives/coo',
      cfo: '/export-os/executives/cfo',
      cmo: '/export-os/executives/cmo',
      cto: '/export-os/executives/cto',
      cio: '/export-os/executives/cio',
      buyers: '/export-os/buyers',
      suppliers: '/export-os/suppliers',
      warehouse: '/export-os/warehouse',
      'payment-vault': '/export-os/payment-vault',
      documents: '/export-os/document-factory',
      automation: '/export-os/automation-center',
      security: '/export-os/security',
      company: '/export-os/company-master-data',
      learning: '/export-os/learning-centre',
    };
    const path = routes[page] || '/export-os';
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    announceToSR(`Navigated to ${getRouteAnnouncement(path)}`);
  }

  async function runCommandAction(action) {
    if (action === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (action === 'signout') {
      window.sessionStorage.removeItem('selectedOS');
      window.sessionStorage.removeItem('executiveSessionState');
      window.sessionStorage.removeItem('founderSessionPin');
      window.sessionStorage.removeItem('founderSecurityPinSet');
      window.history.pushState({}, '', '/login/export');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <div className={`app-root ${prefs.compact ? 'compact-mode' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <TopLoadingBar loading={loading} />
      <ConnectionBanner />
      <div id="sr-announcer" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="sr-alert" role="alert" aria-live="assertive" aria-atomic="true" className="sr-only" />
      <a href="#shell-content" className="skip-link">Skip to main content</a>
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => {
          const next = !c;
          try { localStorage.setItem('gopu-sidebar-collapsed', String(next)); } catch {}
          return next;
        })}
        pathname={shellPathname}
        liveDataConnected={liveDataConnected}
        notificationCount={shellControls.notificationCount}
        onOpenNotifications={() => setNotifOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCommandPalette={() => setShowSearch(true)}
      />
      <main id="shell-content" className={`shell-main ${className}`} aria-label="Main content">
        <ShellControlsContext.Provider value={shellControls}>
          {children}
        </ShellControlsContext.Provider>
      </main>
      <NotificationCentre
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPref={handlePref}
      />
      <CommandPalette
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigate={(page) => { navigateCommandPage(page); setShowSearch(false); }}
        onAction={(action) => {
          setShowSearch(false);
          runCommandAction(action);
        }}
      />
      <ScrollToTop />
    </div>
  );
}

function GlobalBackNavigation() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/export-os';
  const context = getGlobalBackContext(pathname);
  if (!context) return null;

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.history.pushState({}, '', context.fallback);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <button className="global-back-navigation" onClick={goBack} aria-label={context.aria} title={context.aria}>
      <ArrowLeft size={17} />
      <span>{context.label}</span>
    </button>
  );
}

function getGlobalBackContext(pathname) {
  if (!pathname.startsWith('/export-os') || pathname === '/export-os') return null;
  const pairs = [
    ['/export-os/executives/coo', 'Back to COO'],
    ['/export-os/executives/cfo', 'Back to CFO'],
    ['/export-os/executives/cto', 'Back to CTO'],
    ['/export-os/executives/cmo', 'Back to CMO'],
    ['/export-os/cio', 'Back to CIO'],
    ['/export-os/importers/', 'Back to Importers'],
    ['/export-os/importers', 'Back to Importers'],
    ['/export-os/buyers/', 'Back to Buyer CRM'],
    ['/export-os/buyers', 'Back to Buyer CRM'],
    ['/export-os/suppliers/', 'Back to Suppliers'],
    ['/export-os/suppliers', 'Back to Suppliers'],
    ['/export-os/invoices/', 'Back to Invoices'],
    ['/export-os/invoices', 'Back to Invoices'],
    ['/export-os/shipments/', 'Back to Shipments'],
    ['/export-os/shipments', 'Back to Shipments'],
    ['/export-os/workflows/', 'Back to Workflows'],
    ['/export-os/workflows', 'Back to Workflows'],
    ['/export-os/tasks', 'Back to Tasks'],
    ['/export-os/lead-intake', 'Back to Lead Intake'],
    ['/export-os/leads', 'Back to Lead Intake'],
    ['/export-os/payment-vault', 'Back to Payments'],
    ['/export-os/payments', 'Back to Payments'],
    ['/export-os/pricing-engine', 'Back to Pricing'],
    ['/export-os/director', 'Back to Director'],
    ['/export-os/notification-center', 'Back to Notifications'],
    ['/export-os/learning-centre', 'Back to Learning Centre'],
    ['/export-os/workflow-engine', 'Back to Workflow Engine'],
    ['/export-os/workflow-dependencies', 'Back to Workflow Engine']
  ];
  const match = pairs.find(([prefix]) => pathname.startsWith(prefix));
  const label = match?.[1] || 'Command Deck';
  return { label, aria: `${label} previous operational context`, fallback: '/export-os' };
}
