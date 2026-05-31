import React from 'react';
import { AlertTriangle, CheckCircle2, TriangleAlert } from 'lucide-react';

export const approvalFilters = ['All', 'Pending Approval', 'Needs Review', 'Approved', 'Rejected', 'High Risk', 'Financial', 'Compliance', 'Marketing', 'Operations'];

export const approvalAuditEvents = [
  ['09:20', 'COO submitted approval', 'COO Command', 'Waiting Founder Action'],
  ['09:35', 'CFO pricing verified', 'CFO Command', 'Review Pending'],
  ['10:05', 'Founder review pending', 'System', 'High Risk'],
  ['10:40', 'Revision requested', 'Founder Office', 'Revision Requested'],
  ['11:25', 'Approval escalated', 'COO Command', 'Escalated']
].map(([time, event, actor, status], index) => ({ id: `approval-audit-${index}`, time, event, actor, status }));

export const urgentExecutiveAlerts = [
  { title: 'API credits critically low', risk: 'Critical', owner: 'CTO Command', action: 'Review subscription and platform limit' },
  { title: 'Shipment deadline risk', risk: 'High', owner: 'COO Command', action: 'Confirm supplier packing before buyer promise' },
  { title: 'Major pricing deviation detected', risk: 'High', owner: 'CFO Command', action: 'Review margin before quote release' },
  { title: 'Missing export compliance field', risk: 'Critical', owner: 'COO Command', action: 'Complete compliance field before document use' },
  { title: 'Failed lead intake form', risk: 'Medium', owner: 'CTO Command', action: 'Check intake capture and notification flow' },
  { title: 'Subscription expiry risk', risk: 'Medium', owner: 'Founder Office', action: 'Review renewal before automation disruption' }
];

export const approvalMemoryPatterns = [
  'Low-margin quotes usually require freight confirmation before approval',
  'Origin claims require supporting document evidence',
  'Marketing claims using organic/premium/certified wording require founder review',
  'Payment term exceptions above standard terms require CFO note',
  'Repeated document correction: missing origin support reference'
];

export const approvalModels = ['founder_approvals', 'notifications', 'audit_logs', 'workflow sync'];

export function announceToSR(message, priority = 'polite') {
  const id = priority === 'assertive' ? 'sr-alert' : 'sr-announcer';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

export function getRouteAnnouncement(path) {
  const leaf = String(path || '/export-os').split('/').filter(Boolean).pop() || 'dashboard';
  return leaf.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function highlightMatch(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part
  );
}

export function useSwipeToDismiss(onDismiss, threshold = 60) {
  const startX = React.useRef(null);
  return React.useMemo(() => ({
    onTouchStart: (e) => { startX.current = e.touches[0]?.clientX ?? null; },
    onTouchEnd: (e) => {
      if (startX.current == null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX.current;
      if (Math.abs(endX - startX.current) > threshold) onDismiss?.();
      startX.current = null;
    }
  }), [onDismiss, threshold]);
}

export function useFocusTrap(ref, isActive) {
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

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmClass = 'tactical-button', onConfirm, onCancel }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open);
  if (!open) return null;
  return (
    <div className="confirm-overlay" role="presentation">
      <div
        ref={ref}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <AlertTriangle size={28} className="confirm-icon" aria-hidden="true" />
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel}>Cancel</button>
          <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = React.useState({ open: false });
  const confirm = React.useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        ...options,
        onConfirm: () => { setState({ open: false }); resolve(true); },
        onCancel: () => { setState({ open: false }); resolve(false); },
      });
    });
  }, []);
  const Dialog = <ConfirmDialog {...state} />;
  return { confirm, Dialog };
}

export function useToast() {
  const [toast, setToast] = React.useState(null);
  const removeToast = React.useCallback(() => setToast(null), []);
  const swipeRef = useSwipeToDismiss(removeToast);
  const show = React.useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const ToastUI = toast ? (
    <div ref={swipeRef} className={`toast-strip ${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success' && <CheckCircle2 size={15} />}
      {toast.type === 'error' && <AlertTriangle size={15} />}
      {toast.type === 'warning' && <TriangleAlert size={15} />}
      {toast.message}
    </div>
  ) : null;
  return { show, ToastUI };
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
