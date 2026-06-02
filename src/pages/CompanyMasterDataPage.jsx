import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  FileCheck2,
  FileText,
  Network,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  UploadCloud
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { StatusBadge, StatusPulse } from '../shared/uiPrimitives.jsx';
import { displayDateTime } from '../utils/dateTime.js';
import { backendStatus } from '../lib/supabaseClient.js';
import {
  demoTenantId,
  getCompanyAuditLog,
  getCompanyDocuments,
  getCompanyProfile,
  getCompanyRegistrations,
  getDocumentDefaults,
  getLutDetails,
  saveCompanyDocument,
  saveCompanyProfile,
  saveCompanyRegistration,
  saveDocumentDefaults,
  saveLutDetails
} from '../services/companyService.js';

const approvalRules = [
  ['Quotation approval required before buyer send', 'Sales / Pricing', 'High', 'Founder Review Required'],
  ['Invoice approval required before buyer send', 'Finance', 'High', 'Draft'],
  ['Sensitive document approval required', 'Documentation', 'Critical', 'Needs Review'],
  ['Marketing claim approval required', 'Marketing', 'Medium', 'Draft'],
  ['HS code/origin review required', 'Compliance', 'Critical', 'Founder Review Required'],
  ['Discount approval required above threshold', 'Finance', 'High', 'Draft'],
  ['Payment term approval required', 'Finance', 'High', 'Needs Review'],
  ['High-value order approval required', 'Operations', 'Critical', 'Founder Review Required']
].map(([name, department, risk, status], index) => ({ id: `approval-rule-${index}`, name, department, risk, status }));

const memoryCategories = [
  'Company legal identity',
  'License numbers',
  'Export registrations',
  'Standard invoice fields',
  'Standard quotation fields',
  'Compliance notes',
  'Product defaults',
  'Approval rules',
  'Document templates',
  'Recurring issues',
  'Founder-approved instructions'
];

const licenseExpiryRows = [
  { document: 'FSSAI License', status: 'Needs expiry date', risk: 'High', action: 'Add expiry date before document use' },
  { document: 'Spice Board Certificate', status: 'Missing upload', risk: 'Medium', action: 'Upload certificate pending for review' },
  { document: 'IEC Certificate', status: 'Draft record', risk: 'Medium', action: 'Verify IEC data against founder records' },
  { document: 'Organic Certificate', status: 'Optional / Not uploaded', risk: 'Low', action: 'Upload only if buyer or product claim requires it' }
];

const masterDataAuditTrail = [
  ['09:10', 'Founder Office', 'Company profile draft created', 'Draft'],
  ['09:22', 'System', 'Export registration field updated', 'Needs Review'],
  ['09:40', 'Documentation', 'Document upload pending generated', 'Missing'],
  ['10:05', 'Founder Office', 'Approval rule changed', 'Founder Review Required'],
  ['10:18', 'System', 'Memory sync requested', 'Connect Supabase to activate'],
  ['10:30', 'System', 'Founder review pending', 'Sync Pending']
].map(([time, user, event, status], index) => ({ id: `audit-${index}`, time, user, event, status }));

const tenantReadinessItems = [
  'Tenant company profile',
  'Legal data fields',
  'License repository',
  'Role permissions',
  'Approval rules',
  'Document defaults',
  'Memory namespace',
  'Audit logging',
  'API-ready data model'
];

const masterDataModels = [
  'company_profile',
  'company_registrations',
  'company_documents',
  'document_defaults',
  'export_field_defaults',
  'approval_rules',
  'company_memory_records',
  'master_data_audit_log'
];


