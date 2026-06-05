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
import { ctoLabels } from '../../GOPU_OS/cto/labels.js';
import { createPaymentRequirement, generateFounderTechnicalSummary, getCTODashboard, getIncidents, getLiveIntegrationStatus, getSubscriptionWatch, getSystemHealthSummary } from '../services/ctoService.js';
import { getPaymentVaultRenewals } from '../services/renewalService.js';
import { ExportOSShell, ExecSuiteBar } from '../shared/routeShell.jsx';
import { Breadcrumb, StatusBadge, TrendIndicator, EmptyState, SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonKpiBar, MetricSkeletonGrid, HBarChart, SortableTableHeader, StatusPulse, PriorityBadge, SeverityBadge, Panel, StatusPill, StateChip, SignalList, MiniBars, BulkActionBar, FilterBar, VirtualList, useSortable } from '../shared/uiPrimitives.jsx';
import { ctoDefaultLoginEmail } from '../config/defaultLogins.js';

const integrationServicesSeed = [];
const integrationAuditSeed = [];
const integrationModels = ['integration_services', 'integration_audit_logs', 'integration_health'];
const CTO_FAST_VERIFICATION_TIMEOUT_MS = 12000;

function maskSecretPreview(value = '') {
  const compact = String(value).trim().replace(/\s+/g, '');
  if (!compact) return '****';
  const prefix = compact.slice(0, Math.min(compact.indexOf('-') > 0 ? compact.indexOf('-') + 1 : 4, 8));
  const suffix = compact.slice(-4).toUpperCase();
  return `${prefix}****${suffix}`;
}

function readCtoSavedSecrets() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('ctoIntegrationSecrets') || '{}');
    return Object.fromEntries(
      Object.entries(saved).filter(([, value]) => !String(value?.apiKey || '').startsWith('sk-test-'))
    );
  } catch {
    return {};
  }
}

function cleanCtoLabel(value = '') {
  const text = String(value || '').trim();
  if (!text || text === 'N/A') return 'Awaiting integration';
  if (/Connect Supabase to activate/i.test(text)) return 'Awaiting Connection';
  if (/monitoring/i.test(text)) return 'Connected';
  if (/local/i.test(text)) return text.replace(/local/gi, 'preview').trim();
  return text;
}

function normalizeConnectionState(status = '') {
  const text = cleanCtoLabel(status);
  if (['Connected', 'Live Connected', 'Healthy', 'Online', 'Verification Success', 'Active', 'Passed'].includes(text)) return 'Connected';
  if (['Disabled', 'Not active'].includes(text)) return 'Disabled';
  if (['Invalid Key', 'Expired', 'Quota Exceeded', 'Failed', 'Error', 'Critical', 'Failure Detected', 'Degraded'].includes(text)) return 'Failure Detected';
  if (['Verification Pending', 'Pending', 'Review', 'Review Required'].includes(text)) return 'Verification Pending';
  if (['Manual Setup Required', 'Backend Verification Required'].includes(text)) return text;
  if (['Verification Running', 'Sync Delayed', 'Retry Pending', 'Attention', 'Risk', 'Risk Detected', 'Credits Low', 'Waiting Approval'].includes(text)) return 'Sync Delayed';
  if (['Awaiting Connection', 'Awaiting integration'].includes(text)) return 'Awaiting Connection';
  return text;
}

function connectionAction(status = '') {
  if (status === 'Connected') return 'Open details';
  if (status === 'Disabled') return 'Enable when required';
  if (status === 'Failure Detected') return 'Verify credentials';
  if (status === 'Sync Delayed') return 'Check sync';
  if (status === 'Manual Setup Required') return 'Open provider setup';
  if (status === 'Backend Verification Required') return 'Verify from backend';
  if (status === 'Verification Pending') return 'Verify connection';
  return 'Connect';
}

function getLocalIntegrationState(service, liveConnected, savedSecrets = {}) {
  if (service.id === 'openai' && service.providerStatus) {
    const providerStatus = service.providerStatus;
    const status = providerStatus.status === 'live'
      ? 'Connected'
      : providerStatus.status === 'pending'
        ? 'Verification Pending'
        : 'Failure Detected';
    return {
      status,
      lastCheck: cleanCtoLabel(providerStatus.last_success_at || providerStatus.last_checked_at || 'No recent sync'),
      action: status === 'Connected' ? 'Live' : status === 'Verification Pending' ? 'Checking now' : 'Fix key',
      detail: status === 'Connected'
        ? 'OpenAI live: CTO provider connection active.'
        : providerStatus.error_message || 'API request failed'
    };
  }

  const liveSupabaseVerified = service.id === 'supabase' && (liveConnected || service.status === 'Live Connected');
  if (liveSupabaseVerified) {
    return {
      status: 'Connected',
      lastCheck: cleanCtoLabel(service.last_verified || 'Live query verified'),
      action: 'Live',
      detail: service.connection_message || service.quota_remaining || 'Supabase Data API verified.'
    };
  }

  const saved = savedSecrets[service.id];
  const serviceStatus = normalizeConnectionState(service.status);
  if (saved?.verificationStatus === 'Disabled') {
    return {
      status: 'Disabled',
      lastCheck: saved.savedAt || 'Saved locally',
      action: 'Verify connection',
      detail: saved.verificationMessage || 'Integration disabled locally.'
    };
  }
  if (serviceStatus === 'Connected') {
    return {
      status: 'Connected',
      lastCheck: cleanCtoLabel(service.last_verified || saved?.savedAt || 'Live verification confirmed'),
      action: 'Live',
      detail: service.connection_message || service.quota_remaining || saved?.verificationMessage || 'Integration is connected.'
    };
  }
  if (saved) {
    const status = saved.verificationStatus || 'Verification Pending';
    return {
      status,
      lastCheck: saved.savedAt || 'Saved locally',
      action: status === 'Connected' ? 'Live' : status === 'Failure Detected' ? 'Fix key' : status === 'Verification Running' ? 'Testing now' : 'Verify connection',
      detail: saved.verificationMessage || 'Saved locally. Backend verification pending.'
    };
  }
  const status = normalizeConnectionState(liveConnected ? service.status : 'Awaiting Connection');
  return {
    status,
    lastCheck: liveConnected ? cleanCtoLabel(service.last_verified || 'No recent sync') : 'No recent sync',
    action: connectionAction(status),
    detail: service.quota_remaining || 'Awaiting integration'
  };
}

function extractApiMessage(bodyText = '') {
  try {
    const parsed = JSON.parse(bodyText);
    return parsed?.error?.message || parsed?.message || parsed?.name || bodyText.slice(0, 160);
  } catch {
    return bodyText.slice(0, 160);
  }
}

async function fastVerificationFetch(url, options = {}, timeoutMs = CTO_FAST_VERIFICATION_TIMEOUT_MS) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      signal: controller.signal
    });
    const bodyText = await response.text().catch(() => '');
    return {
      response,
      bodyText,
      elapsedMs: Date.now() - startedAt
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function verifyOpenAIKey(apiKey) {
  const { response, bodyText, elapsedMs } = await fastVerificationFetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (response.ok) {
    return { status: 'Connected', message: `OpenAI key verified in ${elapsedMs} ms. Live API response received.` };
  }
  if (response.status === 401) return { status: 'Failure Detected', message: 'OpenAI rejected the key. Check that the API key is correct and active.' };
  if (response.status === 429) return { status: 'Sync Delayed', message: 'OpenAI reached, but returned quota/rate-limit response. Retry after checking usage limits.' };
  return { status: 'Failure Detected', message: `OpenAI verification failed with HTTP ${response.status}: ${extractApiMessage(bodyText) || 'no response message'}.` };
}

async function verifyResendKey(apiKey) {
  if (!apiKey.startsWith('re_')) {
    return { status: 'Failure Detected', message: 'Resend API key format looks wrong. Resend keys normally start with re_.' };
  }

  const { response, bodyText, elapsedMs } = await fastVerificationFetch('https://api.resend.com/domains', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });

  if (response.ok) {
    return { status: 'Connected', message: `Resend key verified in ${elapsedMs} ms through the domains API. Email sending remains approval-gated.` };
  }
  if (response.status === 401 || response.status === 403) {
    return { status: 'Failure Detected', message: `Resend rejected the key or permission scope (${response.status}). ${extractApiMessage(bodyText) || 'Check API key and domain access.'}` };
  }
  if (response.status === 429) {
    return { status: 'Sync Delayed', message: 'Resend reached, but returned a rate-limit response. Retry after quota/rate-limit check.' };
  }
  return { status: 'Failure Detected', message: `Resend verification failed with HTTP ${response.status}: ${extractApiMessage(bodyText) || 'no response message'}.` };
}

async function verifyIntegrationSecret(serviceId, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    return { status: 'Failure Detected', message: 'API key is missing.' };
  }
  if (trimmedKey.length < 12) {
    return { status: 'Failure Detected', message: 'API key is too short to verify.' };
  }

  try {
    if (serviceId === 'openai') return await verifyOpenAIKey(trimmedKey);
    if (serviceId === 'resend') return await verifyResendKey(trimmedKey);
    if (serviceId === 'supabase') {
      return {
        status: 'Backend Verification Required',
        message: 'Supabase is verified from the CTO Final Check using env configuration, project URL, RLS, and Data API query. Do not verify service-role keys in the browser.'
      };
    }
    if (serviceId === 'vercel') {
      return {
        status: 'Backend Verification Required',
        message: 'Vercel is verified from /api/integrations/vercel/status using server-side VERCEL_TOKEN or Vercel runtime variables. Do not paste Vercel tokens into the browser.'
      };
    }

    const provider = ctoProviderCatalog[serviceId] || {};
    const account = provider.loginAccount || ctoDefaultLoginEmail;
    const setupType = provider.loginAccount ? 'OAuth/login' : 'backend API verifier';
    return {
      status: 'Manual Setup Required',
      message: `Fast check completed. ${ctoServiceNameFor(serviceId)} requires ${setupType}; use ${account} where login is required, then verify from a backend connector. No browser request was held open.`
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { status: 'Failure Detected', message: `Verification timed out after ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds. CTO stopped the request before 30 seconds.` };
    }
    return { status: 'Failure Detected', message: `Verification failed fast: ${error?.message || 'network request blocked by browser/CORS'}.` };
  }
}

async function saveCtoProviderEnvValue(serviceId, apiKey) {
  if (!ctoEnvTargetMap[serviceId]) {
    return { ok: false, status: 'unsupported_provider', message: 'No server env mapping exists for this provider.' };
  }
  try {
    const response = await fetch('/api/cto/provider-env/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, value: apiKey })
    });
    return await response.json();
  } catch {
    return { ok: false, status: 'api_unavailable', message: `Add ${ctoEnvTargetMap[serviceId]} to .env.local or Vercel env.` };
  }
}

