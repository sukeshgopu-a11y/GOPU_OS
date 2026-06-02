import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FileText,
  PackageCheck,
  Printer,
  Route,
  Send,
  ShieldCheck
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { Breadcrumb, EmptyState, StatusBadge } from '../shared/uiPrimitives.jsx';
import { backendStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from '../services/demoData.js';
import { getLeadExecutionSummary, requestLeadExecutionGate } from '../services/leadExecutionService.js';
import {
  buildLeadInvoiceDocument,
  downloadLeadInvoice,
  invoiceDisplayMoney,
  isInvoiceDocument,
  printLeadInvoice
} from '../services/leadInvoiceDocumentService.js';
import { workflowIdRows } from '../config/workflowIds.js';

function valueOrDash(value) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function statusState(status = '') {
  const text = String(status).toLowerCase();
  if (text.includes('blocked')) return 'error';
  if (text.includes('required') || text.includes('waiting') || text.includes('pending')) return 'attention';
  if (text.includes('ready') || text.includes('approved') || text.includes('complete') || text.includes('confirmed') || text.includes('sent')) return 'success';
  return 'progress';
}

function DetailMetric({ label, value, note, icon: Icon }) {
  return (
    <article className="metric-panel coo-lead-metric">
      <div className="coo-lead-metric-icon">{Icon && <Icon size={18} />}</div>
      <span>{label}</span>
      <strong>{valueOrDash(value)}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function FieldGrid({ rows = [] }) {
  return (
    <dl className="coo-lead-field-grid">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{valueOrDash(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function InvoiceDocumentView({ invoice }) {
  const item = invoice.lineItems[0] || {};
  return (
    <article className="coo-real-invoice">
      <div className="coo-real-invoice-head">
        <div>
          <span>{invoice.stage}</span>
          <h3>{invoice.invoiceType}</h3>
          <p>{invoice.status}</p>
        </div>
        <div>
          <strong>{invoice.invoiceNumber}</strong>
          <span>{invoice.invoiceDate}</span>
        </div>
      </div>

      <div className="coo-real-invoice-parties">
        <section>
          <span>Exporter</span>
          <strong>{invoice.exporter.name}</strong>
          <p>{invoice.exporter.address}</p>
          <p>{invoice.exporter.email}</p>
          <p>{invoice.exporter.website}</p>
        </section>
        <section>
          <span>Buyer / Consignee</span>
          <strong>{invoice.buyer.company || invoice.buyer.name}</strong>
          <p>{invoice.buyer.address}</p>
          <p>{invoice.buyer.country}</p>
          <p>{invoice.buyer.email}</p>
        </section>
      </div>

      <div className="coo-real-invoice-meta">
        {[
          ['Lead No', invoice.leadNumber],
          ['Financial Year', invoice.financialYear],
          ['Payment Terms', invoice.paymentTerms],
          ['Incoterm', invoice.shipment.incoterm],
          ['Validity', invoice.validity],
          ['Delivery Target', invoice.shipment.deliveryTarget]
        ].map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>

      <div className="coo-real-invoice-table">
        <div className="coo-real-invoice-row coo-real-invoice-row-head">
          <span>No</span><span>Description</span><span>HS Code</span><span>Qty</span><span>Rate</span><span>Amount</span>
        </div>
        <div className="coo-real-invoice-row">
          <span>{item.no}</span>
          <span><strong>{item.description}</strong><small>Packing: {item.packing}</small></span>
          <span>{item.hsn}</span>
          <span>{item.quantity} {item.unit}</span>
          <span>{invoiceDisplayMoney(item.unitPrice, invoice.currency)}</span>
          <span>{invoiceDisplayMoney(item.amount, invoice.currency)}</span>
        </div>
      </div>

      <div className="coo-real-invoice-summary">
        <section>
          <span>Shipment</span>
          <p>Origin: {invoice.shipment.origin}</p>
          <p>Port of loading: {invoice.shipment.portOfLoading}</p>
          <p>Port of discharge: {invoice.shipment.portOfDischarge}</p>
          <p>Final destination: {invoice.shipment.finalDestination}</p>
          <p>Container: {invoice.shipment.container}</p>
        </section>
        <section className="coo-real-invoice-total">
          <div><span>Subtotal</span><strong>{invoiceDisplayMoney(invoice.subtotal, invoice.currency)}</strong></div>
          <div><span>Tax</span><strong>{invoiceDisplayMoney(invoice.taxTotal, invoice.currency)}</strong></div>
          <div><span>Total</span><strong>{invoiceDisplayMoney(invoice.grandTotal, invoice.currency)}</strong></div>
        </section>
      </div>

      <footer className="coo-real-invoice-footer">
        <p><strong>Amount in words:</strong> {invoice.amountInWords}</p>
        <p><strong>Terms:</strong> {invoice.notes}</p>
      </footer>
    </article>
  );
}

function InvoiceEmailPreview({ invoice }) {
  const email = invoice.email || {};
  return (
    <article className="coo-invoice-email-preview">
      <div>
        <span>Buyer Email Preview</span>
        <h3>{email.subject}</h3>
      </div>
      <dl>
        <div><dt>To</dt><dd>{email.to}</dd></div>
        <div><dt>Attachment</dt><dd>{invoice.invoiceNumber}.pdf</dd></div>
      </dl>
      <section>
        <p>{email.greeting}</p>
        {(email.body || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {(email.signature || [email.closing]).filter(Boolean).map((line) => <p key={line}>{line}</p>)}
      </section>
    </article>
  );
}

function ApprovalGateCard({ gate, requested, requesting, onRequest }) {
  const approved = String(gate.status || '').toLowerCase().includes('approved');
  const complete = approved || requested;
  return (
    <article className="coo-approval-gate">
      <div className="coo-approval-gate-main">
        <div>
          <strong>{gate.title}</strong>
          <p>{gate.summary}</p>
        </div>
        <StatusBadge label={approved ? 'Approved' : requested ? 'Queued' : 'Slack Approval Required'} state={complete ? 'success' : 'attention'} />
      </div>
      <div className="coo-approval-gate-meta">
        <span>Blocks: {gate.blockedItems.join(', ')}</span>
        <span>After approval: {gate.ifApproved}</span>
      </div>
      <button className="tactical-button" disabled={complete || requesting} onClick={() => onRequest(gate.key)}>
        {approved ? 'Approved' : requesting ? 'Requesting...' : requested ? 'Sent to Director Queue' : 'Request Slack Approval'}
        <ChevronRight size={14} />
      </button>
    </article>
  );
}

function buildDocumentPreviewRows(document, summary) {
  const lead = summary?.lead || {};
  const baseRows = [
    ['Lead', lead.lead_number || lead.id],
    ['Buyer', lead.buyer_name || lead.company_name],
    ['Buyer email', lead.email || lead.buyer_email],
    ['Product', lead.product],
    ['Quantity', `${lead.quantity || ''} ${lead.unit || lead.unit_of_measure || ''}`.trim()],
    ['Destination', lead.destination_country || lead.country],
    ['Quote', summary?.quote?.amountDisplay],
    ['Payment', lead.payment_terms],
    ['Incoterm', lead.incoterm],
    ['Document owner', document.owner],
    ['Status', document.status],
    ['Due', document.due],
    ['Approval gate', document.gate]
  ];
  const customRows = Array.isArray(document.preview) ? document.preview : [];
  const seen = new Set();
  return [...customRows, ...baseRows].filter(([label, value]) => {
    if (!label || seen.has(label)) return false;
    seen.add(label);
    return value !== null && value !== undefined && value !== '';
  });
}

function DocumentPreview({ document, summary, onClose, previewRef }) {
  if (!document) return null;
  const previewRows = buildDocumentPreviewRows(document, summary);
  const invoice = isInvoiceDocument(document) ? buildLeadInvoiceDocument(summary, document) : null;
  return (
    <div className="coo-document-preview-modal" role="dialog" aria-modal="true" aria-label={`${document.name} document viewer`}>
      <button className="coo-document-preview-backdrop" aria-label="Close document viewer" onClick={onClose} />
      <aside ref={previewRef} className="coo-document-preview coo-panel" tabIndex={-1}>
        <div className="coo-section-header">
          <div><span>Document Viewer</span><h2>{document.name}</h2></div>
          <div className="coo-document-preview-actions">
            {invoice && (
              <>
                <button className="tactical-button" onClick={() => downloadLeadInvoice(invoice)}><Download size={14} />Download PDF</button>
                <button className="ghost-button" onClick={() => printLeadInvoice(invoice)}><Printer size={14} />Print / Save PDF</button>
              </>
            )}
            <button className="ghost-button" onClick={onClose}>Close</button>
          </div>
        </div>
        {invoice ? (
          <>
            <InvoiceDocumentView invoice={invoice} />
            <InvoiceEmailPreview invoice={invoice} />
          </>
        ) : (
          <>
            <FieldGrid rows={previewRows.map(([label, value]) => ({ label, value }))} />
            <div className="coo-document-preview-body">
              <FileText size={28} />
              <strong>{document.type}</strong>
              <p>{document.why}</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function DocumentsTable({ documents, onView }) {
  return (
    <section className="coo-panel coo-lead-documents-panel">
      <div className="coo-section-header">
        <div><span>Documents and Certificates</span><h2>Product-specific export requirements</h2></div>
        <FileCheck2 size={18} />
      </div>
      <div className="coo-lead-doc-table">
        <div className="coo-lead-doc-head">
          <span>#</span><span>Document</span><span>Owner</span><span>Status</span><span>Why required</span><span>Actions</span>
        </div>
        {documents.map((document) => (
          <div className="coo-lead-doc-row" key={document.id}>
            <span>{document.step}</span>
            <span><strong>{document.name}</strong><small>{document.type}</small></span>
            <span>{document.owner}</span>
            <span><StatusBadge label={document.status} state={statusState(document.status)} size="sm" /></span>
            <span>{document.why}</span>
            <span className="coo-lead-doc-actions">
              <button className="ghost-button" onClick={() => onView(document)}><Eye size={14} />View</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Timeline({ entries = [] }) {
  return (
    <section className="coo-panel coo-lead-timeline">
      <div className="coo-section-header">
        <div><span>Execution Flow</span><h2>Before, during, and after shipment</h2></div>
        <Activity size={18} />
      </div>
      <div className="coo-lead-timeline-list">
        {entries.map((entry) => (
          <article key={entry.step}>
            <span>{entry.step}</span>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.owner} - {entry.date}</p>
            </div>
            <StatusBadge label={entry.status} state={statusState(entry.status)} size="sm" />
          </article>
        ))}
      </div>
    </section>
  );
}

function InvoiceFlow({ invoice }) {
  return (
    <section className="coo-panel">
      <div className="coo-section-header">
        <div><span>Invoice Flow</span><h2>{invoice.number}</h2></div>
        <ClipboardList size={18} />
      </div>
      <div className="coo-invoice-steps">
        {invoice.structure.map((step) => (
          <article key={step.step}>
            <span>{step.step}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.detail || step.owner}</p>
            </div>
            <StatusBadge label={step.status} state={statusState(step.status)} size="sm" />
          </article>
        ))}
      </div>
    </section>
  );
}

export default function COOLeadExecutionPage({ leadId, navigate, onBack }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [requestedGates, setRequestedGates] = useState({});
  const [requestingGate, setRequestingGate] = useState('');
  const documentPreviewRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLeadExecutionSummary(demoTenantId, leadId).then((result) => {
      if (!mounted) return;
      setSummary(result.data);
      setRequestedGates(result.data?.completedGateRequests || {});
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [leadId]);

  const lead = summary?.lead || {};
  const clientRows = useMemo(() => ([
    { label: 'Buyer name', value: lead.buyer_name },
    { label: 'Company', value: lead.company_name },
    { label: 'Email', value: lead.email || lead.buyer_email },
    { label: 'Phone', value: lead.phone },
    { label: 'Country', value: lead.destination_country || lead.country },
    { label: 'Product', value: lead.product },
    { label: 'Quantity', value: `${lead.quantity || ''} ${lead.unit || lead.unit_of_measure || ''}`.trim() },
    { label: 'Container', value: lead.container_load },
    { label: 'Payment', value: lead.payment_terms },
    { label: 'Incoterm', value: lead.incoterm }
  ]), [lead]);
  const idRows = useMemo(() => workflowIdRows(summary?.workflowIds || lead.workflow_ids || {}), [summary?.workflowIds, lead.workflow_ids]);

  async function requestGate(gateKey) {
    setRequestingGate(gateKey);
    setNotice('');
    const result = await requestLeadExecutionGate(demoTenantId, summary, gateKey);
    if (result.ok) {
      setRequestedGates((current) => ({ ...current, [gateKey]: result.data?.id || true }));
      setNotice(`${result.data?.title || 'Approval'} sent to Slack Founder/Director approval queue.`);
    } else {
      setNotice(result.error?.message || 'Approval request failed safely.');
    }
    setRequestingGate('');
  }

  function openDocumentPreview(document) {
    setSelectedDocument(document);
    setNotice(`${document.name} opened in Document Viewer.`);
  }

  useEffect(() => {
    if (!selectedDocument) return undefined;
    const timer = window.setTimeout(() => {
      documentPreviewRef.current?.focus();
    }, 0);
    function handleEscape(event) {
      if (event.key === 'Escape') setSelectedDocument(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedDocument]);

  if (loading) {
    return (
      <ExportOSShell className="executive-home-shell coo-command-home-shell coo-lead-execution-shell" statusMessage="Loading COO lead execution">
        <section className="coo-panel coo-lead-loading">Loading lead execution flow...</section>
      </ExportOSShell>
    );
  }

  if (!summary) {
    return (
      <ExportOSShell className="executive-home-shell coo-command-home-shell coo-lead-execution-shell" statusMessage="Lead execution unavailable">
        <EmptyState icon={ClipboardCheck} title="Lead not found" description="Open the COO pipeline and select a lead again." />
      </ExportOSShell>
    );
  }

  return (
    <ExportOSShell className="executive-home-shell coo-command-home-shell coo-lead-execution-shell" statusMessage={backendStatus.mode === 'Connected' ? 'COO lead execution live connected' : 'COO lead execution demo mode'}>
      <div className="coo-lead-detail-topbar">
        <button className="ghost-button" onClick={onBack || (() => navigate?.('/export-os/executives/coo'))}><ArrowLeft size={15} />COO Pipeline</button>
        <Breadcrumb items={[
          { label: 'Export OS', onClick: () => navigate?.('/export-os') },
          { label: 'COO', onClick: () => navigate?.('/export-os/executives/coo') },
          { label: lead.lead_number || lead.id }
        ]} />
      </div>

      <section className="coo-panel coo-lead-hero">
        <div>
          <span>COO Lead Execution</span>
          <h1>{lead.lead_number || lead.id} - {lead.buyer_name}</h1>
          <p>{lead.product} for {lead.destination_country || lead.country}. All buyer email, payment, document, certificate, and booking steps require Slack Founder/Director approval before execution.</p>
        </div>
        <div className="coo-lead-hero-actions">
          <StatusBadge label={lead.status || 'COO Review Ready'} state="progress" />
          <button
            className="tactical-button"
            disabled={Boolean(requestedGates['proforma-send-approval']) || requestingGate === 'proforma-send-approval'}
            onClick={() => requestGate('proforma-send-approval')}
          >
            {requestedGates['proforma-send-approval'] ? 'PI Approval Queued' : 'Request PI Email Approval'}
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {notice && <div className="coo-action-notice coo-lead-notice">{notice}</div>}

      <section className="coo-lead-kpi-grid">
        <DetailMetric label="Final quote" value={summary.quote.amountDisplay} note={`Margin ${summary.quote.margin}%`} icon={CheckCircle2} />
        <DetailMetric label="Quantity/load" value={`${lead.quantity} ${lead.unit || lead.unit_of_measure}`} note={lead.container_load} icon={PackageCheck} />
        <DetailMetric label="Payment" value={summary.payment.terms} note={`Due ${summary.payment.dueDate}`} icon={ShieldCheck} />
        <DetailMetric label="Shipment" value={summary.shipment.container} note={summary.shipment.leadTime} icon={Route} />
        <DetailMetric label="Documents" value={`${summary.documents.length} required`} note="View and review each document" icon={FileCheck2} />
        <DetailMetric label="Delivery target" value={summary.shipment.deliveryDate} note={summary.shipment.destinationPort} icon={CalendarClock} />
      </section>

      <section className="coo-lead-main-grid">
        <section className="coo-panel">
          <div className="coo-section-header">
            <div><span>Client Details</span><h2>Buyer and shipment request</h2></div>
            <ClipboardCheck size={18} />
          </div>
          <FieldGrid rows={clientRows} />
        </section>

        <section className="coo-panel">
          <div className="coo-section-header">
            <div><span>Workflow IDs</span><h2>Lead, invoice, payment, and shipment references</h2></div>
            <ShieldCheck size={18} />
          </div>
          <FieldGrid rows={idRows.map(([label, value]) => ({ label, value }))} />
        </section>
      </section>

      <section className="coo-lead-main-grid">
        <section className="coo-panel">
          <div className="coo-section-header">
            <div><span>Commercial Summary</span><h2>CFO quote and payment position</h2></div>
            <ShieldCheck size={18} />
          </div>
          <FieldGrid rows={[
            { label: 'Quote amount', value: summary.quote.amountDisplay },
            { label: 'Cost basis', value: summary.quote.costDisplay },
            { label: 'Quote valid until', value: summary.quote.validUntil },
            { label: 'Price source', value: summary.quote.priceSource },
            { label: 'Paid', value: summary.payment.amountPaid },
            { label: 'Due', value: summary.payment.amountDue },
            { label: 'Payment follow-up', value: summary.payment.followUpDate },
            { label: 'Blocks until paid', value: summary.payment.requiredBefore }
          ]} />
        </section>

        <section className="coo-panel">
          <div className="coo-section-header">
            <div><span>Shipment Reference</span><h2>{summary.shipment.reference}</h2></div>
            <Route size={18} />
          </div>
          <FieldGrid rows={[
            { label: 'Shipment type', value: summary.shipment.type },
            { label: 'Container', value: summary.shipment.container },
            { label: 'Book by', value: summary.shipment.bookingDueDate },
            { label: 'Delivery target', value: summary.shipment.deliveryDate }
          ]} />
        </section>
      </section>

      <section className="coo-panel coo-lead-approval-panel">
        <div className="coo-section-header">
          <div><span>Slack Approval Gates</span><h2>Every sensitive step waits for approval</h2></div>
          <Send size={18} />
        </div>
        <div className="coo-approval-gate-grid">
          {summary.gates.map((gate) => (
            <ApprovalGateCard
              key={gate.key}
              gate={gate}
              requested={Boolean(requestedGates[gate.key])}
              requesting={requestingGate === gate.key}
              onRequest={requestGate}
            />
          ))}
        </div>
      </section>

      <section className="coo-lead-main-grid">
        <InvoiceFlow invoice={summary.invoice} />
        <section className="coo-panel">
          <div className="coo-section-header">
            <div><span>Shipment Execution</span><h2>Container booking readiness</h2></div>
            <Route size={18} />
          </div>
          <FieldGrid rows={[
            { label: 'Shipment type', value: summary.shipment.type },
            { label: 'Container', value: summary.shipment.container },
            { label: 'Incoterm', value: summary.shipment.incoterm },
            { label: 'Destination', value: summary.shipment.destination },
            { label: 'Port', value: summary.shipment.destinationPort },
            { label: 'Book by', value: summary.shipment.bookingDueDate },
            { label: 'Delivery target', value: summary.shipment.deliveryDate },
            { label: 'Lead time', value: summary.shipment.leadTime }
          ]} />
        </section>
      </section>

      <DocumentsTable
        documents={summary.documents}
        onView={openDocumentPreview}
      />

      <section className="coo-lead-bottom-grid">
        <Timeline entries={summary.timeline} />
        <DocumentPreview document={selectedDocument} summary={summary} onClose={() => setSelectedDocument(null)} previewRef={documentPreviewRef} />
      </section>
    </ExportOSShell>
  );
}