function SecureInput({ label, value, onChange, multiline = false, masked = false, error, placeholder = 'Draft value' }) {
  const InputTag = multiline ? 'textarea' : 'input';
  return (
    <label className={`secure-master-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <InputTag
        type={masked ? 'password' : 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function CollapsibleVaultSection({ title, subtitle, icon: Icon = ShieldCheck, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`vault-section ${open ? 'open' : ''}`}>
      <button className="vault-section-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span><Icon size={18} />{title}</span>
        <small>{subtitle}</small>
        <ChevronRight size={17} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="vault-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CompanyMasterDataVault({ onBack }) {
  const [actionMessage, setActionMessage] = useState(backendStatus.mode === 'Connected' ? 'Backend Connected - Company Master Data ready.' : 'Connect Supabase to activate - Backend not connected.');
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [companyProfile, setCompanyProfile] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentDefaults, setDocumentDefaults] = useState(null);
  const [lutDetails, setLutDetails] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    let disposed = false;

    async function loadVaultData() {
      setLoading(true);
      setServiceError('');
      const [profileResult, registrationResult, documentResult, defaultsResult, lutResult, auditResult] = await Promise.all([
        getCompanyProfile(demoTenantId),
        getCompanyRegistrations(demoTenantId),
        getCompanyDocuments(demoTenantId),
        getDocumentDefaults(demoTenantId),
        getLutDetails(demoTenantId),
        getCompanyAuditLog(demoTenantId)
      ]);

      if (disposed) return;
      setCompanyProfile(profileResult.data);
      setRegistrations(registrationResult.data || []);
      setDocuments(documentResult.data || []);
      setDocumentDefaults(defaultsResult.data);
      setLutDetails(lutResult.data);
      setAuditLog(auditResult.data || []);
      const error = [profileResult, registrationResult, documentResult, defaultsResult, lutResult, auditResult].find((result) => result.error)?.error;
      if (error) setServiceError('Unable to load some company data. Unavailable is active.');
      setLoading(false);
    }

    loadVaultData();
    return () => {
      disposed = true;
    };
  }, []);

  function showLocalAction(message) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(backendStatus.mode === 'Connected' ? 'Backend Connected - Company Master Data ready.' : 'Connect Supabase to activate - Backend not connected.'), 4200);
  }

  async function refreshAuditLog() {
    const auditResult = await getCompanyAuditLog(demoTenantId);
    setAuditLog(auditResult.data || []);
  }

  async function handleSaveProfile(payload) {
    setActionMessage('Saving company profile...');
    const result = await saveCompanyProfile(demoTenantId, payload);
    if (result.ok) {
      setCompanyProfile(result.data);
      setActionMessage(backendStatus.mode === 'Connected' ? 'Company profile saved to Supabase.' : 'Company profile saved in local Connect Supabase to activate.');
      await refreshAuditLog();
    } else {
      setServiceError('Company profile save failed.');
      setActionMessage('Company profile save failed.');
    }
    return result;
  }

  async function handleSaveRegistration(payload) {
    const result = await saveCompanyRegistration(demoTenantId, payload);
    if (result.ok) {
      setRegistrations((current) => {
        const index = current.findIndex((item) => item.id === result.data.id || item.registration_type === result.data.registration_type);
        if (index < 0) return [result.data, ...current];
        const next = [...current];
        next[index] = result.data;
        return next;
      });
      setActionMessage(`${result.data.registration_type} saved${backendStatus.mode === 'Connected' ? ' to Supabase.' : ' in Connect Supabase to activate.'}`);
      await refreshAuditLog();
    } else {
      setServiceError('Registration save failed.');
    }
    return result;
  }

  async function handleSaveDocument(payload) {
    const result = await saveCompanyDocument(demoTenantId, payload);
    if (result.ok) {
      setDocuments((current) => {
        const index = current.findIndex((item) => item.id === result.data.id || item.document_type === result.data.document_type);
        if (index < 0) return [result.data, ...current];
        const next = [...current];
        next[index] = result.data;
        return next;
      });
      setActionMessage(`${result.data.document_type} metadata saved${backendStatus.mode === 'Connected' ? ' to Supabase.' : ' in Connect Supabase to activate.'}`);
      await refreshAuditLog();
    } else {
      setServiceError('Document save failed.');
    }
    return result;
  }

  async function handleSaveDefaults(payload) {
    const result = await saveDocumentDefaults(demoTenantId, payload);
    if (result.ok) {
      setDocumentDefaults(result.data);
      setActionMessage(backendStatus.mode === 'Connected' ? 'Document defaults saved to Supabase.' : 'Document defaults saved in Connect Supabase to activate.');
      await refreshAuditLog();
    } else {
      setServiceError('Document defaults save failed.');
    }
    return result;
  }

  async function handleSaveLut(payload) {
    const result = await saveLutDetails(demoTenantId, payload);
    if (result.ok) {
      setLutDetails(result.data);
      setActionMessage(backendStatus.mode === 'Connected' ? 'LUT details saved to Supabase.' : 'LUT details saved in Connect Supabase to activate.');
      await refreshAuditLog();
    } else {
      setServiceError('LUT details save failed.');
    }
    return result;
  }

  const validationWarnings = buildCompanyValidationWarnings(companyProfile, registrations, documentDefaults, lutDetails, documents);
  const healthItems = buildVaultHealthItems(companyProfile, registrations, documents, documentDefaults, lutDetails);

  return (
    <ExportOSShell className="operational-export-shell">
      <VaultHeader onBack={onBack} dataMode={backendStatus.mode} />
      <section className="vault-hero">
        <div>
          <span>Foundation Layer</span>
          <h1>Company Master Data Vault</h1>
          <p>Secure company identity, registrations, license repository, document defaults, approval rules, and memory-ready tenant data for GOPU Export OS.</p>
        </div>
        <div className="vault-core-graphic" aria-hidden="true">
          <div className="vault-core-ring" />
          <div className="vault-core-lock"><span>G</span></div>
          <div className="vault-core-grid" />
        </div>
      </section>
      <div className="vault-action-status">
        <StatusPulse />
        <span>{actionMessage}</span>
      </div>
      {loading && <div className="vault-action-status"><TimerReset size={16} /><span>Loading company master data...</span></div>}
      {serviceError && <div className="vault-error-strip"><TriangleAlert size={16} /><span>{serviceError}</span></div>}
      <CompanyValidationPanel warnings={validationWarnings} />
      <VaultHealthSummary items={healthItems} />
      <div className="vault-main-grid">
        <main className="vault-primary-stack">
          <CollapsibleVaultSection title="Company Identity" subtitle="Legal company profile and authorized person data" icon={Building2}>
            <CompanyIdentityForm profile={companyProfile} onSave={handleSaveProfile} onAction={showLocalAction} />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="Export Registrations" subtitle="IEC, GST, PAN, FSSAI, APEDA, Spice Board, Udyam" icon={FileCheck2}>
            <ExportRegistrationsPanel records={registrations} onSave={handleSaveRegistration} />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="License & Certification Repository" subtitle="Upload pendings and review controls" icon={UploadCloud} defaultOpen={false}>
            <LicenseRepository documents={documents} onSave={handleSaveDocument} onAction={showLocalAction} />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="Invoice & Document Defaults" subtitle="Masked banking and default commercial document fields" icon={FileText}>
            <InvoiceDefaultsPanel defaults={documentDefaults} onSave={handleSaveDefaults} onAction={showLocalAction} />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="LUT / Bond Export Details" subtitle="Mandatory LUT data for export invoice release" icon={ShieldCheck}>
            <LUTDetailsPanel lut={lutDetails} defaults={documentDefaults} onSave={handleSaveLut} onAction={showLocalAction} />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="Export Field Defaults" subtitle="Product, packing, HS code, origin, and compliance defaults" icon={ClipboardList} defaultOpen={false}>
            <ExportFieldDefaultsPanel />
          </CollapsibleVaultSection>
          <CollapsibleVaultSection title="Founder Approval Rules" subtitle="Approval gates for pricing, documents, claims, payments, and high-value orders" icon={ShieldCheck} defaultOpen={false}>
            <ApprovalRulesPanel rules={approvalRules} onAction={showLocalAction} />
          </CollapsibleVaultSection>
        </main>
        <aside className="vault-side-stack">
          <CompanyIntelligenceMemory categories={memoryCategories} onAction={showLocalAction} />
          <LicenseExpiryWatch rows={licenseExpiryRows} />
          <MasterDataAuditTrail items={auditLog} />
          <SaaSTenantReadiness items={tenantReadinessItems} />
        </aside>
      </div>
    </ExportOSShell>
  );
}

function buildCompanyValidationWarnings(profile, registrations, defaults, lut, documents) {
  const registrationByType = Object.fromEntries((registrations || []).map((item) => [item.registration_type, item]));
  const documentsByType = Object.fromEntries((documents || []).map((item) => [item.document_type, item]));
  const warnings = [
    ['Company', 'Legal company name missing', !profile?.legal_company_name],
    ['Company', 'Registered address missing', !profile?.registered_address],
    ['Company', 'GSTIN missing', !registrationByType.GSTIN?.registration_number],
    ['Company', 'IEC missing', !registrationByType.IEC?.registration_number],
    ['Company', 'Authorized signatory missing', !profile?.authorized_person && !defaults?.authorized_signatory],
    ['LUT', 'LUT ARN missing', !lut?.lut_arn],
    ['LUT', 'LUT financial year missing', !lut?.financial_year],
    ['LUT', 'LUT validity missing', !lut?.valid_from || !lut?.valid_to],
    ['LUT', 'Founder verification required before invoice release', !lut?.founder_verified],
    ['Invoice Defaults', 'Invoice prefix missing', !defaults?.invoice_prefix],
    ['Invoice Defaults', 'Default currency missing', !defaults?.default_currency],
    ['Invoice Defaults', 'Payment terms missing', !defaults?.default_payment_terms],
    ['Invoice Defaults', 'Incoterm missing', !defaults?.default_incoterm],
    ['Documents', 'IEC certificate missing', documentsByType['IEC Certificate']?.status !== 'Uploaded'],
    ['Documents', 'GST certificate missing', documentsByType['GST Certificate']?.status !== 'Uploaded'],
    ['Documents', 'LUT document missing', documentsByType['LUT Document']?.status !== 'Uploaded' && !lut?.document_url]
  ];
  return warnings.filter(([, , failed]) => failed).map(([group, message]) => ({ group, message }));
}

function buildVaultHealthItems(profile, registrations, documents, defaults, lut) {
  const hasProfile = Boolean(profile?.legal_company_name && profile?.registered_address);
  const requiredRegistrations = ['GSTIN', 'IEC', 'PAN'];
  const missingRegistrations = requiredRegistrations.filter((type) => !registrations?.find((item) => item.registration_type === type && item.registration_number));
  const missingDocuments = (documents || []).filter((item) => ['IEC Certificate', 'GST Certificate', 'LUT Document'].includes(item.document_type) && item.status !== 'Uploaded');
  const lutExpired = lut?.valid_to ? new Date(lut.valid_to) < new Date() : false;
  const lutComplete = Boolean(lut?.lut_arn && lut?.financial_year && lut?.valid_from && lut?.valid_to && lut?.founder_verified && !lutExpired);
  return [
    { label: 'Company Profile', status: hasProfile ? 'Draft' : 'Needs Review', tone: hasProfile ? 'draft' : 'attention' },
    { label: 'Export Registrations', status: missingRegistrations.length ? 'Needs Review' : 'Active', tone: missingRegistrations.length ? 'attention' : 'progress' },
    { label: 'License Documents', status: missingDocuments.length ? 'Missing Uploads' : 'Draft', tone: missingDocuments.length ? 'error' : 'draft' },
    { label: 'Invoice Defaults', status: defaults?.invoice_prefix && defaults?.default_currency ? 'Draft' : 'Missing', tone: defaults?.invoice_prefix ? 'draft' : 'attention' },
    { label: 'LUT Details', status: lutExpired ? 'Expired' : lutComplete ? 'Verified' : 'Founder Review Required', tone: lutComplete ? 'progress' : 'attention' },
    { label: 'Approval Rules', status: 'Founder Review Required', tone: 'attention' }
  ];
}

function CompanyValidationPanel({ warnings }) {
  return (
    <section className="vault-validation-panel">
      <div>
        <span>Validation</span>
        <strong>{warnings.length ? `${warnings.length} release blockers / warnings` : 'Company foundation ready for draft workflows'}</strong>
      </div>
      <div className="vault-validation-list">
        {warnings.slice(0, 8).map((warning) => <span key={`${warning.group}-${warning.message}`}>{warning.group}: {warning.message}</span>)}
        {warnings.length > 8 && <span>{warnings.length - 8} more warnings</span>}
      </div>
    </section>
  );
}

function VaultHeader({ onBack, dataMode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="deck-header vault-header">
      <div className="deck-header-copy">
        <span>GOPU Export OS</span>
        <h1>Company Master Data Vault</h1>
        <p>Foundation Layer</p>
      </div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><StatusPulse /><strong>Vault Status: Online</strong></div>
        <div className="coo-status"><Database size={15} /><strong>{dataMode === 'Connected' ? 'Data Mode: Backend Connected' : 'Connect Supabase to activate - Backend not connected'}</strong></div>
        <div className="coo-time"><CalendarClock size={16} /><span>{displayDateTime(now)}</span></div>
        <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
      </div>
    </header>
  );
}

function VaultHealthSummary({ items }) {
  return (
    <section className="vault-health-grid" aria-label="Vault health summary">
      {items.map((item, index) => (
        <motion.article
          className={`vault-health-card tone-${item.tone}`}
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>{item.label}</span>
          <strong>{item.status}</strong>
        </motion.article>
      ))}
    </section>
  );
}

const companyProfileFields = [
  ['company_display_name', 'Company Display Name'],
  ['legal_company_name', 'Legal Company Name'],
  ['business_type', 'Business Type'],
  ['country', 'Country'],
  ['state', 'State'],
  ['city', 'City'],
  ['registered_address', 'Registered Address'],
  ['operating_address', 'Operating Address'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['website', 'Website'],
  ['authorized_person', 'Founder / Authorized Person Name'],
  ['status', 'Status']
];

function CompanyIdentityForm({ profile, onSave }) {
  const requiredFields = ['legal_company_name', 'registered_address', 'country', 'email', 'authorized_person'];
  const [values, setValues] = useState(() => Object.fromEntries(companyProfileFields.map(([field]) => [field, ''])));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(companyProfileFields.map(([field]) => [field, profile?.[field] || (field === 'status' ? 'Draft' : '')])),
      id: profile?.id
    }));
  }, [profile]);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function validate(action) {
    const nextErrors = {};
    requiredFields.forEach((field) => {
      if (!values[field]?.trim()) nextErrors[field] = 'Required for invoice/document readiness.';
    });
    if (values.email && !values.email.includes('@')) nextErrors.email = 'Enter a valid email format.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    await onSave({ ...values, status: action === 'review' ? 'Founder Review Required' : 'Draft' });
    setSaving(false);
  }

  return (
    <div className="vault-form-grid">
      {companyProfileFields.map(([field, label]) => (
        <SecureInput
          key={field}
          label={label}
          value={values[field]}
          error={errors[field]}
          multiline={field.includes('address')}
          onChange={(value) => updateField(field, value)}
        />
      ))}
      <div className="vault-form-actions">
        <button className="ghost-button" disabled={saving} onClick={() => validate('draft')}>Save Draft</button>
        <button className="tactical-button" disabled={saving} onClick={() => validate('review')}>Send for Founder Review</button>
      </div>
    </div>
  );
}

function ExportRegistrationsPanel({ records, onSave }) {
  return (
    <div className="vault-table">
      {records.map((record) => (
        <RegistrationRow key={record.id || record.registration_type} record={record} onSave={onSave} />
      ))}
    </div>
  );
}

function RegistrationRow({ record, onSave }) {
  const [draft, setDraft] = useState(record);
  useEffect(() => setDraft(record), [record]);
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <article className="registration-row">
      <strong>{draft.registration_type || draft.name}</strong>
      <input value={draft.registration_number || ''} onChange={(event) => update('registration_number', event.target.value)} placeholder="Registration number" />
      <input value={draft.issue_date || ''} onChange={(event) => update('issue_date', event.target.value)} placeholder="Issue date" type="date" />
      <input value={draft.expiry_date || ''} onChange={(event) => update('expiry_date', event.target.value)} placeholder="Expiry date" type="date" />
      <select value={draft.status || 'Missing'} onChange={(event) => update('status', event.target.value)}>
        {['Missing', 'Draft', 'Needs Review', 'Founder Review Required', 'Active', 'Expiring Soon', 'Expired', 'Verified'].map((status) => <option key={status}>{status}</option>)}
      </select>
      <button className="ghost-button" onClick={() => onSave({ ...draft, status: draft.status || 'Draft' })}>Save</button>
      <button className="ghost-button" onClick={() => onSave({ ...draft, requires_founder_review: true, status: 'Founder Review Required' })}>Founder Review</button>
    </article>
  );
}

function DocumentUploadRow({ document, onSave }) {
  const [draft, setDraft] = useState(document);
  useEffect(() => setDraft(document), [document]);
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <article className="document-upload-row">
      <div>
        <strong>{draft.document_type || draft.name}</strong>
        <span>{draft.status || draft.upload_status}</span>
      </div>
      <input value={draft.document_name || ''} onChange={(event) => update('document_name', event.target.value)} placeholder="Document name" />
      <input value={draft.expiry_date || ''} onChange={(event) => update('expiry_date', event.target.value)} type="date" />
      <input value={draft.owner || ''} onChange={(event) => update('owner', event.target.value)} placeholder="Owner" />
      <div>
        <button onClick={() => onSave({ ...draft, status: 'Uploaded', file_url: draft.file_url || 'local-upload-pending' })}>Mark Uploaded Local</button>
        <button onClick={() => onSave({ ...draft, status: 'Needs Review' })}>Mark for Review</button>
        <button onClick={() => onSave({ ...draft, status: draft.status || 'Draft' })}>Update Expiry</button>
      </div>
    </article>
  );
}

function LicenseRepository({ documents, onSave }) {
  return (
    <div className="document-repository">
      {documents.map((document) => <DocumentUploadRow key={document.id || document.document_type} document={document} onSave={onSave} />)}
    </div>
  );
}

const documentDefaultFields = [
    ['invoice_prefix', 'Default invoice prefix'],
    ['quotation_prefix', 'Default quotation prefix'],
    ['default_currency', 'Default currency'],
    ['default_payment_terms', 'Default payment terms'],
    ['default_incoterm', 'Default Incoterm'],
    ['default_port_loading', 'Default port of loading'],
    ['default_bank_masked', 'Default bank account masked'],
    ['authorized_signatory', 'Default authorized signatory'],
    ['email_footer', 'Default email footer'],
    ['buyer_document_note', 'Default buyer document note']
  ];

function InvoiceDefaultsPanel({ defaults, onSave, onAction }) {
  const [values, setValues] = useState({});
  useEffect(() => setValues(defaults || {}), [defaults]);

  return (
    <div className="invoice-defaults-grid">
      {documentDefaultFields.map(([field, label]) => <SecureInput key={field} label={label} value={values[field] || ''} masked={field.includes('bank')} onChange={(value) => setValues((current) => ({ ...current, [field]: value }))} />)}
      <div className="preview-panel">
        <strong>Preview Header</strong>
        <p>GOPU Export OS draft invoice and quotation headers use masked banking, founder-reviewed signatory, and local document notes until connected data is approved.</p>
      </div>
      <div className="vault-form-actions">
        <button className="ghost-button" onClick={() => onAction('Invoice header preview generated in local UI.')}>Preview Invoice Header</button>
        <button className="ghost-button" onClick={() => onAction('Quotation header preview generated in local UI.')}>Preview Quotation Header</button>
        <button className="tactical-button" onClick={() => onSave(values)}>Save Draft</button>
      </div>
    </div>
  );
}

const lutFieldList = [
    ['lut_arn', 'LUT ARN / Reference Number'],
    ['financial_year', 'LUT Financial Year'],
    ['filing_date', 'LUT Filing Date'],
    ['valid_from', 'LUT Valid From'],
    ['valid_to', 'LUT Valid To'],
    ['status', 'LUT Status'],
    ['document_url', 'LUT Document URL / Pending']
  ];

function getLutBlockMessage(lut) {
  if (!lut?.lut_arn || !lut?.financial_year || !lut?.valid_from || !lut?.valid_to || !lut?.document_url) return 'LUT incomplete - invoice release blocked.';
  if (new Date(lut.valid_to) < new Date()) return 'LUT expired - invoice release blocked.';
  if (!lut.founder_verified) return 'Founder verification required before invoice release.';
  return 'LUT data ready for draft invoice validation.';
}

function LUTDetailsPanel({ lut, defaults, onSave }) {
  const [values, setValues] = useState({});
  useEffect(() => setValues(lut || { status: 'Draft', founder_verified: false }), [lut]);
  const blockMessage = getLutBlockMessage(values);
  return (
    <div>
      <div className="vault-warning-strip"><TriangleAlert size={16} />{blockMessage}</div>
      <div className="vault-form-grid compact">
        {lutFieldList.map(([field, label]) => <SecureInput key={field} label={label} value={values[field] || ''} placeholder="Required before release" onChange={(value) => setValues((current) => ({ ...current, [field]: value }))} />)}
        <SecureInput label="Authorized Signatory" value={defaults?.authorized_signatory || ''} placeholder="From document defaults" onChange={() => {}} />
        <label className="secure-master-field checkbox-field">
          <span>Founder Verified Status</span>
          <input type="checkbox" checked={Boolean(values.founder_verified)} onChange={(event) => setValues((current) => ({ ...current, founder_verified: event.target.checked }))} />
        </label>
      </div>
      <div className="vault-form-actions">
        <button className="ghost-button" onClick={() => setValues((current) => ({ ...current, document_url: current.document_url || 'local-lut-document-pending' }))}>Mark LUT Document Uploaded Local</button>
        <button className="tactical-button" onClick={() => onSave(values)}>Save LUT Draft</button>
      </div>
    </div>
  );
}

function ExportFieldDefaultsPanel() {
  const fields = [
    'Default product category',
    'Common HS code pending',
    'Country of origin',
    'Packing unit',
    'Standard carton/bag size',
    'Standard net weight',
    'Standard gross weight',
    'Standard quality declaration',
    'Standard shelf-life text',
    'Standard storage instructions',
    'Standard compliance note'
  ];

  return (
    <div>
      <div className="vault-warning-strip"><TriangleAlert size={16} />Legal-sensitive fields require founder / human approval before document use.</div>
      <div className="vault-form-grid compact">
        {fields.map((field) => (
          <SecureInput key={field} label={field} value="" onChange={() => {}} placeholder={field.includes('HS code') ? 'Founder review required' : 'Draft default'} />
        ))}
      </div>
      <div className="sensitive-field-list">
        {['HS code', 'Origin claim', 'Customs value', 'Legal compliance claim'].map((item) => <span key={item}>{item}: Founder / human review required</span>)}
      </div>
    </div>
  );
}

function ApprovalRulesPanel({ rules, onAction }) {
  return (
    <div className="approval-rules-grid">
      {rules.map((rule) => (
        <article className="approval-rule-row" key={rule.id}>
          <div>
            <strong>{rule.name}</strong>
            <span>{rule.department}</span>
          </div>
          <small>Risk: {rule.risk}</small>
          <StatusBadge label={rule.status} state={rule.risk === 'Critical' ? 'attention' : 'progress'} />
          <button onClick={() => onAction(`${rule.name} opened for local edit.`)}>Edit</button>
        </article>
      ))}
    </div>
  );
}

function CompanyIntelligenceMemory({ categories, onAction }) {
  return (
    <section className="vault-side-panel">
      <div className="coo-panel-header">
        <div>
          <span>Company Intelligence Memory</span>
          <h2>Memory</h2>
        </div>
        <Database size={20} />
      </div>
      <div className="memory-category-list">
        {categories.map((category) => <span key={category}>{category}<small>Memory</small></span>)}
      </div>
      <div className="side-action-stack">
        <button onClick={() => onAction('Local memory sync requested. No real memory write performed.')}>Sync to Memory</button>
        <button onClick={() => onAction('Local memory conflict review opened.')}>Review Memory Conflicts</button>
        <button onClick={() => onAction('Founder approval marker prepared in local UI.')}>Mark Founder Approved</button>
      </div>
    </section>
  );
}

function LicenseExpiryWatch({ rows }) {
  return (
    <section className="vault-side-panel">
      <div className="coo-panel-header">
        <div>
          <span>License Expiry Watch</span>
          <h2>Expiry and upload risk</h2>
        </div>
        <TimerReset size={20} />
      </div>
      {rows.map((row) => (
        <article className={`expiry-watch-row risk-${row.risk.toLowerCase()}`} key={row.document}>
          <strong>{row.document}</strong>
          <span>{row.status}</span>
          <small>Risk: {row.risk}</small>
          <p>{row.action}</p>
        </article>
      ))}
    </section>
  );
}

function MasterDataAuditTrail({ items }) {
  const normalized = (items?.length ? items : masterDataAuditTrail).map((item) => ({
    id: item.id,
    time: item.time || (item.created_at ? new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Local'),
    event: item.event || item.action,
    user: item.user || item.actor || 'System',
    status: item.status || item.new_status || 'Draft',
    notes: item.notes
  }));
  return (
    <section className="vault-side-panel">
      <div className="coo-panel-header">
        <div>
          <span>Master Data Audit Trail</span>
          <h2>{backendStatus.mode === 'Connected' ? 'Supabase audit stream' : 'Audit stream'}</h2>
        </div>
        <Activity size={20} />
      </div>
      <div className="vault-audit-list">
        {normalized.map((item) => (
          <div key={item.id}>
            <time>{item.time}</time>
            <strong>{item.event}</strong>
            <span>{item.user} - {item.status}</span>
            {item.notes && <small>{item.notes}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}

function SaaSTenantReadiness({ items }) {
  return (
    <section className="vault-side-panel">
      <div className="coo-panel-header">
        <div>
          <span>SaaS Tenant Readiness</span>
          <h2>Architecture Ready / Editable UI</h2>
        </div>
        <Network size={20} />
      </div>
      <div className="tenant-readiness-grid">
        {items.map((item) => <span key={item}><CheckCircle2 size={14} />{item}</span>)}
      </div>
      <div className="vault-model-list">
        <strong>Backend-ready models</strong>
        {masterDataModels.map((model) => <code key={model}>{model}</code>)}
      </div>
    </section>
  );
}


export default CompanyMasterDataVault;
