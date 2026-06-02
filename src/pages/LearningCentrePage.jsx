import React, { useEffect, useState } from 'react';
import { Activity, ArrowLeft, BrainCircuit, Database, FileText, ScanLine, TriangleAlert } from 'lucide-react';
import { backendStatus } from '../lib/supabaseClient.js';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { Breadcrumb } from '../shared/uiPrimitives.jsx';
import {
  getLearningCentreFindings,
  getLearningCentreReport,
  getLearningCentreSetup,
  getLearningCentreStatus,
  runSafeLearningCentreTest,
  startLearningCentreRun,
  stopLearningCentreRun
} from '../services/learningCentreService.js';
import { formatDisplayDate } from '../utils/dateFormat.js';

function LearningCentrePage({ navigate, onBack, reportMode = false }) {
  const [status, setStatus] = useState({ run: null, cards: null, debug: null });
  const [findings, setFindings] = useState([]);
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState('');
  const [setupRequired, setSetupRequired] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let disposed = false;
    async function refresh() {
      const setupResult = await getLearningCentreSetup();
      if (disposed) return;
      const setup = setupResult.ok
        ? (setupResult.data.migration_applied ? null : normalizeLearningCentreSetupError(setupResult))
        : normalizeLearningCentreSetupError(setupResult);
      setSetupRequired(setup || null);
      if (setup) {
        setStatus({ run: null, cards: null, debug: null });
        setFindings([]);
        return;
      }

      const [statusResult, findingsResult] = await Promise.all([
        getLearningCentreStatus(),
        getLearningCentreFindings({ limit: 25 })
      ]);
      if (disposed) return;
      if (statusResult.ok) setStatus({ run: statusResult.data.run, cards: statusResult.data.cards, debug: statusResult.data.debug || null });
      if (findingsResult.ok) setFindings(findingsResult.data.findings || []);
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    async function loadReport() {
      if (!reportMode || !status.run?.id) return;
      const response = await getLearningCentreReport(status.run.id);
      if (!disposed && response.ok) setReport(response.data.report);
    }
    loadReport();
    return () => { disposed = true; };
  }, [reportMode, status.run?.id]);

  async function startRun() {
    const response = await startLearningCentreRun();
    const setup = !response.ok ? normalizeLearningCentreSetupError(response) : null;
    if (setup) setSetupRequired(setup);
    setNotice(response.ok ? 'Research ingestion run queued.' : setup?.message || response.error || response.data?.message || 'Start failed.');
  }

  async function stopRun() {
    const response = await stopLearningCentreRun();
    setNotice(response.ok ? 'Stop requested. Current worker job will drain gracefully.' : response.error || response.data?.message || 'Stop failed.');
  }

  async function runSafeTest() {
    setNotice('Running safe public-source research test...');
    const response = await runSafeLearningCentreTest();
    const setup = !response.ok ? normalizeLearningCentreSetupError(response) : null;
    if (setup) setSetupRequired(setup);
    if (response.ok) {
      setNotice(`Safe research test stored ${response.data.inserted?.length || 0} findings. No posting or fake analytics generated.`);
      setFindings(response.data.inserted || []);
      setStatus((current) => ({
        ...current,
        run: response.data.run || current.run,
        debug: response.data.debug || current.debug
      }));
      return;
    }
    setNotice(setup?.message || response.error || response.data?.message || 'Safe research test failed.');
  }

  const cards = status.cards || {};
  const run = status.run || {};
  const debug = status.debug || {};
  const latestErrors = debug.ingestion_errors || [];
  const health = cards.system_health || 'green';
  const setupBlockingActions = Boolean(setupRequired);
  const learningCentreBackendReady = backendStatus.mode === 'Connected' && !setupRequired;
  const learningCentreStatusMessage = setupRequired
    ? setupRequired.message
    : backendStatus.mode === 'Connected'
      ? 'Learning Centre backend connected.'
      : backendStatus.message;
  const cardRows = [
    ['Total Sources Scanned', cards.total_sources_scanned ?? 0],
    ['Knowledge Items Stored', cards.knowledge_items_stored ?? 0],
    ['Memory Embedded', cards.memory_embedded ?? 0],
    ['Active Research Threads', cards.active_research_threads ?? 0],
    ['Current Executive Focus', cards.current_executive_focus || 'Idle'],
    ['Runtime Remaining', formatRuntimeRemaining(cards.runtime_remaining_seconds)],
    ['Tokens Processed', cards.tokens_processed ?? 0],
    ['System Health', health.toUpperCase()]
  ];

  return (
    <ExportOSShell className="cmo-command-shell" liveDataConnected={learningCentreBackendReady} statusMessage={learningCentreStatusMessage}>
      <header className="deck-header">
        <div className="deck-header-copy">
          <span>Executive AI Command Centre</span>
          <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'Learning Centre' }]} />
          <h1>Learning Centre</h1>
          <p>Read-only public research ingestion for executive summaries, source-traced findings, and vector memory storage.</p>
        </div>
        <div className="deck-header-controls">
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} />Command Deck</button>
          <button className="ghost-button" onClick={() => navigate('/export-os/learning-centre')}>Live Stream</button>
          {run.status === 'completed' && <button className="tactical-button" onClick={() => navigate('/export-os/learning-centre/report')}>Intelligence Report</button>}
        </div>
      </header>

      <section className="coo-metric-grid">
        {cardRows.map(([label, value]) => (
          <article className="coo-metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {label === 'System Health' && <p title="Green means no warn/error logs in the last 15 minutes. Amber means warning logs. Red means error logs.">{health}</p>}
          </article>
        ))}
      </section>

      <section className="cmo-panel">
        <div className="approval-section-header">
          <div><span>Run Control</span><h2>{run.status || 'idle'}</h2></div>
          <BrainCircuit size={18} />
        </div>
        <div className="cmo-action-row">
          <button className="tactical-button" onClick={startRun} disabled={setupBlockingActions || run.status === 'running'}>{run.status === 'running' ? '12-hour run active' : 'Start 12-hour run'}</button>
          <button className="ghost-button" onClick={runSafeTest} disabled={setupBlockingActions || run.status === 'running'}>Run Safe Research Test</button>
          <button className="ghost-button" onClick={stopRun} disabled={setupBlockingActions || run.status !== 'running'} title="Emergency stop only. Normal runs continue for 12 hours.">Emergency stop</button>
          <span>Current phase: {run.current_phase || 'idle'}</span>
        </div>
        <div className="learning-run-window">
          <span>Start: {run.started_at ? formatDisplayDate(run.started_at) : 'Not started'}</span>
          <span>End: {run.ends_at ? formatDisplayDate(run.ends_at) : 'Not scheduled'}</span>
          <span>Cycle: every 15 minutes</span>
        </div>
        {notice && <p>{notice}</p>}
      </section>

      {setupRequired && (
        <section className="cmo-panel">
          <div className="approval-section-header">
            <div><span>Setup Required</span><h2>{setupRequired.status === 'server_env_missing' ? 'Server Supabase env missing' : 'Database migration not applied'}</h2></div>
            <TriangleAlert size={18} />
          </div>
          <p>{setupRequired.message}</p>
          <div className="learning-setup-grid">
            <span>Migration applied: {setupRequired.migration_applied ? 'true' : 'false'}</span>
            <span>Redis configured: {setupRequired.redis_configured ? 'true' : 'false'}</span>
            <span>Worker ready: {setupRequired.worker_ready ? 'true' : 'false'}</span>
          </div>
          {!!setupRequired.missing_tables?.length && <p>Missing tables: {setupRequired.missing_tables.join(', ')}</p>}
          <small>Apply: {setupRequired.migration}</small>
        </section>
      )}

      <section className="cmo-panel learning-debug-panel" aria-labelledby="learning-debug-title">
        <div className="approval-section-header">
          <div><span>Diagnostics</span><h2 id="learning-debug-title">Learning Centre debug</h2></div>
          <Activity size={18} />
        </div>
        <div className="learning-debug-grid">
          <div><span>Worker status</span><strong>{debug.worker_status || 'unknown'}</strong></div>
          <div><span>Last ingestion run</span><strong>{debug.last_ingestion_run?.created_at ? formatDisplayDate(debug.last_ingestion_run.created_at) : 'None recorded'}</strong></div>
          <div><span>Rows recorded</span><strong>{formatLearningRowsRecorded(debug.rows_recorded)}</strong></div>
          <div><span>Latest source URL</span><strong>{debug.latest_source_url ? <a href={debug.latest_source_url} target="_blank" rel="noreferrer">Open latest source</a> : 'None recorded'}</strong></div>
          <div><span>Latest platform</span><strong>{debug.latest_platform || 'None recorded'}</strong></div>
          <div><span>Next scheduled run</span><strong>{debug.next_scheduled_run || 'Not scheduled'}</strong></div>
        </div>
        <div className="learning-debug-errors">
          <span>Ingestion errors</span>
          {latestErrors.length ? latestErrors.map((error, index) => (
            <p key={`${error.created_at || 'error'}-${index}`}>{formatDisplayDate(error.created_at)} - {error.step || error.level || 'error'}: {error.message}</p>
          )) : <p>No ingestion errors recorded.</p>}
        </div>
        {!!debug.table_status?.length && (
          <div className="learning-debug-table-status">
            {debug.table_status.map((item) => (
              <span key={item.table} className={item.exists ? 'ok' : 'missing'}>
                {item.table}: {item.exists ? `${item.rows} rows` : item.error || 'missing'}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="cmo-panel">
        <div className="approval-section-header">
          <div><span>Current Activity</span><h2>What is being researched now</h2></div>
          <ScanLine size={18} />
        </div>
        <div className="learning-current-activity">
          <div><span>Department</span><strong>{run.current_role || 'Idle'}</strong></div>
          <div><span>Action</span><strong>{formatLearningPhase(run.current_phase)}</strong></div>
          <div><span>Source</span><strong>{findings[0]?.source_domain || (findings[0]?.source_url ? 'Public web source' : 'Waiting for first source')}</strong></div>
        </div>
      </section>

      {reportMode ? (
        <section className="cmo-panel">
          <div className="approval-section-header">
            <div><span>Completed Run</span><h2>Intelligence Report</h2></div>
            <FileText size={18} />
          </div>
          {report?.report_markdown ? <pre className="learning-report-output">{report.report_markdown}</pre> : <p>Report is available after a run completes.</p>}
        </section>
      ) : (
        <section className="cmo-panel">
          <div className="approval-section-header">
            <div><span>Live Stream</span><h2>Research Findings</h2></div>
            <Database size={18} />
          </div>
          <div className="cmo-data-table learning-centre-table">
            <div className="cmo-data-table-head">
              {['Timestamp', 'Role', 'Topic', 'Summary', 'Source Type', 'Source Link', 'Confidence Score', 'Status', 'Memory Saved', 'Tokens'].map((item) => <span key={item}>{item}</span>)}
            </div>
            {findings.map((finding) => {
              const isExpanded = expanded[finding.id];
              return (
                <div key={finding.id}>
                  <span>{formatDisplayDate(finding.created_at)}</span>
                  <strong>{finding.role}</strong>
                  <span>{finding.topic}</span>
                  <button className="link-button" onClick={() => setExpanded((current) => ({ ...current, [finding.id]: !isExpanded }))}>
                    {isExpanded ? finding.learning_summary : truncateText(finding.learning_summary, 120)}
                  </button>
                  <span>{finding.source_type || 'web'}</span>
                  <span>{finding.source_url ? <a href={finding.source_url} target="_blank" rel="noreferrer">Open source</a> : 'Source unavailable.'}</span>
                  <span title="Model self-assessment only. This is not a verified truth score.">{Number(finding.confidence_score || 0).toFixed(2)}</span>
                  <span>{finding.status}</span>
                  <span>{finding.memory_saved ? 'Done' : 'No'}</span>
                  <span>{finding.tokens_processed || 0}</span>
                </div>
              );
            })}
            {!findings.length && <p>No research findings stored yet.</p>}
          </div>
        </section>
      )}

      <section className="cmo-panel">
        <div className="approval-section-header">
          <div><span>Bottom Activity Log</span><h2>Department, action, source</h2></div>
          <Activity size={18} />
        </div>
        <div className="learning-bottom-log">
          {findings.slice(0, 10).map((finding) => (
            <article key={`activity-${finding.id}`}>
              <span>{formatDisplayDate(finding.created_at)}</span>
              <strong>{finding.role} / {finding.topic}</strong>
              <p>{truncateText(finding.learning_summary, 150)}</p>
              <a href={finding.source_url || undefined} target="_blank" rel="noreferrer">{finding.source_url || 'Source unavailable.'}</a>
            </article>
          ))}
          {!findings.length && <p>Once the first cycle stores a finding, this area will show the department, action, and source.</p>}
        </div>
      </section>
    </ExportOSShell>
  );
}

function formatRuntimeRemaining(seconds) {
  const value = Number(seconds || 0);
  if (value <= 0) return '0h 0m';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatLearningRowsRecorded(rows = {}) {
  if (!rows || typeof rows !== 'object') return 'None';
  const entries = Object.entries(rows).filter(([, value]) => Number(value || 0) > 0);
  if (!entries.length) return '0 rows';
  return entries.map(([table, value]) => `${table}: ${value}`).join(' / ');
}

function truncateText(value = '', max = 120) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatLearningPhase(phase = '') {
  const value = String(phase || '').replace(/_/g, ' ');
  if (!value || value === 'idle') return 'Waiting for run';
  if (value === 'queued') return 'Queued for next research cycle';
  if (value === 'searching') return 'Searching public sources';
  if (value === 'waiting next cycle') return 'Waiting for next 15-minute cycle';
  if (value === 'completed') return 'Run completed';
  if (value === 'stopped') return 'Stopped by operator';
  return value;
}

function normalizeLearningCentreSetupError(response) {
  const message = response?.error || response?.data?.message || '';
  if (response?.data?.status === 'server_env_missing' || String(message).includes('Supabase server env is missing')) {
    return {
      status: 'server_env_missing',
      message: 'Supabase server env is missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the server/deployment environment.',
      migration: response?.data?.migration || 'supabase/migrations/20260528131644_cmo_learning_centre_research_schema.sql',
      migration_applied: Boolean(response?.data?.migration_applied),
      missing_tables: response?.data?.missing_tables || [],
      redis_configured: Boolean(response?.data?.redis_configured),
      worker_ready: false
    };
  }
  if (response?.data?.status === 'database_setup_required' || response?.data?.migration_applied === false || String(message).includes('research_ingestion_runs') || String(message).includes('schema cache')) {
    return {
      status: 'database_setup_required',
      message: 'Learning Centre tables missing. Apply Supabase SQL migration.',
      migration: response?.data?.migration || 'supabase/migrations/20260528131644_cmo_learning_centre_research_schema.sql',
      migration_applied: Boolean(response?.data?.migration_applied),
      missing_tables: response?.data?.missing_tables || [],
      redis_configured: Boolean(response?.data?.redis_configured),
      worker_ready: Boolean(response?.data?.worker_ready)
    };
  }
  return null;
}


export default LearningCentrePage;