function IntegrationsVault({ onBack, navigate }) {
  const [savedSecrets, setSavedSecrets] = useState(() => readCtoSavedSecrets());
  const [serviceOverrides, setServiceOverrides] = useState({});
  const [providerStatuses, setProviderStatuses] = useState({});
  const [audit, setAudit] = useState(integrationAuditSeed);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('openai');
  const services = useMemo(() => buildIntegrationVaultServices(savedSecrets, serviceOverrides, providerStatuses), [savedSecrets, serviceOverrides, providerStatuses]);

  useEffect(() => {
    let active = true;
    setProviderStatuses((current) => ({
      ...current,
      openai: current.openai || {
        provider_key: 'openai',
        status: 'pending',
        source: 'cto_provider_vault',
        last_checked_at: null,
        error_message: null,
        validated: false
      }
    }));
    fetch('/api/integrations/openai/status', { method: 'GET' })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        setProviderStatuses((current) => ({ ...current, openai: result }));
      })
      .catch(() => {
        if (!active) return;
        setProviderStatuses((current) => ({
          ...current,
          openai: {
            provider_key: 'openai',
            platform_key: 'openai',
            platform_name: 'OpenAI',
            status: 'error',
            source: 'cto_provider_vault',
            last_checked_at: new Date().toISOString(),
            error_message: 'API request failed',
            validated: false
          }
        }));
      });
    return () => { active = false; };
  }, []);

  function logAction(serviceId, action, status, environment) {
    const service = services.find((item) => item.id === serviceId);
    setAudit((current) => [{
      id: `int-audit-${Date.now()}`,
      actor: 'Founder/Admin',
      action,
      environment: environment || service?.environment || 'Production',
      status,
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }, ...current]);
  }

  function updateService(serviceId, patch, action, status) {
    setServiceOverrides((current) => ({ ...current, [serviceId]: { ...(current[serviceId] || {}), ...patch } }));
    logAction(serviceId, action, status, patch.environment);
  }

  function handleAction(service, action) {
    if (action === 'Add Key' || action === 'Replace Key' || action === 'Rotate Key') {
      setSelectedServiceId(service.id);
      setModalOpen(true);
      return;
    }
    if (action === 'Verify Connection') {
      verifySavedVaultService(service);
      return;
    }
    if (action === 'Disable Integration') {
      const disabledSecrets = {
        ...savedSecrets,
        [service.id]: {
          ...(savedSecrets[service.id] || {}),
          serviceName: service.service_name,
          apiKey: savedSecrets[service.id]?.apiKey || '',
          maskedKey: savedSecrets[service.id]?.maskedKey || service.masked_key,
          savedAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          verificationStatus: 'Disabled',
          verificationMessage: `${ctoLabels.integrationsVaultTitle} disabled this integration.`
        }
      };
      setSavedSecrets(disabledSecrets);
      window.localStorage.setItem('ctoIntegrationSecrets', JSON.stringify(disabledSecrets));
      updateService(service.id, { status: 'Disabled', health_status: 'Disabled', usage_percentage: 0 }, 'integration disabled', 'Disabled');
      return;
    }
    logAction(service.id, action.toLowerCase(), 'Monitoring', service.environment);
  }

  async function verifySavedVaultService(service) {
    const saved = savedSecrets[service.id];
    if (!saved?.apiKey) {
      updateService(service.id, { status: 'Verification Pending', health_status: 'Monitoring' }, 'verification requested', 'No saved key');
      return;
    }
    updateService(service.id, { status: 'Verification Running', health_status: 'Monitoring' }, 'verification started', 'Verification Running');
    const result = await verifyIntegrationSecret(service.id, saved.apiKey);
    const savedAt = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const nextSecrets = {
      ...savedSecrets,
      [service.id]: {
        ...saved,
        savedAt,
        verificationStatus: result.status,
        verificationMessage: result.message
      }
    };
    setSavedSecrets(nextSecrets);
    window.localStorage.setItem('ctoIntegrationSecrets', JSON.stringify(nextSecrets));
    updateService(service.id, {
      status: result.status,
      health_status: result.status === 'Connected' ? 'Healthy' : 'Monitoring',
      last_verified: savedAt
    }, 'connection verified', result.status);
  }

  async function saveIntegration({ serviceId, serviceName, apiKey, environment, maskedKey, verificationResult }) {
    const savedAt = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const pendingSecret = {
      serviceName,
      apiKey,
      environment,
      maskedKey,
      savedAt,
      verificationStatus: 'Verification Running',
      verificationMessage: `Testing connection for up to ${CTO_FAST_VERIFICATION_TIMEOUT_MS / 1000} seconds.`
    };
    const pendingSecrets = { ...savedSecrets, [serviceId]: pendingSecret };
    setSavedSecrets(pendingSecrets);
    window.localStorage.setItem('ctoIntegrationSecrets', JSON.stringify(pendingSecrets));
    updateService(serviceId, {
      environment,
      masked_key: maskedKey,
      status: 'Verification Running',
      health_status: 'Monitoring',
      last_verified: savedAt
    }, 'integration added', 'Verification Running');
    setModalOpen(false);
    const envSave = await saveCtoProviderEnvValue(serviceId, apiKey);

    const preverified = verificationResult?.maskedKey === maskSecretPreview(apiKey);
    const result = preverified ? verificationResult : await verifyIntegrationSecret(serviceId, apiKey);
    const verifiedAt = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const verifiedSecrets = {
      ...pendingSecrets,
      [serviceId]: {
        ...pendingSecret,
        savedAt: verifiedAt,
        verificationStatus: result.status,
        verificationMessage: envSave.ok ? `${result.message} ${envSave.message}` : `${result.message} ${envSave.message || ''}`.trim()
      }
    };
    setSavedSecrets(verifiedSecrets);
    window.localStorage.setItem('ctoIntegrationSecrets', JSON.stringify(verifiedSecrets));
    updateService(serviceId, {
      environment,
      masked_key: maskedKey,
      status: result.status,
      health_status: result.status === 'Connected' ? 'Healthy' : 'Monitoring',
      last_verified: verifiedAt
    }, 'verification completed', result.status);
  }

  return (
    <ExportOSShell className="integrations-vault-shell">
      <header className="deck-header integrations-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{ctoLabels.integrationsVaultTitle}</h1>
          <p>{ctoLabels.integrationsVaultSubtitle}</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <div className="coo-status"><LockKeyhole size={15} /><strong>{ctoLabels.rawSecretsNotice}</strong></div>
          <button className="tactical-button" onClick={() => setModalOpen(true)}><KeyRound size={15} />Add Integration</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} />Back to CTO Command</button>
        </div>
      </header>
      <div className="pricing-model-strip">{integrationModels.map((model) => <code key={model}>{model}</code>)}</div>
      <section className="integrations-overview-grid">
        <UsageMonitor services={services} />
        <VerifyConnectionPanel services={services} />
      </section>
      <section className="integration-card-grid">
        {services.map((service) => <IntegrationCard key={service.id} service={service} provider={ctoProviderCatalog[service.id]} onAction={handleAction} />)}
      </section>
      <IntegrationAuditTimeline audit={audit} />
      {modalOpen && (
        <AddIntegrationModal
          services={services}
          initialServiceId={selectedServiceId}
          onCancel={() => setModalOpen(false)}
          onSave={saveIntegration}
        />
      )}
      <ExecSuiteBar current="cto" navigate={navigate} />
    </ExportOSShell>
  );
}

function IntegrationCard({ service, provider = {}, onAction }) {
  const actions = provider.actions?.length ? provider.actions : ['Add Key', 'Verify Connection', 'Disable Integration'];
  return (
    <article className="integration-panel">
      <div className="approval-section-header">
        <div><span>{provider.category || 'Integration'}</span><h2>{service.service_name}</h2></div>
        <StatusBadge label={service.status} state={service.status === 'Connected' ? 'online' : service.status === 'Failure Detected' ? 'error' : 'attention'} />
      </div>
      <div className="integration-stat-grid">
        <div><span>Environment</span><strong>{service.environment || 'Production'}</strong></div>
        <div><span>Last verified</span><strong>{service.last_verified || 'No recent sync'}</strong></div>
        <div><span>Masked key</span><strong>{service.masked_key || 'Not connected'}</strong></div>
        <div><span>Quota / detail</span><strong>{service.quota_remaining || 'Awaiting integration'}</strong></div>
      </div>
      <div className="billing-action-row">
        {actions.slice(0, 3).map((action) => <button key={action} onClick={() => onAction(service, action)}>{action}</button>)}
      </div>
    </article>
  );
}

function AddIntegrationModal({ services, initialServiceId, onCancel, onSave }) {
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || 'openai');
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState('Production');
  const service = services.find((item) => item.id === serviceId) || services[0] || { id: 'openai', service_name: 'OpenAI' };

  async function handleSave() {
    const verificationResult = await verifyIntegrationSecret(service.id, apiKey);
    onSave({
      serviceId: service.id,
      serviceName: service.service_name,
      apiKey,
      environment,
      maskedKey: maskSecretPreview(apiKey),
      verificationResult
    });
  }

  return (
    <div className="article-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cto-add-integration-title">
      <div className="article-modal connect-billing-modal">
        <button className="login-back" onClick={onCancel}>Cancel</button>
        <span className="selected-os-badge">CTO Provider Vault</span>
        <h2 id="cto-add-integration-title">Add Integration</h2>
        <div className="connect-billing-fields">
          <label><span>Service</span><select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((item) => <option key={item.id} value={item.id}>{item.service_name}</option>)}</select></label>
          <label><span>Environment</span><select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option>Production</option><option>Staging</option><option>Development</option></select></label>
          <label><span>API Key / Token</span><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" /></label>
        </div>
        <div className="approval-confirm-actions">
          <button className="ghost-button" onClick={onCancel}>Close</button>
          <button className="tactical-button" disabled={!apiKey.trim()} onClick={handleSave}>Save Integration</button>
        </div>
      </div>
    </div>
  );
}

function IntegrationAuditTimeline({ audit }) {
  return (
    <section className="integration-panel">
      <div className="approval-section-header"><div><span>Integration Audit</span><h2>Recent vault actions</h2></div><Activity size={18} /></div>
      <div className="verification-list">
        {audit.length === 0
          ? <span>No integration audit actions recorded.</span>
          : audit.map((item) => <span key={item.id}>{item.action}<small>{item.actor} / {item.created_at} / {item.status}</small></span>)}
      </div>
    </section>
  );
}

function UsageMonitor({ services }) {
  const critical = services.filter((service) => service.usage_percentage >= 95).length;
  const risk = services.filter((service) => service.usage_percentage >= 85).length;
  const attention = services.filter((service) => service.usage_percentage >= 70).length;
  const connected = services.filter((service) => service.status === 'Connected').length;
  return (
    <section className="integration-panel">
      <div className="approval-section-header"><div><span>Usage Monitoring</span><h2>Credits and quota control</h2></div><Gauge size={18} /></div>
      <div className="integration-stat-grid">
        <div><span>Connected</span><strong>{connected}</strong></div>
        <div><span>Attention 70%+</span><strong>{attention}</strong></div>
        <div><span>Risk 85%+</span><strong>{risk}</strong></div>
        <div><span>Critical 95%+</span><strong>{critical}</strong></div>
      </div>
    </section>
  );
}

function VerifyConnectionPanel({ services }) {
  const failed = services.filter((service) => ['Invalid Key', 'Expired', 'Quota Exceeded', 'Failure Detected', 'Error'].includes(service.status));
  return (
    <section className="integration-panel">
      <div className="approval-section-header"><div><span>Verification Control</span><h2>{failed.length ? `${failed.length} issue detected` : 'Connections monitored'}</h2></div><ScanLine size={18} /></div>
      <div className="verification-list">
        {services.slice(0, 5).map((service) => <span key={service.id}>{service.service_name}<small>{service.last_verified} - {service.status}</small></span>)}
      </div>
    </section>
  );
}

function buildIntegrationVaultServices(savedSecrets = {}, overrides = {}, providerStatuses = {}) {
  const seedMap = new Map(integrationServicesSeed.map((service) => [service.id, service]));
  return ctoServiceOrder.map((id) => {
    const provider = ctoProviderCatalog[id] || {};
    const seed = seedMap.get(id) || {
      id,
      service_name: ctoServiceNameFor(id),
      environment: id === 'n8n' ? 'Staging' : provider.environment || 'Production',
      masked_key: `${id.slice(0, 4)}_****`,
      status: 'Awaiting Connection',
      usage_percentage: 0,
      quota_remaining: 'No live data connected',
      last_verified: 'No recent sync',
      health_status: 'Awaiting Connection',
      request_volume: 'No live data connected',
      last_request: 'No recent sync',
      estimated_exhaustion: 'Awaiting integration'
    };
    const providerStatus = id === 'openai' ? providerStatuses.openai : null;
    const service = applyProviderStatusToService({ ...seed, ...(overrides[id] || {}) }, providerStatus);
    const localState = getLocalIntegrationState(service, backendStatus.mode === 'Connected', savedSecrets);
    const saved = savedSecrets[id];
    const isConnected = localState.status === 'Connected';
    const providerLocked = Boolean(service.providerStatus);
    return {
      ...service,
      service_name: service.service_name || ctoServiceNameFor(id),
      masked_key: providerLocked ? service.masked_key : saved?.maskedKey || service.masked_key || `${id.slice(0, 4)}_****`,
      status: localState.status,
      last_verified: localState.lastCheck,
      health_status: isConnected ? 'Healthy' : localState.status === 'Disabled' ? 'Disabled' : localState.status === 'Failure Detected' ? 'Error' : service.health_status || 'Awaiting Connection',
      last_request: providerLocked ? service.last_request : isConnected ? 'Live' : service.last_request || 'No recent sync',
      quota_remaining: providerLocked ? service.quota_remaining : saved?.verificationMessage || service.quota_remaining || 'Awaiting integration',
      usage_percentage: typeof service.usage_percentage === 'number' ? service.usage_percentage : 0,
      provider
    };
  });
}

function applyProviderStatusToService(service, providerStatus) {
  if (!providerStatus) return service;
  const status = providerStatus.status === 'live'
    ? 'Connected'
    : providerStatus.status === 'pending'
      ? 'Verification Pending'
      : 'Failure Detected';
  const live = status === 'Connected';
  const checkedAt = providerStatus.last_success_at || providerStatus.last_checked_at;
  const message = live
    ? 'OpenAI live: CTO provider connection active.'
    : providerStatus.status === 'pending'
      ? 'Checking OpenAI connection...'
      : providerStatus.error_message || 'API request failed';
  return {
    ...service,
    providerStatus,
    status,
    health_status: live ? 'Healthy' : providerStatus.status === 'pending' ? 'Monitoring' : 'Error',
    masked_key: live ? service.masked_key : 'Not configured',
    quota_remaining: message,
    last_verified: checkedAt || 'No recent sync',
    request_volume: ctoLabels.providerVaultSource,
    last_request: live && typeof providerStatus.latency_ms === 'number'
      ? `${providerStatus.latency_ms} ms validation`
      : providerStatus.status === 'pending'
        ? 'Checking now'
        : 'Provider validation failed',
    estimated_exhaustion: live ? 'Stable' : 'Blocked until provider validates',
    usage_percentage: live ? service.usage_percentage : 0
  };
}

const ctoHealthSystems = [
  ['Website', 'Online', '124 ms', 'Frontend active'],
  ['APIs', 'Monitoring', '210 ms', 'REST routes responsive'],
  ['Automations', 'Attention', 'Queue delay', '3 retries pending'],
  ['Lead Intake', 'Online', '98 ms', 'Forms accepting drafts'],
  ['Invoice System', 'Attention', 'Validation gate', 'LUT blockers active'],
  ['Director Queue', 'Online', '86 ms', 'Founder queue active'],
  ['Database', 'Monitoring', '46% usage', 'RLS enabled'],
  ['Authentication', 'Online', 'Session valid', 'MFA required']
].map(([name, status, metric, note], index) => ({ id: `cto-health-${index}`, name, status, metric, note }));

