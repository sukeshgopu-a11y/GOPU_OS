import React, { Fragment } from 'react';
import { Bookmark, CheckCircle2, Search, UploadCloud, X } from 'lucide-react';

export const Breadcrumb = React.memo(function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick}>{item.label}</button>
          ) : (
            <span className={index === items.length - 1 ? 'breadcrumb-current' : ''}>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
});

export const EmptyState = React.memo(function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state" role="status">
      {Icon && <Icon size={36} aria-hidden="true" />}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <button className="ghost-button" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
});

export const StatusBadge = React.memo(function StatusBadge({ status, size = 'md', label, state }) {
  const displayStatus = status || label || 'Draft';
  const map = {
    'Active':           { color: '#3ddc84', bg: 'rgba(61,220,132,0.1)',  border: 'rgba(61,220,132,0.3)'  },
    'Completed':        { color: '#3ddc84', bg: 'rgba(61,220,132,0.1)',  border: 'rgba(61,220,132,0.3)'  },
    'Done':             { color: '#3ddc84', bg: 'rgba(61,220,132,0.1)',  border: 'rgba(61,220,132,0.3)'  },
    'Approved':         { color: '#3ddc84', bg: 'rgba(61,220,132,0.1)',  border: 'rgba(61,220,132,0.3)'  },
    'Pending':          { color: '#ffb547', bg: 'rgba(255,181,71,0.1)',  border: 'rgba(255,181,71,0.3)'  },
    'Pending Approval': { color: '#ffb547', bg: 'rgba(255,181,71,0.1)',  border: 'rgba(255,181,71,0.3)'  },
    'In Progress':      { color: '#5b8cff', bg: 'rgba(91,140,255,0.1)', border: 'rgba(91,140,255,0.3)' },
    'Needs Review':     { color: '#5b8cff', bg: 'rgba(91,140,255,0.1)', border: 'rgba(91,140,255,0.3)' },
    'Blocked':          { color: '#ff5a5a', bg: 'rgba(255,90,90,0.1)',  border: 'rgba(255,90,90,0.3)'  },
    'Rejected':         { color: '#ff5a5a', bg: 'rgba(255,90,90,0.1)',  border: 'rgba(255,90,90,0.3)'  },
    'Overdue':          { color: '#ff5a5a', bg: 'rgba(255,90,90,0.1)',  border: 'rgba(255,90,90,0.3)'  },
    'Draft':            { color: '#aab6c5', bg: 'rgba(170,182,197,0.1)', border: 'rgba(170,182,197,0.2)' },
  };
  const stateMap = {
    online: map.Active,
    success: map.Active,
    progress: map['In Progress'],
    attention: map.Pending,
    warning: map.Pending,
    error: map.Blocked,
    idle: map.Draft
  };
  const normalizedStatus = String(displayStatus).replace(/_/g, ' ');
  const titleStatus = normalizedStatus.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const style = map[displayStatus] || map[titleStatus] || stateMap[state] || map.Draft;
  return (
    <span
      className={`status-badge state-${state || 'unified'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 7px' : '4px 10px',
        fontSize: size === 'sm' ? '0.68rem' : '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderRadius: '4px',
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {displayStatus}
    </span>
  );
});

export const TrendIndicator = React.memo(function TrendIndicator({ value, suffix = '%', invert = false }) {
  if (value === null || value === undefined) return null;
  const numericValue = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(numericValue)) return <span className="trend-indicator neutral">{value}</span>;
  const positive = invert ? numericValue < 0 : numericValue > 0;
  const neutral = numericValue === 0;
  const color = neutral ? 'var(--muted)' : positive ? '#3ddc84' : '#ff5a5a';
  const arrow = neutral ? 'to' : positive ? 'Up' : 'Down';
  const displaySuffix = typeof value === 'string' && /[%a-zA-Z]/.test(value) ? '' : suffix;
  return (
    <span style={{ color, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {arrow} {Math.abs(numericValue)}{displaySuffix}
    </span>
  );
});

export function SkeletonBlock({ width = '100%', height = '16px', radius = 'var(--radius-sm)', className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3, showAvatar = false }) {
  return (
    <div className="skeleton-card" aria-busy="true" aria-label="Loading content">
      {showAvatar && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <SkeletonBlock width="40px" height="40px" radius="50%" />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="60%" height="14px" />
            <SkeletonBlock width="40%" height="11px" style={{ marginTop: 6 }} />
          </div>
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === rows - 1 ? '65%' : '100%'}
          height="13px"
          className="skeleton-row"
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ cols = 4, rows = 5 }) {
  return (
    <div className="skeleton-table" role="status" aria-label="Loading table data" style={{ '--skeleton-cols': cols }}>
      <div className="skeleton-table-row skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height="12px" width={i === 0 ? '40%' : '70%'} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} height="13px" width={c === 0 ? '55%' : c === cols - 1 ? '30%' : '80%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpiBar({ count = 6 }) {
  return (
    <div className="skeleton-kpi-bar" role="status" aria-label="Loading KPIs">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-kpi-item">
          <SkeletonBlock width="70%" height="10px" />
          <SkeletonBlock width="50%" height="20px" />
          <SkeletonBlock width="40%" height="9px" />
        </div>
      ))}
    </div>
  );
}

export function MetricSkeletonGrid() {
  return (
    <div className="metric-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="metric-panel" style={{ gap: 8 }}>
          <div className="skeleton skeleton-text w-1/2" />
          <div className="skeleton skeleton-text w-full" style={{ height: '2em' }} />
          <div className="skeleton skeleton-text w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function HBarChart({ rows = [], colorFn }) {
  const maxVal = Math.max(...rows.map((r) => r.value || 0), 1);
  const defaultColor = (pct) =>
    pct > 75 ? 'var(--error)' : pct > 50 ? 'var(--warning)' : 'var(--cyan)';
  return (
    <div className="hbar-chart" role="list">
      {rows.map((row, i) => {
        const pct = Math.min(100, (row.value / maxVal) * 100);
        const color = colorFn ? colorFn(pct, row) : defaultColor(pct);
        return (
          <div key={i} className="hbar-row" role="listitem">
            <span className="hbar-label">{row.label}</span>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="hbar-value">{row.display ?? row.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function useSortable(data, defaultKey = null) {
  const [sortKey, setSortKey] = React.useState(defaultKey);
  const [sortDir, setSortDir] = React.useState('asc');

  const sorted = React.useMemo(() => {
    if (!sortKey || !data?.length) return data || [];
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  function toggle(key) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  return { sorted, sortKey, sortDir, toggle };
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useFilterState(storageKey, defaults = {}) {
  const [filters, setFilters] = React.useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  function updateFilter(key, value) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearAll() {
    setFilters(defaults);
    try { localStorage.removeItem(storageKey); } catch {}
  }

  const activeCount = Object.entries(filters).filter(([key, value]) => {
    const defaultValue = defaults[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== defaultValue && value !== '' && value !== null && value !== undefined;
  }).length;

  return { filters, updateFilter, clearAll, activeCount };
}

export function FilterBar({
  storageKey = 'gopuos_filters',
  searchPlaceholder = 'Search...',
  statusOptions = [],
  divisionOptions = [],
  priorityOptions = [],
  onFilterChange,
}) {
  const defaults = { search: '', status: [], division: [], priority: [], dateFrom: '', dateTo: '' };
  const { filters, updateFilter, clearAll, activeCount } = useFilterState(storageKey, defaults);
  const [presetsOpen, setPresetsOpen] = React.useState(false);
  const [presets, setPresets] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(`${storageKey}_presets`) || '[]'); } catch { return []; }
  });
  const [presetName, setPresetName] = React.useState('');
  const debouncedSearch = useDebounce(filters.search, 250);

  React.useEffect(() => {
    onFilterChange?.({ ...filters, search: debouncedSearch });
  }, [filters.status, filters.division, filters.priority, filters.dateFrom, filters.dateTo, debouncedSearch]);

  function toggleChip(key, value) {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateFilter(key, next);
  }

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets, { name: presetName.trim(), filters }];
    setPresets(next);
    try { localStorage.setItem(`${storageKey}_presets`, JSON.stringify(next)); } catch {}
    setPresetName('');
    setPresetsOpen(false);
  }

  function applyPreset(preset) {
    Object.entries(preset.filters).forEach(([key, value]) => updateFilter(key, value));
    setPresetsOpen(false);
  }

  function deletePreset(index) {
    const next = presets.filter((_, itemIndex) => itemIndex !== index);
    setPresets(next);
    try { localStorage.setItem(`${storageKey}_presets`, JSON.stringify(next)); } catch {}
  }

  function ChipGroup({ label, options, filterKey }) {
    if (!options.length) return null;
    return (
      <div className="filter-chip-group">
        <span className="filter-chip-label">{label}</span>
        <div className="filter-chips">
          {options.map((option) => {
            const active = (filters[filterKey] || []).includes(option.value);
            return (
              <button
                key={option.value}
                className={`filter-chip ${active ? 'active' : ''}`}
                onClick={() => toggleChip(filterKey, option.value)}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="filter-bar" role="search" aria-label="Filter controls">
      <div className="filter-bar-row">
        <div className="filter-search-wrap">
          <Search size={15} aria-hidden="true" />
          <input
            className="filter-search-input"
            type="search"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>

        <div className="filter-date-range">
          <label className="filter-date-label" htmlFor={`${storageKey}-date-from`}>From</label>
          <input
            id={`${storageKey}-date-from`}
            className="filter-date-input"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            aria-label="Filter from date"
          />
          <span className="filter-date-sep">-</span>
          <input
            className="filter-date-input"
            type="date"
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            aria-label="Filter to date"
          />
        </div>

        <div className="filter-bar-actions">
          <div className="filter-presets-wrap">
            <button
              className="btn btn-ghost btn-sm filter-preset-btn"
              onClick={() => setPresetsOpen((current) => !current)}
              aria-expanded={presetsOpen}
              aria-haspopup="true"
            >
              <Bookmark size={14} />
              Presets
              {presets.length > 0 && <span className="filter-preset-count">{presets.length}</span>}
            </button>
            {presetsOpen && (
              <div className="filter-presets-panel" role="dialog" aria-label="Filter presets">
                {presets.length > 0 && (
                  <ul className="filter-presets-list">
                    {presets.map((preset, index) => (
                      <li key={`${preset.name}-${index}`} className="filter-preset-item">
                        <button className="filter-preset-apply" onClick={() => applyPreset(preset)}>{preset.name}</button>
                        <button
                          className="filter-preset-delete"
                          onClick={() => deletePreset(index)}
                          aria-label={`Delete preset ${preset.name}`}
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                    <li className="filter-presets-divider" />
                  </ul>
                )}
                <div className="filter-preset-save">
                  <input
                    className="filter-preset-name-input"
                    type="text"
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && savePreset()}
                    aria-label="New preset name"
                  />
                  <button className="btn btn-primary btn-sm" onClick={savePreset}>Save</button>
                </div>
              </div>
            )}
          </div>

          {activeCount > 0 && (
            <button className="btn btn-ghost btn-sm filter-clear-btn" onClick={clearAll}>
              <X size={14} />
              Clear
              <span className="filter-active-badge">{activeCount}</span>
            </button>
          )}
        </div>
      </div>

      {(statusOptions.length > 0 || divisionOptions.length > 0 || priorityOptions.length > 0) && (
        <div className="filter-bar-chips-row">
          <ChipGroup label="Status" options={statusOptions} filterKey="status" />
          <ChipGroup label="Division" options={divisionOptions} filterKey="division" />
          <ChipGroup label="Priority" options={priorityOptions} filterKey="priority" />
        </div>
      )}
    </div>
  );
}

export function VirtualList({
  items = [],
  itemHeight = 56,
  overscan = 3,
  renderItem,
  getItemKey,
  className = ''
}) {
  const containerRef = React.useRef(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(400);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    setContainerHeight(el.clientHeight || 400);

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const safeItems = Array.isArray(items) ? items : [];
  const totalHeight = safeItems.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    safeItems.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i += 1) {
    const item = safeItems[i];
    if (item === undefined) continue;

    visibleItems.push(
      <div
        key={getItemKey ? getItemKey(item, i) : item?.id ?? i}
        style={{ position: 'absolute', top: i * itemHeight, left: 0, right: 0, height: itemHeight }}
      >
        {renderItem(item, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`.trim()}
      style={{ overflowY: 'auto', position: 'relative' }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

export function SortableTableHeader({ columns, sortKey, sortDir, onSort, allSelected, someSelected, onToggleAll, selectable = true }) {
  return (
    <div className="stable-header" role="row">
      {selectable && (
        <div className="stable-cell stable-check" role="columnheader">
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={onToggleAll}
          />
        </div>
      )}
      {columns.map((col) => (
        <div
          key={col.key}
          className={`stable-cell stable-th ${col.sortable !== false ? 'sortable' : ''} ${sortKey === col.key ? 'sorted' : ''}`}
          role="columnheader"
          aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
          style={{ flex: col.flex || 1, minWidth: col.minWidth || 80 }}
          onClick={() => col.sortable !== false && onSort(col.key)}
        >
          <span>{col.label}</span>
          {col.sortable !== false && (
            <span className="sort-icon" aria-hidden="true">
              {sortKey === col.key ? (sortDir === 'asc' ? 'Up' : 'Down') : '-'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function BulkActionBar({ count, actions, onClear, onExport }) {
  if (count === 0) return null;
  return (
    <div className="bulk-bar" role="toolbar" aria-label={`${count} rows selected`}>
      <span className="bulk-count">
        <CheckCircle2 size={14} aria-hidden="true" />
        {count} selected
      </span>
      <div className="bulk-actions">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`ghost-button ${action.cls || ''}`}
            onClick={action.onClick}
            aria-label={action.label}
          >
            {action.icon && <action.icon size={13} aria-hidden="true" />}
            {action.label}
          </button>
        ))}
        {onExport && (
          <button className="ghost-button" onClick={onExport} aria-label="Export selected to CSV">
            <UploadCloud size={13} aria-hidden="true" />
            Export CSV
          </button>
        )}
      </div>
      <button className="bulk-clear" onClick={onClear} aria-label="Clear selection">
        - Clear
      </button>
    </div>
  );
}

export function StatusPulse() {
  return <span className="live-pulse" aria-hidden="true" />;
}

export function PriorityBadge({ priority }) {
  return <span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span>;
}

export function SeverityBadge({ severity }) {
  return <span className={`severity-badge severity-${String(severity).toLowerCase()}`}>{severity}</span>;
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        <span>{action}</span>
      </div>
      {children}
    </section>
  );
}

export function StatusPill({ icon: Icon, label, tone }) {
  return (
    <div className={`status-pill tone-${tone}`}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}

export function StateChip({ label }) {
  return <span className="state-chip">{label}</span>;
}

export function SignalList({ items }) {
  return (
    <div className="signal-list">
      {items.map((item) => (
        <div className="signal-row" key={item}>
          <i />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniBars({ values }) {
  return (
    <div className="mini-bars" aria-label="Analytics bar chart">
      {values.map((value, index) => <i key={`${value}-${index}`} style={{ '--height': `${value}%`, '--delay': `${index * 60}ms` }} />)}
    </div>
  );
}