const ctoAutomationQueue = [
  ['Running workflows', '07', 'Monitoring', 'Lead intake, briefing, content runbook'],
  ['Failed workflows', '03', 'Attention', 'Forex timeout, invoice validation, webhook retry'],
  ['Retry queue', '03', 'Retry Pending', 'Backoff ready; no external execution from frontend'],
  ['Pending automations', '05', 'Waiting Approval', 'Founder approval and CTO review gates'],
  ['Execution latency', '420 ms', 'Monitoring', 'Awaiting live measurements']
].map(([label, value, status, note]) => ({ label, value, status, note }));

const ctoIncidents = [
  ['API timeout', 'High', 'Forex API', 'Pricing forex snapshot delayed', 'Retry then CTO review'],
  ['Low credits', 'High', 'OpenAI', 'Usage crossed 82% threshold', 'Founder + CTO attention'],
  ['Deployment failure', 'Critical', 'Vercel', 'Last deploy log needs review', 'Pause production release'],
  ['Automation retry', 'Medium', 'Automation Queue', 'Task escalation retry pending', 'Open automation logs'],
  ['Webhook failure', 'High', 'WhatsApp', 'Inbound command webhook pending', 'Verify endpoint'],
  ['Form validation issue', 'Medium', 'Lead Intake', 'Destination port missing validation', 'Create CTO task']
].map(([title, severity, module, impact, action], index) => ({ id: `cto-incident-${index}`, title, severity, module, impact, action }));

const ctoDeploymentLogs = [
  ['Production build', 'Monitoring', 'Last build passed locally', 'Vite large chunk warning remains'],
  ['Frontend route check', 'Online', 'Security + automation routes render', 'Browser verification completed'],
  ['Supabase migration', 'Attention', 'Schema migration file prepared', 'Apply in Supabase before live CRUD'],
  ['Environment variables', 'Monitoring', 'Unavailable active when env missing', 'No service-role key in frontend']
].map(([name, status, event, note], index) => ({ id: `deploy-${index}`, name, status, event, note }));

const ctoCreditWatch = [
  ['OpenAI usage', 82, 'Attention', '18% monthly credits remaining'],
  ['Vercel plan', 31, 'Monitoring', '69% build minutes remaining'],
  ['Supabase usage', 46, 'Monitoring', '54% database quota remaining'],
  ['WhatsApp usage', 64, 'Monitoring', '36% message tier remaining'],
  ['Automation quotas', 88, 'Risk', 'High retry pressure; review before enabling n8n']
].map(([label, usage, status, note]) => ({ label, usage, status, note }));

const paymentGovernanceRules = {
  currency: 'INR',
  safeAutoPayLimit: 1000,
  absoluteAutoPayCap: 1500,
  allowedCategory: 'Trusted infrastructure renewals and credits only',
  emergencyFreeze: 'Available to Founder',
  executor: 'CFO Command',
  otpOwner: 'Founder',
  technicalRequester: 'CTO Command'
};

const trustedInfrastructureVendors = ['OpenAI credits', 'Supabase', 'Vercel', 'Cloudflare', 'Domain / SSL renewals', 'Email provider', 'Automation tools'];
const neverAutoPayCategories = ['Supplier payments', 'Freight', 'Customs', 'Tax', 'Salaries', 'Refunds', 'Unknown invoices', 'Bank transfers', 'Manual vendor invoices'];
const paymentApprovalBands = [
  ['Safe auto-pay', '₹0-₹1,000', 'Trusted infrastructure vendor only', 'CFO can approve after COO confirms operational need'],
  ['Controlled auto-pay', '₹1,001-₹1,500', 'Trusted infrastructure vendor only', 'CFO + COO confirmation required before auto-pay'],
  ['Founder approval required', 'Above ₹1,500', 'Any vendor', 'Founder approval required before payment'],
  ['Auto-pay blocked', 'Any amount', 'Unknown, high-risk, or non-infrastructure', 'Route to Director Command Center']
];
const paymentVaultRecords = [
  ['OpenAI credits', '₹950', 'AI workflow credit top-up', 'Trusted Infrastructure', 'CTO requirement -> COO necessity -> CFO validation/execution', 'Receipt pending', 'CFO Command', 'Requirement raised', 'Confirmed', 'Ready to initiate', 'Not required', 'Pending until gateway OTP completes', 'Draft audit event'],
  ['Supabase', '₹1,250', 'Database platform renewal buffer', 'Trusted Infrastructure', 'CTO requirement -> COO + CFO confirmation', 'Invoice pending', 'CFO Command', 'Requirement raised', 'Pending', 'Review', 'Not required', 'Pending until CFO + COO confirmation', 'Controlled auto-pay review'],
  ['Freight vendor invoice', '₹1,200', 'Manual shipment invoice', 'Freight', 'Blocked -> Founder Review', 'Not uploaded', 'Not paid', 'Blocked', 'Blocked', 'Blocked', 'Required', 'No payment timestamp', 'Non-infrastructure category blocked'],
  ['Unknown SaaS vendor', '₹800', 'Unverified renewal request', 'Unknown Vendor', 'Blocked -> Founder Review', 'Missing', 'Not paid', 'Pending', 'Pending', 'Blocked', 'Required', 'No payment timestamp', 'New vendor approval required']
].map(([vendor_name, amount_inr, payment_reason, category, approval_path, receipt_invoice, paid_by, cto_confirmation, coo_confirmation, cfo_confirmation, founder_approval, payment_timestamp, audit_trail], index) => ({
  id: `payment-vault-${index}`,
  vendor_name,
  amount_inr,
  payment_reason,
  category,
  approval_path,
  receipt_invoice,
  paid_by,
  cto_confirmation,
  coo_confirmation,
  cfo_confirmation,
  founder_approval,
  payment_timestamp,
  audit_trail
}));
const paymentWorkflowSteps = ['CTO detects subscription renewal / credit requirement', 'CTO creates Payment Requirement', 'COO validates operational necessity', 'CFO validates budget, vendor, category, limits, and risk', 'Founder approval triggered if required', 'CFO initiates payment', 'Bank/payment gateway requests OTP', 'Founder receives OTP externally', 'Founder securely shares OTP with CFO', 'CFO enters OTP once in secure confirmation screen', 'System submits OTP one time and clears it', 'Payment completes', 'CTO captures invoice/receipt', 'CFO stores payment in Payment Vault', 'COO confirms operational continuity', 'Founder receives final payment summary', 'Audit trail completed without OTP values'];
const otpAuditEvents = ['payment request created', 'COO operational confirmation', 'CFO validation completed', 'founder approval completed if required', 'OTP requested', 'OTP submitted', 'payment completed', 'receipt captured', 'Payment Vault updated'];

const ctoTimeline = [
  ['09:10', 'Platform health scan completed', 'Monitoring'],
  ['09:25', 'OpenAI usage warning generated', 'Attention'],
  ['10:05', 'Invoice validation blocker detected', 'Attention'],
  ['10:40', 'Automation retry queued for review', 'Retry Pending'],
  ['11:15', 'Supabase RLS tables added to migration', 'Monitoring']
];

const cioDataSourceRequests = [
  ['1000+ verified importer acquisition', 'CTO-owned research/import pipeline using approved APIs, directory exports, Google Custom Search, and CSV ingestion', 'Build real importer database for CIO without fake generated records', 'Critical', 'Create controlled acquisition plan, source rules, dedupe, verification scoring, and import audit'],
  ['TradeMap / trade data', 'API key + endpoint verification', 'CIO importer and market intelligence', 'High', 'Prepare secure backend integration and source sync job'],
  ['UN Comtrade', 'API key + commodity query mapping', 'Trade volume and country/product validation', 'High', 'Prepare backend connector and rate-limit handling'],
  ['Kompass / importer directory', 'Directory connector or approved export file', 'Importer company discovery', 'High', 'Review terms, connector method, and import schema'],
  ['TradeAtlas', 'Connector/API access', 'Trade corridor and buyer signal enrichment', 'Medium', 'Prepare credential request and connector plan'],
  ['LinkedIn company search', 'Authenticated search/API workflow', 'Company validation and buyer research', 'High', 'Route through approved account/API path; no scraping from CIO'],
  ['Google Custom Search', 'Search API key + allowed domains', 'Public source discovery and verification links', 'Medium', 'Set up search key, quotas, and safe result logging'],
  ['APEDA / Spice Board references', 'Reference source links or feed', 'Product/certification mapping', 'Medium', 'Prepare reference ingestion and update schedule'],
  ['Manual CSV upload', 'Upload/import workflow', 'Founder or team-provided importer files', 'High', 'Build CSV validation, dedupe, and import audit']
].map(([source, requirement, purpose, priority, nextAction], index) => ({
  id: `cio-source-request-${index}`,
  source,
  requirement,
  purpose,
  priority,
  owner: 'CTO Command',
  status: index === 7 ? 'Import Tool Needed' : 'Setup Required',
  nextAction
}));

function CTOCommandPage({ navigate, onBack }) {
  const [healthSummary, setHealthSummary] = useState(null);
  const [liveStatuses, setLiveStatuses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [inputs, setInputs] = useState({});
  const [saveState, setSaveState] = useState({});
  const [notice, setNotice] = useState('Integration health not checked yet.');
  const [providerStatus, setProviderStatus] = useState({});
  const [revealed, setRevealed] = useState({});

  const envValue = React.useCallback((name) => (typeof import.meta !== 'undefined' ? import.meta.env?.[name] : '') || '', []);

  React.useEffect(() => {
    fetch("/api/cto/provider-env/status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.providers) setProviderStatus(d.providers); })
      .catch(() => null);
  }, []);
  const refreshCTOStatus = React.useCallback(async () => {
    setNotice('Running live CTO integration health check...');
    const [healthResult, statusRows, incidentResult, subscriptionResult] = await Promise.all([
      getSystemHealthSummary(demoTenantId),
      getLiveIntegrationStatus(demoTenantId),
      getIncidents(demoTenantId),
      getSubscriptionWatch()
    ]);
    setHealthSummary(healthResult.data);
    setLiveStatuses(statusRows || []);
    setIncidents(incidentResult.data || []);
    setSubscriptions(subscriptionResult.data || []);
    setNotice(`Health check complete at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getSystemHealthSummary(demoTenantId),
      getLiveIntegrationStatus(demoTenantId),
      getIncidents(demoTenantId),
      getSubscriptionWatch()
    ]).then(([healthResult, statusRows, incidentResult, subscriptionResult]) => {
      if (!mounted) return;
      setHealthSummary(healthResult.data);
      setLiveStatuses(statusRows || []);
      setIncidents(incidentResult.data || []);
      setSubscriptions(subscriptionResult.data || []);
      setNotice('Live integration status loaded.');
    }).catch((error) => {
      if (!mounted) return;
      setNotice(error?.message || 'Unable to load CTO integration health.');
    });
    return () => { mounted = false; };
  }, []);

  function statusFor(serviceName) {
    return liveStatuses.find((item) => String(item.service || '').toLowerCase() === serviceName.toLowerCase());
  }

  function maskedValue(value = '') {
    if (!value) return 'Not set';
    if (value.includes('supabase.co')) {
      return value.replace(/^https:\/\/(.{3}).*(.{3})\.supabase\.co$/i, 'https://$1...$2.supabase.co');
    }
    if (value.length <= 10) return 'Configured';
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  function fieldIsConfigured(fieldId) {
    return providerStatus[fieldId]?.resolved === true;
  }

  function integrationStatus(service) {
    if (service.id === 'vercel') {
      const isDeployed = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
      return isDeployed ? { label: 'LIVE', tone: 'live' } : { label: 'LOCAL DEV', tone: 'partial' };
    }
    if (service.id === 'supabase') {
      const urlOk = providerStatus['supabase_url']?.resolved;
      const anonOk = providerStatus['supabase_anon_key']?.resolved;
      if (urlOk && anonOk) return { label: 'LIVE', tone: 'live' };
      if (urlOk || anonOk) return { label: 'PARTIAL', tone: 'partial' };
      return { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'openai') {
      return providerStatus['openai']?.resolved ? { label: 'LIVE', tone: 'live' } : { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'slack') {
      const tokenOk = providerStatus['slack_bot_token']?.resolved;
      const channelOk = providerStatus['slack_channel_id']?.resolved;
      const webhookOk = providerStatus['slack']?.resolved;
      if ((tokenOk && channelOk) || webhookOk) return { label: 'LIVE', tone: 'live' };
      if (tokenOk || channelOk || webhookOk) return { label: 'PARTIAL', tone: 'partial' };
      return { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'resend') {
      return providerStatus['resend']?.resolved ? { label: 'LIVE', tone: 'live' } : { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'twilio') {
      const sidOk = providerStatus['twilio_account_sid']?.resolved;
      const tokenOk = providerStatus['twilio_auth_token']?.resolved;
      if (sidOk && tokenOk) return { label: 'LIVE', tone: 'live' };
      if (sidOk || tokenOk) return { label: 'PARTIAL', tone: 'partial' };
      return { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'linkedin') {
      const tokenOk = providerStatus['linkedin']?.resolved;
      const clientOk = providerStatus['linkedin_client_id']?.resolved;
      const secretOk = providerStatus['linkedin_client_secret']?.resolved;
      const redirectOk = providerStatus['linkedin_redirect_uri']?.resolved;
      if (tokenOk && clientOk && secretOk && redirectOk) return { label: 'LIVE', tone: 'live' };
      if (tokenOk || clientOk || secretOk || redirectOk) return { label: 'PARTIAL', tone: 'partial' };
      return { label: 'NOT SET', tone: 'not-set' };
    }
    if (service.id === 'meta') {
      const tokenOk = providerStatus['meta']?.resolved || providerStatus['meta_access_token']?.resolved || providerStatus['instagram']?.resolved || providerStatus['facebook']?.resolved;
      const instagramOk = providerStatus['instagram_business_account_id']?.resolved;
      const facebookOk = providerStatus['facebook_page_id']?.resolved;
      if (tokenOk && instagramOk && facebookOk) return { label: 'LIVE', tone: 'live' };
      if (tokenOk || instagramOk || facebookOk) return { label: 'PARTIAL', tone: 'partial' };
      return { label: 'NOT SET', tone: 'not-set' };
    }
    const anyField = service.fields?.some(f => providerStatus[f.id]?.resolved);
    const allFields = service.fields?.length > 0 && service.fields.every(f => providerStatus[f.id]?.resolved);
    if (allFields) return { label: 'LIVE', tone: 'live' };
    if (anyField) return { label: 'PARTIAL', tone: 'partial' };
    return { label: 'NOT SET', tone: 'not-set' };
  }

  const integrationCards = [
    {
      id: 'supabase',
      logo: 'SB',
      name: 'Supabase',
      description: 'Primary database, auth, storage, audit logs, and workflow state.',
      fields: [
        { id: 'supabase_url', label: 'Supabase URL', placeholder: 'https://project.supabase.co', type: 'text' },
        { id: 'supabase_anon_key', label: 'Anon key', placeholder: 'Paste anon public key', type: 'password' }
      ]
    },
    {
      id: 'openai',
      logo: 'AI',
      name: 'OpenAI',
      description: 'AI generation, analysis, captions, content quality review, and automation support.',
      fields: [{ id: 'openai', label: 'OpenAI API key', placeholder: 'Paste OpenAI API key', type: 'password' }]
    },
    {
      id: 'slack',
      logo: 'SL',
      name: 'Slack',
      description: 'Founder alerts, CMO approvals, operational reports, and incident notifications.',
      fields: [
        { id: 'slack_bot_token', label: 'Bot token', placeholder: 'xoxb-...', type: 'password' },
        { id: 'slack_channel_id', label: 'Channel ID', placeholder: 'C0B692ZMGSZ', type: 'text' },
        { id: 'slack_signing_secret', label: 'Signing secret', placeholder: 'Paste signing secret', type: 'password' }
      ]
    },
    {
      id: 'resend',
      logo: 'RS',
      name: 'Resend',
      description: 'Transactional buyer email, notifications, receipts, and operational summaries.',
      fields: [{ id: 'resend', label: 'Resend API key', placeholder: 're_...', type: 'password' }]
    },
    {
      id: 'linkedin',
      logo: 'LI',
      name: 'LinkedIn',
      description: 'CMO authority posts through the approved founder personal profile publishing path.',
      fields: [
        { id: 'linkedin_client_id', label: 'Client ID', placeholder: 'Paste LinkedIn Client ID', type: 'password' },
        { id: 'linkedin_client_secret', label: 'Client secret', placeholder: 'Paste LinkedIn Client Secret', type: 'password' },
        { id: 'linkedin_redirect_uri', label: 'Redirect URI', placeholder: 'https://gopu-os-cmo.vercel.app/api/integrations/linkedin/callback', type: 'text' },
        { id: 'linkedin', label: 'Access token', placeholder: 'Paste w_member_social access token', type: 'password' }
      ]
    },
    {
      id: 'meta',
      logo: 'MT',
      name: 'Meta',
      description: 'Facebook Page and Instagram Business publishing for approved CMO content.',
      fields: [
        { id: 'meta_access_token', label: 'Meta access token', placeholder: 'Paste Page/Business token', type: 'password' },
        { id: 'facebook_page_id', label: 'Facebook Page ID', placeholder: 'Paste Page ID', type: 'text' },
        { id: 'instagram_business_account_id', label: 'Instagram business ID', placeholder: 'Paste IG business account ID', type: 'text' }
      ]
    },
    {
      id: 'twilio',
      logo: 'WA',
      name: 'Twilio',
      description: 'WhatsApp command interface and buyer/founder messaging infrastructure.',
      fields: [
        { id: 'twilio_account_sid', label: 'Account SID', placeholder: 'AC...', type: 'password' },
        { id: 'twilio_auth_token', label: 'Auth token', placeholder: 'Paste auth token', type: 'password' }
      ]
    },
    {
      id: 'vercel',
      logo: 'VC',
      name: 'Vercel',
      description: 'Hosting, preview deployments, cron jobs, and serverless API routes.',
      readOnly: true,
      fields: []
    }
  ];

  const liveCount = integrationCards.filter((service) => integrationStatus(service).label === 'LIVE').length;
  const computedOverall = liveCount === integrationCards.length ? 'Healthy' : liveCount >= 3 ? 'Degraded' : 'Critical';
  const overallStatus = healthSummary?.overall ? healthSummary.overall.replace(/\b\w/g, (letter) => letter.toUpperCase()) : computedOverall;
  const lastChecked = healthSummary?.lastChecked ? new Date(healthSummary.lastChecked).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not checked';

  async function saveProviderValue(fieldId) {
    const value = String(inputs[fieldId] || '').trim();
    if (!value) {
      setSaveState((current) => ({ ...current, [fieldId]: 'Enter a value before saving.' }));
      return;
    }
    setSaveState((current) => ({ ...current, [fieldId]: 'Saving...' }));
    try {
      const response = await fetch('/api/cto/provider-env/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: fieldId, value })
      });
      const result = await response.json().catch(() => ({}));
      setSaveState((current) => ({
        ...current,
        [fieldId]: result.ok ? 'Saved Done Restart dev server to apply' : result.message || 'Save failed'
      }));
      if (result.ok) setInputs((current) => ({ ...current, [fieldId]: '' }));
    } catch (error) {
      setSaveState((current) => ({ ...current, [fieldId]: error?.message || 'Save failed' }));
    }
  }

  async function sendHealthReport() {
    const summaryLines = integrationCards.map((service) => `${service.name}: ${integrationStatus(service).label}`).join('\n');
    const result = await sendSlackNotification({
      type: 'High Priority Alert',
      priority: overallStatus === 'Critical' ? 'URGENT' : overallStatus === 'Degraded' ? 'WARNING' : 'INFO',
      reference: 'CTO-HEALTH',
      buyer: 'GOPU OS',
      status: overallStatus,
      eta: lastChecked,
      actionRequired: `CTO integration summary:\n${summaryLines}`,
      source: 'CTO Command'
    });
    setNotice(result?.ok === false ? 'Slack report could not be sent. Check Slack server env.' : 'CTO health report sent to Slack.');
  }

  async function handleCreatePaymentRequirement(item = {}) {
    const vendor = item.service || item.vendor || item.name || 'Infrastructure vendor';
    const result = await createPaymentRequirement({
      tenant_id: demoTenantId,
      title: `Payment requirement: ${vendor}`,
      vendor,
      category: item.category || 'Trusted infrastructure renewal / credits',
      priority: item.usage >= 95 ? 'Critical' : 'High',
      reason: item.renewal_note || item.reason || 'Renewal or usage risk requires CFO payment review.'
    });
    setNotice(`${result.data?.title || 'Payment requirement'} created for ${vendor}.`);
  }

  return (
    <ExportOSShell
      className="cto-shell"
      liveDataConnected={liveCount > 0}
      statusMessage={`CTO integrations: ${liveCount}/${integrationCards.length} live`}
    >
      <header className="deck-header cto-header">
        <div className="deck-header-copy">
          <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'CTO Command' }]} />
          <h1>CTO Command</h1>
          <p>Live integration health. All connections in one place.</p>
        </div>
        <div className="deck-header-controls">
          <button className="tactical-button" onClick={refreshCTOStatus}><Activity size={15} />Run Health Check</button>
          <button className="ghost-button deck-logout" onClick={sendHealthReport}><Send size={15} />Send Report to Slack</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      <section className="cto-health-bar">
        <div><span>Services Live</span><strong>{liveCount}/{integrationCards.length}</strong></div>
        <div><span>Overall Status</span><strong>{overallStatus}</strong></div>
        <div><span>Last Checked</span><strong>{lastChecked}</strong></div>
        <p>{notice}</p>
      </section>

      <section className="cto-integration-grid" aria-label="CTO integration cards">
        {integrationCards.map((service) => {
          const status = integrationStatus(service);
          return (
            <article key={service.id} className={`cto-integration-card ${status.tone}`}>
              <div className="cto-integration-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="cto-logo-text">{service.logo}</span>
                  <strong className="cto-integration-name">{service.name}</strong>
                </div>
                <StatusBadge label={status.label} state={status.tone === 'live' ? 'online' : status.tone === 'partial' ? 'attention' : 'error'} />
              </div>
              <p className="cto-integration-desc">{service.description}</p>
              {service.readOnly ? (
                <div className="cto-readonly-note">
                  {status.tone === 'live' ? 'Deployed on Vercel — hosting active.' : 'Running locally. Deploy to Vercel to go live.'}
                </div>
              ) : service.fields.map((field) => {
                const configured = fieldIsConfigured(field.id);
                const isRevealed = Boolean(revealed[field.id]);
                const envAlias = providerStatus[field.id]?.alias || providerStatus[field.id]?.env_name || field.id;
                return (
                  <div className="cto-integration-input-row" key={field.id}>
                    <span>{field.label}</span>
                    {configured ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <input
                          className="cto-integration-input"
                          type="text"
                          readOnly
                          value={isRevealed ? (revealed[field.id] === true ? 'Loading...' : revealed[field.id] || '••••••••••••') : '••••••••••••'}
                          style={{ flex: 1, cursor: 'default', fontFamily: isRevealed && revealed[field.id] && revealed[field.id] !== true ? 'var(--font-mono, monospace)' : undefined }}
                        />
                        <button
                          className="ghost-button"
                          type="button"
                          style={{ minWidth: 52 }}
                          onClick={async () => {
                            if (isRevealed) {
                              setRevealed(prev => ({ ...prev, [field.id]: false }));
                            } else {
                              setRevealed(prev => ({ ...prev, [field.id]: true }));
                              try {
                                const r = await fetch('/api/cto/provider-env/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fieldId: field.id }) });
                                const d = await r.json();
                                setRevealed(prev => ({ ...prev, [field.id]: d.ok ? d.value : '(not available)' }));
                              } catch {
                                setRevealed(prev => ({ ...prev, [field.id]: '(fetch error)' }));
                              }
                            }
                          }}
                        >
                          {isRevealed ? 'Hide' : 'View'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="cto-integration-input"
                          type={field.type}
                          placeholder={field.placeholder}
                          value={inputs[field.id] || ''}
                          onChange={(event) => setInputs((current) => ({ ...current, [field.id]: event.target.value }))}
                        />
                        <button className="ghost-button" type="button" onClick={() => saveProviderValue(field.id)}>Save</button>
                      </>
                    )}
                    {saveState[field.id] && <em style={{ fontSize: 11, color: 'var(--accent-green)' }}>{saveState[field.id]}</em>}
                  </div>
                );
              })}
            </article>
          );
        })}
      </section>

      <section className="cto-bottom-grid cto-simple-bottom">
        <article className="cto-panel">
          <CTOSectionHeader title="Recent Incidents" icon={AlertTriangle} />
          {incidents.length ? (
            <div className="cto-simple-list">
              {incidents.map((incident, index) => (
                <div key={incident.id || `${incident.title}-${index}`}>
                  <strong>{incident.title || incident.incident_title || incident.affected_module || 'Technical incident'}</strong>
                  <span>{incident.severity || incident.status || 'Attention'}</span>
                  <p>{incident.next_action || incident.business_impact || incident.description || 'Review incident and assign owner.'}</p>
                </div>
              ))}
            </div>
          ) : <p className="cto-empty-state">No incidents. All systems operational.</p>}
          <button className="ghost-button" type="button" onClick={() => setNotice('Create Incident is ready for live incident intake wiring.')}>Create Incident</button>
        </article>

        <article className="cto-panel">
          <CTOSectionHeader title="Payment Requirements" icon={CircleDollarSign} />
          {subscriptions.length ? (
            <div className="cto-simple-list">
              {subscriptions.map((item, index) => (
                <div key={item.id || item.service || index}>
                  <strong>{item.service || item.vendor || 'Infrastructure service'}</strong>
                  <span>{item.renewal_note || item.status || 'Renewal watch'}</span>
                  <p>{item.category || item.plan || 'Trusted infrastructure'} {item.usage ? `/ Usage ${item.usage}%` : ''}</p>
                  <button className="ghost-button" type="button" onClick={() => handleCreatePaymentRequirement(item)}>Create Payment Requirement</button>
                </div>
              ))}
            </div>
          ) : <p className="cto-empty-state">No renewal or credit requirements detected.</p>}
          {!subscriptions.length && <button className="ghost-button" type="button" onClick={() => handleCreatePaymentRequirement()}>Create Payment Requirement</button>}
        </article>
      </section>
      <ExecSuiteBar current="cto" navigate={navigate} />
    </ExportOSShell>
  );
}

const ctoTabs = ['Overview', 'Integrations', 'Workflows', 'Incidents', 'Payments & Renewals', 'Deployments', 'Audit'];
const ctoServiceOrder = ['openai', 'google-workspace', 'gmail', 'google-drive', 'google-custom-search', 'heygen', 'descript', 'captions-ai', 'canva', 'figma', 'linkedin', 'meta', 'instagram', 'facebook', 'youtube', 'metricool', 'buffer', 'supabase', 'whatsapp', 'slack', 'resend', 'vercel', 'cloudflare', 'n8n', 'forex', 'news', 'trademap', 'un-comtrade', 'kompass', 'tradeatlas', 'apeda', 'spice-board'];
const ctoCoreServiceOrder = ['openai', 'google-workspace', 'gmail', 'google-custom-search', 'supabase', 'whatsapp', 'slack', 'resend', 'vercel', 'cloudflare', 'n8n', 'forex', 'news'];
const ctoEnvTargetMap = {
  openai: 'CTO_PROVIDER_OPENAI_API_KEY',
  heygen: 'CTO_PROVIDER_HEYGEN_API_KEY',
  slack: 'SLACK_WEBHOOK_URL',
  resend: 'RESEND_API_KEY',
  supabase: 'SUPABASE_SERVICE_ROLE_KEY',
  whatsapp: 'WHATSAPP_API_TOKEN',
  cloudflare: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  vercel: 'VERCEL_TOKEN',
  linkedin_client_id: 'LINKEDIN_CLIENT_ID',
  linkedin_client_secret: 'LINKEDIN_CLIENT_SECRET',
  linkedin_redirect_uri: 'LINKEDIN_REDIRECT_URI',
  linkedin: 'LINKEDIN_ACCESS_TOKEN',
  meta: 'META_ACCESS_TOKEN',
  meta_access_token: 'META_ACCESS_TOKEN',
  instagram: 'META_ACCESS_TOKEN',
  instagram_business_account_id: 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  facebook: 'META_ACCESS_TOKEN',
  facebook_page_id: 'FACEBOOK_PAGE_ID',
  youtube: 'YOUTUBE_API_KEY',
  forex: 'FOREX_API_KEY',
  news: 'NEWS_API_KEY'
};

function ctoServiceNameFor(id = '') {
  const names = {
    openai: 'OpenAI',
    heygen: 'HeyGen',
    'google-workspace': 'Google Workspace',
    gmail: 'Gmail',
    'google-drive': 'Google Drive',
    'google-custom-search': 'Google Custom Search',
    descript: 'Descript',
    'captions-ai': 'Captions AI',
    canva: 'Canva',
    figma: 'Figma',
    linkedin: 'LinkedIn',
    meta: 'Meta',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    metricool: 'Metricool',
    buffer: 'Buffer',
    supabase: 'Supabase',
    whatsapp: 'WhatsApp',
    slack: 'Slack',
    resend: 'Resend',
    vercel: 'Vercel',
    cloudflare: 'Cloudflare',
    n8n: 'n8n',
    forex: 'Forex Feed',
    news: 'News Feed',
    trademap: 'TradeMap',
    'un-comtrade': 'UN Comtrade',
    kompass: 'Kompass',
    tradeatlas: 'TradeAtlas',
    apeda: 'APEDA',
    'spice-board': 'Spice Board'
  };
  return names[id] || id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ctoProviderCatalog = {
  openai: {
    website: 'https://platform.openai.com',
    docs: 'https://platform.openai.com/docs',
    pricing: 'https://openai.com/api/pricing/',
    recommendedPlan: 'API Platform pay-as-you-go with strict monthly budget limits',
    planReason: 'Best fit for controlled AI workflows because usage can scale by token volume and should be capped before production automations run.',
    keyLabel: 'OpenAI API key',
    fields: ['API key', 'Project ID', 'Monthly budget cap', 'Default model'],
    setup: ['Create a project in OpenAI Platform.', 'Generate a project API key.', 'Set a monthly budget and usage alert.', 'Save the key, then verify generation from backend only.']
  },
  supabase: {
    website: 'https://supabase.com',
    docs: 'https://supabase.com/docs',
    pricing: 'https://supabase.com/pricing',
    recommendedPlan: 'Supabase Pro for production database, auth, storage, and backups',
    planReason: 'Production export operations need backups, higher limits, and operational controls beyond a free project.',
    keyLabel: 'Supabase anon key / service role key',
    fields: ['Project URL', 'Anon key', 'Service role key', 'Database region'],
    setup: ['Create production project.', 'Copy project URL and anon key.', 'Keep service role key server-side only.', 'Verify RLS before production CRUD.']
  },
  'google-workspace': {
    website: 'https://workspace.google.com',
    docs: 'https://developers.google.com/workspace',
    pricing: 'https://workspace.google.com/pricing.html',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'Google Workspace account connected through OAuth, not password sharing',
    planReason: 'Use this account for Gmail, Drive, Calendar, Sheets, and document handoff after OAuth consent is completed by the account owner.',
    keyLabel: 'Google OAuth client / refresh token',
    fields: ['OAuth client ID', 'OAuth client secret', 'Authorized account', 'Required scopes'],
    setup: [`Sign in as ${ctoDefaultLoginEmail}.`, 'Create or select Google Cloud project.', 'Configure OAuth consent and redirect URL.', 'Grant only Gmail/Drive/Calendar scopes required by GOPU OS.']
  },
  gmail: {
    website: 'https://mail.google.com',
    docs: 'https://developers.google.com/gmail/api',
    pricing: 'https://workspace.google.com/pricing.html',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'Gmail API through Google OAuth for approved buyer/internal email workflows',
    planReason: 'Gmail can support controlled internal notifications and draft handoff, but buyer-facing sends must stay approval-gated and auditable.',
    keyLabel: 'Gmail OAuth refresh token',
    fields: ['OAuth client', 'Authorized Gmail account', 'Send scope', 'Draft/read scope'],
    setup: [`Sign in as ${ctoDefaultLoginEmail}.`, 'Enable Gmail API in Google Cloud.', 'Complete OAuth consent.', 'Store refresh token server-side and verify draft/send permission from backend.']
  },
  'google-drive': {
    website: 'https://drive.google.com',
    docs: 'https://developers.google.com/drive/api',
    pricing: 'https://workspace.google.com/pricing.html',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'Google Drive API for document vault exports and approved file handoff',
    planReason: 'Drive can store generated documents, CSV importer files, reports, and evidence folders after folder permissions are reviewed.',
    keyLabel: 'Google Drive OAuth refresh token',
    fields: ['OAuth client', 'Root folder ID', 'Authorized account', 'Drive scopes'],
    setup: [`Sign in as ${ctoDefaultLoginEmail}.`, 'Enable Drive API.', 'Create GOPU OS root folder.', 'Save folder IDs and OAuth token server-side.']
  },
  'google-custom-search': {
    website: 'https://programmablesearchengine.google.com',
    docs: 'https://developers.google.com/custom-search/v1/overview',
    pricing: 'https://developers.google.com/custom-search/v1/overview#pricing',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'Google Programmable Search Engine + Custom Search JSON API',
    planReason: 'Required for controlled importer/source discovery without scraping. CTO owns query quotas, allowed domains, and source logging.',
    keyLabel: 'Google Custom Search API key',
    fields: ['API key', 'Search engine ID', 'Allowed domains', 'Daily quota'],
    setup: [`Sign in as ${ctoDefaultLoginEmail}.`, 'Create Programmable Search Engine.', 'Enable Custom Search JSON API.', 'Save API key and search engine ID for CIO importer discovery.']
  },
  whatsapp: {
    website: 'https://developers.facebook.com/docs/whatsapp',
    docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    pricing: 'https://developers.facebook.com/docs/whatsapp/pricing',
    recommendedPlan: 'Meta WhatsApp Cloud API through verified business account',
    planReason: 'Use the official business platform for compliant lead intake, templates, and webhook delivery.',
    keyLabel: 'WhatsApp access token',
    fields: ['Access token', 'Phone number ID', 'Business account ID', 'Webhook verify token'],
    setup: ['Verify Meta Business account.', 'Create WhatsApp app.', 'Configure webhook callback.', 'Approve templates before outbound messages.']
  },
  slack: {
    website: 'https://slack.com',
    docs: 'https://api.slack.com',
    pricing: 'https://slack.com/pricing',
    recommendedPlan: 'Slack workspace app for internal operations alerts',
    planReason: 'Use Slack for routine internal workflow alerts, all normal approvals, hourly briefings, blockers, incidents, and executive notifications. WhatsApp stays reserved for daily briefing and overdue approval escalation.',
    keyLabel: 'Slack bot token / webhook URL',
    fields: ['Bot token', 'Signing secret', 'Default alert channel', 'Webhook URL'],
    setup: ['Create Slack app in the GOPU workspace.', 'Add bot scopes for internal notification channels.', 'Configure signing secret and webhook URL server-side.', 'Route approvals and hourly briefings to Slack unless approval response time is breached.']
  },
  resend: {
    website: 'https://resend.com',
    docs: 'https://resend.com/docs',
    pricing: 'https://resend.com/pricing',
    recommendedPlan: 'Resend Pro once buyer-facing email volume is production-ready',
    planReason: 'Domain verification, deliverability, and production sending limits are required before automating buyer emails.',
    keyLabel: 'Resend API key',
    fields: ['API key', 'Sending domain', 'From address', 'Webhook secret'],
    setup: ['Verify sending domain.', 'Create API key.', 'Configure DNS records.', 'Send a backend verification email.']
  },
  vercel: {
    website: 'https://vercel.com',
    docs: 'https://vercel.com/docs',
    pricing: 'https://vercel.com/pricing',
    recommendedPlan: 'Vercel Pro for production deployment and team-managed reliability',
    planReason: 'Production app hosting benefits from team access, observability, deployment controls, and higher usage limits.',
    keyLabel: 'Vercel token',
    fields: ['Access token', 'Team ID', 'Project ID', 'Production domain'],
    setup: ['Link project.', 'Create scoped access token.', 'Set environment variables.', 'Verify production deployment and rollback path.']
  },
  cloudflare: {
    website: 'https://www.cloudflare.com',
    docs: 'https://developers.cloudflare.com',
    pricing: 'https://www.cloudflare.com/plans/',
    recommendedPlan: 'Cloudflare Pro or Business depending on traffic and WAF needs',
    planReason: 'Use Pro for professional site protection; move to Business when uptime, WAF, and support needs become critical.',
    keyLabel: 'Cloudflare API token',
    fields: ['API token', 'Account ID', 'Zone ID', 'Domain'],
    setup: ['Add domain zone.', 'Create least-privilege API token.', 'Configure DNS and SSL.', 'Verify firewall and cache rules.']
  },
  n8n: {
    website: 'https://n8n.io',
    docs: 'https://docs.n8n.io',
    pricing: 'https://n8n.io/pricing/',
    recommendedPlan: 'n8n Cloud Starter/Pro or self-hosted after CTO security review',
    planReason: 'Start controlled; only enable production workflows after credential isolation, retries, and audit logging exist.',
    keyLabel: 'n8n API key',
    fields: ['API key', 'Base URL', 'Webhook signing secret', 'Environment'],
    setup: ['Choose cloud or self-hosted runtime.', 'Create API key.', 'Configure webhook secrets.', 'Run test workflow without external side effects.']
  },
  heygen: {
    website: 'https://www.heygen.com',
    docs: 'https://docs.heygen.com',
    pricing: 'https://www.heygen.com/pricing',
    recommendedPlan: 'HeyGen workspace only after founder consent and avatar governance are approved',
    planReason: 'AI avatar support is a backup layer, not the primary founder authority format. Consent, approval, and usage limits must be clear before production use.',
    keyLabel: 'HeyGen API key',
    fields: ['API key', 'Avatar consent status', 'Workspace ID', 'Usage cap'],
    setup: ['Confirm founder consent requirements.', 'Create HeyGen workspace/API access.', 'Store secrets server-side only.', 'Route avatar requests through founder approval.']
  },
  descript: {
    website: 'https://www.descript.com',
    docs: 'https://help.descript.com',
    pricing: 'https://www.descript.com/pricing',
    recommendedPlan: 'Creator/Business workspace for real founder video editing workflow',
    planReason: 'Descript supports editing, cleanup, transcript workflows, and long-form founder video production.',
    keyLabel: 'OAuth / workspace token',
    fields: ['Workspace ID', 'OAuth status', 'Editor owner', 'Export folder'],
    setup: ['Create workspace.', 'Define manual handoff/export folder.', 'Set editor roles.', 'Keep publishing separate from editing.']
  },
  'captions-ai': {
    website: 'https://www.captions.ai',
    docs: 'https://www.captions.ai',
    pricing: 'https://www.captions.ai/pricing',
    recommendedPlan: 'Captions AI workspace for approved reels/shorts support',
    planReason: 'Use for short-form extraction, captioning, and vertical video support after content approval.',
    keyLabel: 'OAuth / workspace token',
    fields: ['Workspace ID', 'OAuth status', 'Template profile', 'Export folder'],
    setup: ['Create workspace.', 'Configure caption style.', 'Define export handoff.', 'Keep claims approval-gated before rendering.']
  },
  canva: {
    website: 'https://www.canva.com',
    docs: 'https://www.canva.dev/docs',
    pricing: 'https://www.canva.com/pricing/',
    recommendedPlan: 'Canva Pro/Teams for posters and carousel production',
    planReason: 'Canva handles brand-safe posters, carousels, and platform creative assets after content is approved.',
    keyLabel: 'Canva OAuth token',
    fields: ['OAuth app', 'Brand kit', 'Template folder', 'Export owner'],
    setup: ['Create Canva app/workspace.', 'Configure brand kit.', 'Create approved template folders.', 'Route output to scheduling queue.']
  },
  figma: {
    website: 'https://www.figma.com',
    docs: 'https://www.figma.com/developers/api',
    pricing: 'https://www.figma.com/pricing/',
    recommendedPlan: 'Figma Professional/Organization for premium visual systems',
    planReason: 'Figma supports institution-grade campaign systems, premium visuals, and reusable design components.',
    keyLabel: 'Figma token / OAuth',
    fields: ['File key', 'Team ID', 'OAuth status', 'Design system file'],
    setup: ['Create design system file.', 'Set team/library permissions.', 'Configure API/OAuth if needed.', 'Export approved visuals only.']
  },
  linkedin: {
    website: 'https://www.linkedin.com',
    docs: 'https://learn.microsoft.com/linkedin/',
    pricing: 'https://business.linkedin.com/marketing-solutions/ads',
    recommendedPlan: 'LinkedIn page + Ads access after founder and CFO approval',
    planReason: 'LinkedIn is the primary authority engine; publishing and paid boosts must stay approval-controlled.',
    keyLabel: 'LinkedIn OAuth token',
    fields: ['Page ID', 'OAuth app', 'Ad account', 'Approval gate'],
    setup: ['Configure LinkedIn app/page.', 'Request required permissions.', 'Keep posts in approval queue.', 'Do not auto-publish sensitive claims.']
  },
  meta: {
    website: 'https://business.facebook.com',
    docs: 'https://developers.facebook.com/docs',
    pricing: 'https://www.facebook.com/business/ads/pricing',
    recommendedPlan: 'Meta Business integration for Facebook Page and Instagram Business publishing',
    planReason: 'Meta owns both Facebook Page publishing and Instagram Business publishing, so CTO should store the platform token before CMO morning posting runs.',
    keyLabel: 'Meta access token',
    fields: ['Meta access token', 'Facebook Page ID', 'Instagram business ID', 'Approval gate'],
    setup: ['Verify Meta Business.', 'Connect Facebook Page and Instagram Business account.', 'Save token and account IDs in CTO.', 'Route every publish action through CMO approval rules.']
  },
  instagram: {
    website: 'https://www.instagram.com',
    docs: 'https://developers.facebook.com/docs/instagram-platform',
    pricing: 'https://www.facebook.com/business/ads/pricing',
    recommendedPlan: 'Meta Business integration after account verification',
    planReason: 'Instagram supports educational reels and process proof, but publishing must stay brand-safe.',
    keyLabel: 'Meta OAuth token',
    fields: ['Instagram business ID', 'Meta app', 'Ad account', 'Approval gate'],
    setup: ['Verify Meta Business.', 'Connect Instagram business account.', 'Configure app permissions.', 'Route reels through approval.']
  },
  facebook: {
    website: 'https://www.facebook.com',
    docs: 'https://developers.facebook.com/docs/pages-api',
    pricing: 'https://www.facebook.com/business/ads/pricing',
    recommendedPlan: 'Meta Business page integration after account verification',
    planReason: 'Facebook carries institutional export presence and educational business posts.',
    keyLabel: 'Meta OAuth token',
    fields: ['Page ID', 'Meta app', 'Ad account', 'Approval gate'],
    setup: ['Verify Meta Business.', 'Connect page.', 'Configure posting permissions.', 'Route posts through approval.']
  },
  youtube: {
    website: 'https://www.youtube.com',
    docs: 'https://developers.google.com/youtube/v3',
    pricing: 'https://developers.google.com/youtube/v3/getting-started#quota',
    recommendedPlan: 'YouTube Data API with quota monitoring',
    planReason: 'YouTube carries long-form founder authority videos and requires upload, analytics, and quota governance.',
    keyLabel: 'Google OAuth token',
    fields: ['Channel ID', 'OAuth client', 'Upload scope', 'Quota monitor'],
    setup: ['Create Google Cloud project.', 'Enable YouTube Data API.', 'Configure OAuth consent.', 'Keep uploads approval-gated.']
  },
  metricool: {
    website: 'https://metricool.com',
    docs: 'https://metricool.com/api-docs/',
    pricing: 'https://metricool.com/pricing/',
    recommendedPlan: 'Metricool scheduler workspace after social accounts are approved',
    planReason: 'Metricool is the primary scheduling queue for approved content and platform performance monitoring.',
    keyLabel: 'Metricool API key / OAuth',
    fields: ['Workspace ID', 'API key', 'Connected profiles', 'Queue rules'],
    setup: ['Create workspace.', 'Connect approved profiles.', 'Configure schedule queue.', 'Keep final posting approval-controlled.']
  },
  buffer: {
    website: 'https://buffer.com',
    docs: 'https://buffer.com/developers/api',
    pricing: 'https://buffer.com/pricing',
    recommendedPlan: 'Buffer pending only unless Metricool is unsuitable',
    planReason: 'Buffer remains a fallback scheduling placeholder, not the primary workflow.',
    keyLabel: 'Buffer OAuth token',
    fields: ['OAuth app', 'Profile IDs', 'Queue rules', 'Fallback policy'],
    setup: ['Keep as fallback.', 'Configure only if Metricool cannot cover scheduling.', 'Route posts through approval queue.']
  },
  forex: {
    website: 'https://exchangeratesapi.io',
    docs: 'https://exchangeratesapi.io/documentation/',
    pricing: 'https://exchangeratesapi.io/pricing/',
    recommendedPlan: 'Paid exchange-rate API tier with sufficient daily quota',
    planReason: 'Pricing workflows need stable FX refreshes, quota headroom, and retry handling.',
    keyLabel: 'Forex feed API key',
    fields: ['API key', 'Base currency', 'Allowed currencies', 'Refresh interval'],
    setup: ['Select FX provider.', 'Create API key.', 'Map supported currencies.', 'Verify retry and manual override behavior.']
  },
  news: {
    website: 'https://newsapi.org',
    docs: 'https://newsapi.org/docs',
    pricing: 'https://newsapi.org/pricing',
    recommendedPlan: 'Developer tier for testing; paid tier before production intelligence feeds',
    planReason: 'Market intelligence should move to a paid tier only after source quality and update frequency are validated.',
    keyLabel: 'News feed API key',
    fields: ['API key', 'Source list', 'Allowed countries', 'Refresh interval'],
    setup: ['Choose approved news provider.', 'Create API key.', 'Define allowed sources.', 'Log feed freshness and source attribution.']
  },
  trademap: {
    website: 'https://www.trademap.org',
    docs: 'https://www.trademap.org/Index.aspx',
    pricing: 'https://www.trademap.org',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'TradeMap account/export workflow under CTO-controlled source rules',
    planReason: 'TradeMap supports trade-flow validation for CIO market intelligence. Use approved exports/API access only; no fake live claims.',
    keyLabel: 'TradeMap credential/export token',
    fields: ['Account login', 'API/export access', 'HS code mapping', 'Sync schedule'],
    setup: [`Use ${ctoDefaultLoginEmail} if account login is required.`, 'Confirm allowed data export method.', 'Map APEDA/Spice products to HS codes.', 'Import with source URL and timestamp audit.']
  },
  'un-comtrade': {
    website: 'https://comtradeplus.un.org',
    docs: 'https://comtradedeveloper.un.org',
    pricing: 'https://comtradeplus.un.org',
    recommendedPlan: 'UN Comtrade API subscription/key for trade-volume validation',
    planReason: 'Comtrade is a primary official source for country/product trade volumes and should feed CIO market signals with rate-limit handling.',
    keyLabel: 'UN Comtrade API key',
    fields: ['API key', 'Reporter/partner mapping', 'HS codes', 'Rate limit'],
    setup: ['Create/verify Comtrade API access.', 'Save API key.', 'Map products to commodity codes.', 'Run backend sync with source attribution.']
  },
  kompass: {
    website: 'https://www.kompass.com',
    docs: 'https://www.kompass.com',
    pricing: 'https://www.kompass.com',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'Kompass approved directory export or API workflow',
    planReason: 'Kompass can support verified importer company discovery when terms allow export/import into CIO.',
    keyLabel: 'Kompass API/export credential',
    fields: ['Account login', 'Export/API access', 'Allowed categories', 'Import file'],
    setup: [`Use ${ctoDefaultLoginEmail} only for account login if required.`, 'Confirm terms for importer data export.', 'Download approved CSV/API feed.', 'Run dedupe and verification scoring before CIO use.']
  },
  tradeatlas: {
    website: 'https://www.tradeatlas.com',
    docs: 'https://www.tradeatlas.com',
    pricing: 'https://www.tradeatlas.com',
    loginAccount: ctoDefaultLoginEmail,
    recommendedPlan: 'TradeAtlas account/API if subscription is approved',
    planReason: 'TradeAtlas can enrich trade corridor and buyer signals after subscription terms and source usage are approved.',
    keyLabel: 'TradeAtlas API/export credential',
    fields: ['Account login', 'API/export token', 'Country/product access', 'Sync cadence'],
    setup: [`Use ${ctoDefaultLoginEmail} if login is required.`, 'Confirm subscription/export permission.', 'Map fields to importer_records and market_signals.', 'Run backend import audit.']
  },
  apeda: {
    website: 'https://apeda.gov.in',
    docs: 'https://apeda.gov.in',
    pricing: 'Public reference source',
    recommendedPlan: 'APEDA public reference ingestion for products, certification, and export context',
    planReason: 'APEDA references help validate product/certification mapping for Indian export workflows.',
    keyLabel: 'Reference URL/feed path',
    fields: ['Reference URL', 'Product category', 'Update schedule', 'Source audit'],
    setup: ['Confirm APEDA reference pages.', 'Store source URLs.', 'Map product categories.', 'Refresh reference snapshots with timestamps.']
  },
  'spice-board': {
    website: 'https://www.indianspices.com',
    docs: 'https://www.indianspices.com',
    pricing: 'Public reference source',
    recommendedPlan: 'Spice Board public reference ingestion for spice products and export context',
    planReason: 'Spice Board references support spice-specific product, certification, and source validation.',
    keyLabel: 'Reference URL/feed path',
    fields: ['Reference URL', 'Spice/product mapping', 'Update schedule', 'Source audit'],
    setup: ['Confirm Spice Board reference pages.', 'Store source URLs.', 'Map spice products.', 'Refresh reference snapshots with timestamps.']
  }
};

function CTOSummaryBar({ health, summary, lastSync, liveConnected }) {
  if (!summary) return <MetricSkeletonGrid />;
  const healthScore = Number(String(health.label).replace(/[^0-9.-]/g, '')) || (health.state === 'online' || health.state === 'success' || health.state === 'progress' ? 92 : health.state === 'attention' ? 62 : 38);
  const items = [
    ['System Health', health.label, health.state],
    ['Active Incidents', liveConnected ? summary.activeIncidents : 'Awaiting', liveConnected && summary.activeIncidents ? 'attention' : 'progress'],
    ['Workflow Failures', liveConnected ? summary.failedWorkflows : 'Awaiting', liveConnected && summary.failedWorkflows ? 'attention' : 'progress'],
    ['Credit Risks', liveConnected ? summary.creditRisks : 'Awaiting', liveConnected && summary.creditRisks ? 'attention' : 'progress'],
    ['Last Sync Time', lastSync, lastSync === 'No recent sync' ? 'progress' : 'online']
  ];
  return (
    <section className="cto-summary-bar">
      {items.map(([label, value, state]) => (
        <div key={label}>
          <span>{label}</span>
          {label === 'System Health' ? (
            <RingProgress
              value={healthScore}
              size={52}
              color={state === 'online' || state === 'success' || state === 'progress' ? 'var(--success)' : state === 'attention' ? 'var(--warning)' : 'var(--error)'}
              label="CTO system health"
            />
          ) : <strong>{value}</strong>}
          <i className={`cto-dot state-${state}`} />
        </div>
      ))}
    </section>
  );
}

function CTOSupabaseFinalCheck({ connection }) {
  const live = Boolean(connection?.live);
  const needsKey = !supabaseConfigStatus.hasAnonKey;
  const needsUrl = !supabaseConfigStatus.hasUrl;
  const needsAuth = connection?.status === 'Verification Required' || connection?.health === 'Auth Required';
  const action = live
    ? 'Supabase is live. Keep RLS, tenant filters, and migration checks active.'
    : needsAuth
      ? 'Supabase credentials are configured. Sign in with the founder account to verify tenant RLS and load live business data.'
    : needsUrl || needsKey
      ? 'Add VITE_SUPABASE_URL and a Supabase publishable key to .env, then restart the dev server.'
      : 'Credentials exist, but live query failed. Check migrations, RLS policies, Data API grants, and project status.';
  return (
    <section className={`cto-supabase-final-check ${live ? 'live' : 'pending'}`} aria-label="CTO Supabase final connection check">
      <div className="cto-supabase-final-title">
        <Database size={18} />
        <div>
          <span>CTO Final Check</span>
          <h2>Supabase Connection</h2>
        </div>
      </div>
      <div className="cto-supabase-final-grid">
        <div><span>Status</span><strong>{connection?.status || 'Connect Supabase to activate'}</strong></div>
        <div><span>Health</span><strong>{connection?.health || 'Configuration Missing'}</strong></div>
        <div><span>Project</span><strong>{connection?.projectRef || supabaseConfigStatus.projectRef || 'Not configured'}</strong></div>
        <div><span>URL Env</span><strong>{supabaseConfigStatus.hasUrl ? 'Configured' : 'Missing'}</strong></div>
        <div><span>Publishable Key</span><strong>{supabaseConfigStatus.hasAnonKey ? 'Configured' : 'Missing'}</strong></div>
        <div><span>Last Check</span><strong>{connection?.lastChecked || 'Not checked'}</strong></div>
      </div>
      <p>{connection?.message || 'Supabase live query has not passed yet.'}</p>
      <div className="cto-supabase-action">
        {live ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
        <span>{action}</span>
      </div>
    </section>
  );
}

function CTOTabBar({ activeTab, onSelect }) {
  return (
    <nav className="cto-tabbar" aria-label="CTO sections">
      {ctoTabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => onSelect(tab)}>{tab}</button>)}
    </nav>
  );
}

function CTOIntegrationsTable({ services = integrationServicesSeed, liveConnected, savedSecrets, onSaveSecret, onOpen, compact = false }) {
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const visibleOrder = compact ? ctoCoreServiceOrder : ctoServiceOrder;
  const allRows = visibleOrder.map((id) => serviceMap.get(id) || {
    id,
    service_name: ctoServiceNameFor(id),
    status: 'Awaiting Connection',
    environment: 'Production',
    last_verified: 'Awaiting integration',
    quota_remaining: 'No live data connected'
  });
  const connectedRows = [];
  const waitingRows = [];
  allRows.forEach((service) => {
    const localState = getLocalIntegrationState(service, liveConnected, savedSecrets);
    const row = { service, localState };
    if (localState.status === 'Connected') connectedRows.push(row);
    else waitingRows.push(row);
  });
  const groupedRows = connectedRows.length
    ? [['Connected services', connectedRows], ['Waiting setup', waitingRows]]
    : [['Foundation services', waitingRows]];
  return (
    <section className={`cto-panel ${compact ? 'cto-anchor-panel' : ''}`}>
      <CTOSectionHeader title="Integrations + APIs" icon={KeyRound} />
      <div className="cto-operational-table cto-integrations-table">
        <div className="cto-table-head"><span>Service</span><span>Status</span><span>Environment</span><span>Last Check</span><span>Action</span></div>
        {groupedRows.map(([group, rows]) => rows.length ? (
          <Fragment key={group}>
            <div className="cto-table-divider">{group}</div>
            {rows.map(({ service, localState }) => (
              <button key={service.id} onClick={() => onOpen(...buildIntegrationDetail(service, liveConnected, savedSecrets, onSaveSecret))}>
                <strong>{service.service_name}</strong>
                <CTOConnectionState status={localState.status} />
                <span>{service.environment || 'Production'}</span>
                <span>{localState.lastCheck}</span>
                <span>{localState.action}</span>
              </button>
            ))}
          </Fragment>
        ) : null)}
      </div>
      {compact && <p className="cto-panel-note">Core technical foundations shown here. Open Integrations for the full media, publishing, and platform connector inventory.</p>}
    </section>
  );
}

function CTOConnectionState({ status }) {
  const isLive = status === 'Connected';
  return <span className="cto-connection-state"><i className={`cto-dot state-${getCtoState(status)} ${isLive ? 'live' : ''}`} />{isLive ? <><b>LIVE</b><em>Connected</em></> : status}</span>;
}

function CIODataSourceSetupPanel({ requests, savedSecrets = {}, onSaveSecret, onOpen, compact = false }) {
  const visibleRequests = compact ? requests.slice(0, 4) : requests;
  return (
    <section className={`cto-panel cto-cio-source-panel ${compact ? 'cto-support-panel' : ''}`}>
      <CTOSectionHeader title="CIO Data Source Setup Queue" icon={Database} />
      <p>CTO owns source setup, credential review, sync jobs, and import audit before CIO uses importer or market data.</p>
      <div className="cto-operational-table cto-cio-source-table">
        <div className="cto-table-head"><span>Source</span><span>Requirement</span><span>Priority</span><span>Status</span><span>Next Action</span><span>Action</span></div>
        {visibleRequests.map((request) => (
          <button key={request.id} onClick={() => onOpen('CIO Data Source', request.source, [
            ['Owner', request.owner],
            ['Requirement', request.requirement],
            ['Purpose', request.purpose],
            ['Priority', request.priority],
            ['Status', request.status],
            ['Last Check', savedSecrets[request.id]?.savedAt || 'No recent sync'],
            ['Next Action', request.nextAction],
            ['Connection Formula', 'CTO setup -> credential/source validation -> sync job -> import audit -> CIO use']
          ], {
            provider: {
              website: sourceWebsiteFor(request.source),
              docs: sourceWebsiteFor(request.source),
              pricing: sourceWebsiteFor(request.source),
              recommendedPlan: request.priority === 'Critical' ? 'Controlled CTO acquisition plan before any CIO data use' : 'CTO-reviewed connector or approved source access',
              planReason: request.purpose,
              keyLabel: request.requirement.includes('API') ? `${request.source} API key or access token` : `${request.source} connector/source value`,
              fields: ['Credential or source link', 'Allowed usage scope', 'Refresh frequency', 'Import owner'],
              setup: ['Confirm source terms and allowed usage.', 'Add credentials or approved source file/link.', 'Run validation and dedupe checks.', 'Create import audit before CIO uses records.']
            },
            integration: { id: request.id, service_name: request.source, environment: 'CTO Setup', status: request.status },
            savedSecret: savedSecrets[request.id],
            onSaveSecret
          })}>
            <strong>{request.source}</strong>
            <span>{request.requirement}</span>
            <PriorityBadge priority={request.priority} />
            <span><i className="cto-dot state-attention" />{request.status}</span>
            <span>{request.nextAction}</span>
            <span className="cto-connect-cell">Connect</span>
          </button>
        ))}
      </div>
      {compact && <button className="cto-inline-action" onClick={() => onOpen('CIO Data Sources', 'Full setup queue', [['State', 'Support queue'], ['Sources', `${requests.length} setup items`], ['Next Action', 'Open CTO integration detail rows to connect approved sources.']])}>Review full CIO setup queue</button>}
    </section>
  );
}

function WorkflowReliabilityPanel({ queue = [], systems = [], liveConnected, onRetry, onOpen }) {
  const rows = buildWorkflowRows(queue, systems, liveConnected);
  const retryRow = rows.find((row) => row.area === 'Retry queue');
  const hasRetryWork = retryRow?.state === 'Sync Delayed';
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Workflow Reliability + System Health" icon={Workflow} />
      <div className="cto-operational-table cto-workflow-table">
        <div className="cto-table-head"><span>Area</span><span>State</span><span>Owner</span><span>Next Action</span></div>
        {rows.map((row) => (
          <button key={row.id} onClick={() => onOpen('Workflow', row.area, [
            ['State', row.state],
            ['Owner', row.owner],
            ['Signal', row.signal],
            ['Next Action', row.action]
          ])}>
            <strong>{row.area}</strong>
            <span><i className={`cto-dot state-${getCtoState(row.state)}`} />{row.state}</span>
            <span>{row.owner}</span>
            <span>{row.action}</span>
          </button>
        ))}
      </div>
      <button
        className="cto-inline-action"
        onClick={() => hasRetryWork
          ? onRetry(retryRow?.source || 'Retry queue')
          : onOpen('Retry queue', 'Retry queue health', [
            ['State', retryRow?.state || 'Connected'],
            ['Signal', retryRow?.signal || 'No live retry failures'],
            ['Next Action', 'No retry needed'],
            ['Mode', liveConnected ? 'Live Supabase workflow data' : 'Awaiting live connection']
          ])}
      >
        {hasRetryWork ? 'Prepare retry queue' : 'Retry queue healthy'}
      </button>
    </section>
  );
}

function CriticalIncidentsPanel({ incidents = [], liveConnected, onOpen }) {
  const critical = liveConnected ? incidents.filter((incident) => ['Critical', 'High', 'High Risk'].includes(incident.severity)).slice(0, 5) : [];
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Critical Incidents" icon={TriangleAlert} />
      <div className="cto-operational-table cto-incident-table">
        <div className="cto-table-head"><span>Title</span><span>Severity</span><span>Owner</span><span>Next Action</span></div>
        {critical.length ? critical.map((incident) => (
          <button key={incident.id || incident.title} onClick={() => onOpen('Incident', incident.title, [
            ['Severity', incident.severity],
            ['Impact', incident.business_impact || incident.impact || 'Awaiting live impact data'],
            ['Owner', incident.owner || 'CTO Command'],
            ['Next Action', incident.next_action || incident.action || 'Verification pending']
          ])}>
            <div className="cto-incident-primary"><strong>{incident.title}</strong><SeverityBadge severity={incident.severity} /></div>
            <span>{incident.business_impact || incident.impact || 'Awaiting live impact data'}</span>
            <span>{incident.owner || 'CTO Command'}</span>
            <span>{incident.next_action || incident.action || 'Verification pending'}</span>
          </button>
        )) : <div className="cto-empty-state">No critical incidents connected</div>}
      </div>
    </section>
  );
}

function SubscriptionPaymentWatch({ items = [], liveConnected, savedSecrets = {}, onOpen, onCreateRequirement }) {
  const watched = [
    ['OpenAI credits', 'openai'],
    ['Supabase usage', 'supabase'],
    ['Vercel usage', 'vercel'],
    ['WhatsApp quota', 'whatsapp'],
    ['domain renewal', 'cloudflare']
  ];
  const rows = watched.map((label) => {
    const [displayLabel, serviceId] = label;
    const match = items.find((item) => `${item.service || item.label}`.toLowerCase().includes(displayLabel.split(' ')[0].toLowerCase()) || (displayLabel === 'domain renewal' && `${item.service || item.label}`.toLowerCase().includes('domain')));
    return { ...(match || { id: displayLabel, service: displayLabel, status: 'Awaiting Connection', remaining: 'No live data connected', renewal_note: 'Awaiting integration' }), serviceId };
  });
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Subscription & Payment Watch" icon={CircleDollarSign} />
      <div className="cto-operational-table cto-payment-watch-table">
        <div className="cto-table-head"><span>Risk</span><span>Status</span><span>State</span></div>
        {rows.map((item) => {
          const localState = getPaymentWatchState(item, liveConnected, savedSecrets);
          const status = localState.status;
          return (
            <button key={item.id || item.service || item.label} onClick={() => onOpen('Payment Watch', item.service || item.label, [
              ['Status', status],
              ['State', localState.state],
              ['Last Check', localState.lastCheck],
              ['Action', localState.action]
            ])}>
              <strong>{item.service || item.label}</strong>
              <CTOConnectionState status={status} />
              <span>{localState.state}</span>
            </button>
          );
        })}
      </div>
      <button className="cto-inline-action" onClick={() => onCreateRequirement(rows[0])}>Create payment requirement</button>
    </section>
  );
}

function DeploymentReadinessPanel({ logs = [], liveConnected, onOpen }) {
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Deployment Readiness" icon={UploadCloud} />
      <div className="cto-operational-table cto-deployment-table">
        <div className="cto-table-head"><span>Check</span><span>Status</span><span>Readiness</span></div>
        {logs.map((log) => {
          const status = normalizeConnectionState(liveConnected ? log.status : 'Verification Pending');
          return (
            <button key={log.id} onClick={() => onOpen('Deployment', log.label || log.name, [
              ['Status', status],
              ['Readiness', liveConnected ? (log.value || log.event || 'No recent sync') : 'Verification pending'],
              ['Detail', log.note || 'Awaiting integration']
            ])}>
              <strong>{log.label || log.name}</strong>
              <span><i className={`cto-dot state-${getCtoState(status)}`} />{status}</span>
              <span>{liveConnected ? cleanCtoLabel(log.value || log.event) : 'Verification pending'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TechnicalAuditTimeline({ events = [], liveConnected, onOpen, notice }) {
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Technical Audit Timeline" icon={Activity} />
      <div className="cto-audit-timeline">
        {!liveConnected && <p>{notice}</p>}
        {events.slice(0, 5).map((entry) => {
          const row = Array.isArray(entry)
            ? { id: `${entry[0]}-${entry[1]}`, time: entry[0], event: entry[1], actor: 'System', status: entry[2] }
            : entry;
          return (
            <button key={row.id} onClick={() => onOpen('Audit Event', row.event, [
              ['Time', liveConnected ? row.time : 'No recent sync'],
              ['Actor', row.actor || 'System'],
              ['Status', cleanCtoLabel(row.status)],
              ['State', liveConnected ? 'Connected' : 'No live data connected']
            ])}>
              <time>{liveConnected ? row.time : 'No recent sync'}</time>
              <strong>{row.event}</strong>
              <span>{cleanCtoLabel(row.status)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CTOMediaStackPanel({ items = [], onOpen }) {
  return (
    <section className="cto-panel cto-cmo-stack-panel">
      <CTOSectionHeader title="CMO Media + AI Video Stack" icon={Bot} />
      <p>CTO prepares the media architecture for CMO Growth Engine. Real founder video remains primary; HeyGen is backup/support only. No AI avatar, edit, schedule, or publish action runs without founder-approved workflow gates.</p>
      <div className="cto-operational-table cto-cmo-media-table">
        <div className="cto-table-head"><span>Tool</span><span>Role</span><span>Status</span><span>Owner</span></div>
        {items.map((item) => (
          <button key={item.id} onClick={() => onOpen('CMO Media Stack', item.tool, [
            ['Role', item.role],
            ['Status', item.status],
            ['Owner', item.owner],
            ['Architecture Note', item.architecture_note]
          ])}>
            <strong>{item.tool}</strong>
            <span>{item.role}</span>
            <span><i className={`cto-dot state-${getCtoState(item.status)}`} />{item.status}</span>
            <span>{item.owner}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CTOSocialPublishingPanel({ items = [], onOpen }) {
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Social Publishing Architecture" icon={RadioTower} />
      <div className="cto-operational-table cto-social-table">
        <div className="cto-table-head"><span>Platform</span><span>Role</span><span>Status</span></div>
        {items.map((item) => (
          <button key={item.id} onClick={() => onOpen('Social Publishing', item.platform, [
            ['Role', item.role],
            ['Status', item.status],
            ['Content Rule', item.content_rule],
            ['Publishing State', item.publishing_state]
          ])}>
            <strong>{item.platform}</strong>
            <span>{item.role}</span>
            <span><i className={`cto-dot state-${getCtoState(item.status)}`} />{item.status}</span>
          </button>
        ))}
      </div>
      <p className="pricing-note">Publishing is architecture-only until platform APIs, approval gates, and scheduling credentials are connected.</p>
    </section>
  );
}

function CTOPublishingWorkflowPanel({ workflow = [], onOpen, compact = false }) {
  const visibleWorkflow = compact ? workflow.slice(0, 4) : workflow;
  return (
    <section className="cto-panel">
      <CTOSectionHeader title="Publishing / Automation Workflow" icon={Workflow} />
      <div className="cto-operational-table cto-publishing-flow-table">
        <div className="cto-table-head"><span>Stage</span><span>Owner</span><span>Status</span><span>Next Action</span></div>
        {visibleWorkflow.map((step) => (
          <button key={step.id} onClick={() => onOpen('CMO Publishing Workflow', step.stage, [
            ['Owner', step.owner],
            ['Status', step.status],
            ['Next Action', step.next_action],
            ['Style Rule', 'Globally experienced, operationally disciplined, founder-led, export-industry authority. Not generic influencer content.']
          ])}>
            <strong>{step.stage}</strong>
            <span>{step.owner}</span>
            <span><i className={`cto-dot state-${getCtoState(step.status)}`} />{step.status}</span>
            <span>{step.next_action}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CTOSectionHeader({ title, icon: Icon }) {
  return <div className="cto-section-header"><h2>{title}</h2><Icon size={17} /></div>;
}

function CTODetailDrawer({ detail, onClose }) {
  const isIntegration = detail?.type === 'Integration' && detail?.integration;
  const isConnectable = !!detail?.provider && !!detail?.integration;
  const serviceId = detail?.integration?.id;
  const provider = detail?.provider || ctoProviderCatalog[serviceId] || ctoProviderCatalog.openai;
  const [form, setForm] = useState({ apiKey: '', secondary: provider.loginAccount || ctoDefaultLoginEmail, environment: detail?.integration?.environment || 'Production', notes: '' });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const sessionPin = '';

  useEffect(() => {
    setForm({ apiKey: '', secondary: provider.loginAccount || ctoDefaultLoginEmail, environment: detail?.integration?.environment || 'Production', notes: '' });
    setPinInput('');
    setPinError('');
    setRevealed(false);
  }, [detail?.title, detail?.integration?.id, provider.loginAccount]);

  if (!detail) return null;

  function saveSecret(event) {
    event.preventDefault();
    if (!form.apiKey.trim()) {
      setPinError('API key is required before saving.');
      return;
    }
    detail.onSaveSecret?.(serviceId, {
      serviceName: detail.title,
      apiKey: form.apiKey.trim(),
      secondary: form.secondary.trim(),
      environment: form.environment,
      notes: form.notes.trim()
    });
    setForm((current) => ({ ...current, apiKey: '' }));
    setPinError('');
  }

  function revealSecret() {
    if (!sessionPin) return;
    if (pinInput !== sessionPin) {
      setPinError('PIN does not match the current founder login session.');
      setRevealed(false);
      return;
    }
    setPinError('');
    setRevealed(true);
  }

  function verifySavedSecret() {
    if (!detail.savedSecret?.apiKey) {
      setPinError('No saved key is available to verify.');
      return;
    }
    detail.onSaveSecret?.(serviceId, {
      ...detail.savedSecret,
      serviceName: detail.title,
      apiKey: detail.savedSecret.apiKey
    });
  }

  return (
    <div className="cto-detail-backdrop" onClick={onClose}>
      <aside className="cto-detail-drawer" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>{detail.type}</span>
          <h2>{detail.title}</h2>
          <button className="drawer-back-button" onClick={onClose}><ArrowLeft size={15} />Back</button>
        </header>
        <dl>
          {detail.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{cleanCtoLabel(value)}</dd></div>)}
        </dl>
        {isConnectable && (
          <div className="cto-provider-detail">
            <section>
              <h3>Website Details</h3>
              {String(provider.website || '').startsWith('http')
                ? <a href={provider.website} target="_blank" rel="noreferrer">Provider website <ArrowUpRight size={14} /></a>
                : <p>{provider.website}</p>}
              {String(provider.docs || '').startsWith('http') && <a href={provider.docs} target="_blank" rel="noreferrer">API documentation <ArrowUpRight size={14} /></a>}
              {String(provider.pricing || '').startsWith('http') && <a href={provider.pricing} target="_blank" rel="noreferrer">Current pricing <ArrowUpRight size={14} /></a>}
              {provider.loginAccount && <p>Use login account: <strong>{provider.loginAccount}</strong>. Complete OAuth/login in the provider window; CTO stores only tokens/keys, not passwords.</p>}
            </section>
            <section>
              <h3>Recommended Plan</h3>
              <strong>{provider.recommendedPlan}</strong>
              <p>{provider.planReason}</p>
            </section>
            <section>
              <h3>Required Setup</h3>
              <div className="cto-requirement-list">
                {provider.fields.map((field) => <span key={field}>{field}</span>)}
              </div>
              <ol>
                {provider.setup.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>
            <form className="cto-api-key-form" onSubmit={saveSecret}>
              <h3>Save Connection Values</h3>
              <label>
                <span>{provider.keyLabel}</span>
                <input aria-label="API key" type="password" value={form.apiKey} onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))} placeholder="Paste API key or token" />
              </label>
              <label>
                <span>Secondary value</span>
                <input value={form.secondary} onChange={(event) => setForm((current) => ({ ...current, secondary: event.target.value }))} placeholder="Project ID, account ID, webhook secret, or endpoint" />
              </label>
              <label>
                <span>Environment</span>
                <select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}>
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </label>
              <label>
                <span>Notes</span>
                <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Quota, plan, or verification note" />
              </label>
              <button type="submit">Save connection</button>
            </form>
            {detail.savedSecret && (
              <section className="cto-saved-secret">
                <h3>Saved Key</h3>
                <div><span>Saved</span><strong>{detail.savedSecret.savedAt}</strong></div>
                <div><span>Masked key</span><strong>{detail.savedSecret.maskedKey}</strong></div>
                <div><span>Verification</span><strong>{detail.savedSecret.verificationStatus || 'Verification Pending'}</strong></div>
                {detail.savedSecret.verificationMessage && <p>{detail.savedSecret.verificationMessage}</p>}
                <button type="button" className="cto-verify-now" onClick={verifySavedSecret}>Verify now</button>
                {sessionPin ? (
                  <div className="cto-pin-reveal">
                    <input type="password" value={pinInput} onChange={(event) => setPinInput(event.target.value)} placeholder="Enter login PIN to reveal" />
                    <button type="button" onClick={revealSecret}>Reveal key</button>
                    {revealed && <code>{detail.savedSecret.apiKey}</code>}
                  </div>
                ) : (
                  <p>PIN is not stored in the frontend. Secret reveal requires connected backend PIN verification.</p>
                )}
              </section>
            )}
            {pinError && <p className="cto-form-error">{pinError}</p>}
          </div>
        )}
      </aside>
    </div>
  );
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
      {!compact && (
        <>
          <div className="payment-band-list">
            {paymentApprovalBands.map(([title, range, condition, approval]) => <article key={title}><strong>{title}</strong><span>{range}</span><p>{condition}</p><small>{approval}</small></article>)}
          </div>
          <div className="payment-rule-columns">
            <div><strong>Allowed auto-pay category</strong>{trustedInfrastructureVendors.map((item) => <span key={item}>{item}</span>)}</div>
            <div><strong>Never auto-pay</strong>{neverAutoPayCategories.map((item) => <span key={item}>{item}</span>)}</div>
          </div>
          <PaymentRoleResponsibilityPanel />
          <SecurePaymentConfirmationPanel />
          <PaymentVaultPanel />
          <div className="payment-workflow-chain">
            {paymentWorkflowSteps.map((step, index) => <div key={step}><i>{index + 1}</i><span>{step}</span></div>)}
          </div>
        </>
      )}
    </section>
  );
}

function PaymentRoleResponsibilityPanel() {
  const rows = [
    ['Founder', 'Owns bank/payment authority, OTP verification, and high-risk approvals.'],
    ['CFO', 'Executes payments, enters founder-shared OTP once, manages Payment Vault, validates budgets/risk, and controls audit trail.'],
    ['CTO', 'Detects technical renewal/payment needs, monitors credits/subscriptions, captures invoices/receipts, and monitors infrastructure health.'],
    ['COO', 'Validates operational necessity, workflow dependency, and business continuity impact.']
  ];
  return (
    <section className="payment-role-panel">
      <div className="approval-section-header"><div><span>Role Responsibilities</span><h2>Payment authority separation</h2></div><UsersRound size={18} /></div>
      <div className="payment-role-grid">
        {rows.map(([role, responsibility]) => <article key={role}><strong>{role}</strong><p>{responsibility}</p></article>)}
      </div>
    </section>
  );
}

function SecurePaymentConfirmationPanel() {
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('Waiting for Founder OTP');
  const selectedPayment = paymentVaultRecords[0];

  function submitOtp(event) {
    event.preventDefault();
    if (!otp.trim()) {
      setStatus('OTP required from Founder before CFO can submit.');
      return;
    }
    setStatus('OTP submitted once. Value cleared immediately; audit records event only.');
    setOtp('');
  }

  function cancelPayment() {
    setOtp('');
    setStatus('Payment cancelled. OTP field cleared.');
  }

  function escalateFounder() {
    setOtp('');
    setStatus('Escalated to Founder. OTP field cleared.');
  }

  function freezePayment() {
    setOtp('');
    setStatus('Payment workflow freeze prepared. OTP field cleared.');
  }

  return (
    <section className="secure-payment-panel">
      <div className="approval-section-header"><div><span>OTP Payment Screen</span><h2>Secure CFO confirmation</h2></div><LockKeyhole size={18} /></div>
      <div className="secure-payment-summary">
        {[
          ['Vendor', selectedPayment?.vendor_name || 'No payment selected'],
          ['Amount', selectedPayment?.amount_inr || 'Pending'],
          ['Reason', selectedPayment?.payment_reason || 'Pending'],
          ['Category', selectedPayment?.category || 'Pending'],
          ['Approval Chain', selectedPayment?.approval_path || 'Pending'],
          ['Risk Level', 'Low / trusted infrastructure'],
          ['Payment Status', status]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <form className="otp-confirmation-form" onSubmit={submitOtp}>
        <label className="secure-input">
          <span>OTP / Verification Code</span>
          <input
            value={otp}
            inputMode="numeric"
            autoComplete="one-time-code"
            type="password"
            placeholder="Founder shares OTP externally; CFO enters once"
            onChange={(event) => setOtp(event.target.value.replace(/[^\d]/g, '').slice(0, 8))}
          />
          <small>OTP is transient UI input only. It is never stored, logged, saved to browser storage, sent to AI memory, or shown after submission.</small>
        </label>
        <div className="otp-action-row">
          <button type="submit">Submit OTP & Complete Payment</button>
          <button type="button" onClick={cancelPayment}>Cancel Payment</button>
          <button type="button" onClick={escalateFounder}>Escalate to Founder</button>
          <button type="button" onClick={freezePayment}>Freeze Payment Workflow</button>
        </div>
      </form>
      <div className="otp-security-rules">
        {['Founder manually shares OTP', 'CFO enters OTP once', 'OTP cleared immediately after action', 'OTP never stored or logged', 'No auto-reading or AI handling', 'No banking verification bypass'].map((rule) => <span key={rule}>{rule}</span>)}
      </div>
      <div className="payment-audit-events">
        <strong>Audit events recorded without OTP values</strong>
        {otpAuditEvents.map((event) => <span key={event}>{event}</span>)}
      </div>
    </section>
  );
}

export { IntegrationsVault };
export default CTOCommandPage;
