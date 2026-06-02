import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Zap
} from 'lucide-react';
import { ExportOSShell, exportCSV, useRowSelection } from '../shared/routeShell.jsx';
import { BulkActionBar, SortableTableHeader, StatusBadge, useSortable } from '../shared/uiPrimitives.jsx';
import { announceToSR } from '../utils/ui.jsx';
import { backendStatus } from '../lib/supabaseClient.js';
import { demoTenantId } from '../services/companyService.js';
import { createAuditLog } from '../services/auditService.js';
import { requestSensitiveActionApproval } from '../services/approvalService.js';
import { sendSlackNotification } from '../services/slackNotificationService.js';
import {
  createShipment,
  generateShipmentReference,
  getNextShipmentAction,
  getShipmentStatus,
  getShipmentTrackerData,
  shipmentDocumentChecklist,
  shipmentStages,
  updateShipment,
  verifyShipmentCompany
} from '../services/shipmentService.js';

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
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused) previouslyFocused.focus();
    };
  }, [isActive, ref]);
}

function Stepper({ steps, current, onChange }) {
  return (
    <nav className="stepper" aria-label="Progress steps">
      <ol className="stepper-list">
        {steps.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          const state   = done ? 'done' : active ? 'active' : 'pending';
          return (
            <li
              key={i}
              className={`stepper-step ${state}`}
              aria-current={active ? 'step' : undefined}
            >
              <button
                className="stepper-node"
                onClick={() => done && onChange && onChange(i)}
                disabled={!done}
                aria-label={`${step.label}${done ? ' - completed' : active ? ' - current' : ' - upcoming'}`}
              >
                {done
                  ? <CheckCircle2 size={16} aria-hidden="true" />
                  : <span aria-hidden="true">{i + 1}</span>
                }
              </button>
              <span className="stepper-label">{step.label}</span>
              {i < steps.length - 1 && (
                <span className="stepper-connector" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function useWizard(totalSteps) {
  const [step, setStep] = React.useState(0);
  const next  = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back  = () => setStep((s) => Math.max(s - 1, 0));
  const goTo  = (i) => setStep(i);
  const reset = () => setStep(0);
  const isFirst = step === 0;
  const isLast  = step === totalSteps - 1;
  return { step, next, back, goTo, reset, isFirst, isLast };
}

const SHIPMENT_WIZARD_STEPS = [
  { label: 'Buyer & Product' },
  { label: 'Logistics'       },
  { label: 'Documents'       },
  { label: 'Review'          },
];

function ShipmentWizard({ onComplete, onCancel, buyers = [] }) {
  const { step, next, back, isFirst, isLast } = useWizard(SHIPMENT_WIZARD_STEPS.length);
  const [form, setForm] = React.useState({
    buyer_id: '', product_name: '', quantity: '', unit: 'KG',
    origin: '', destination: '', incoterm: 'FOB',
    etd: '', eta: '', vessel: '', bl_number: '',
    logistics_notes: '', packing_type: '', marks: '',
  });
  const [errors, setErrors] = React.useState({});
  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  function validateStep() {
    const e = {};
    if (step === 0) {
      if (!form.buyer_id)     e.buyer_id     = 'Select a buyer';
      if (!form.product_name) e.product_name = 'Product name required';
      if (!form.quantity)     e.quantity     = 'Quantity required';
    }
    if (step === 1) {
      if (!form.origin)      e.origin      = 'Origin required';
      if (!form.destination) e.destination = 'Destination required';
      if (!form.etd)         e.etd         = 'ETD required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() { if (validateStep()) next(); }

  return (
    <div className="wizard-shell">
      <Stepper steps={SHIPMENT_WIZARD_STEPS} current={step} />

      <div className="wizard-body">
        {step === 0 && (
          <section className="wizard-section" aria-labelledby="wizard-s0">
            <h3 id="wizard-s0">Buyer & Product Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label field-required">Buyer</span>
                <select value={form.buyer_id} onChange={(e) => update('buyer_id', e.target.value)}>
                  <option value="">Select verified buyer</option>
                  {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
                </select>
                {errors.buyer_id && <span className="field-error-msg" role="alert">{errors.buyer_id}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Product name</span>
                <input value={form.product_name} onChange={(e) => update('product_name', e.target.value)} placeholder="e.g. Red Chilli Powder" />
                {errors.product_name && <span className="field-error-msg" role="alert">{errors.product_name}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Quantity</span>
                <input inputMode="decimal" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="e.g. 500" />
                {errors.quantity && <span className="field-error-msg" role="alert">{errors.quantity}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">Unit</span>
                <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {['KG', 'MT', 'LT', 'PCS', 'BAG', 'DRUM', 'CTN'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </label>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="wizard-section" aria-labelledby="wizard-s1">
            <h3 id="wizard-s1">Logistics Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label field-required">Origin port / city</span>
                <input value={form.origin} onChange={(e) => update('origin', e.target.value)} placeholder="e.g. Nhava Sheva, India" />
                {errors.origin && <span className="field-error-msg" role="alert">{errors.origin}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">Destination</span>
                <input value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="e.g. Jebel Ali, UAE" />
                {errors.destination && <span className="field-error-msg" role="alert">{errors.destination}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">Incoterm</span>
                <select value={form.incoterm} onChange={(e) => update('incoterm', e.target.value)}>
                  {['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="wizard-field">
                <span className="field-label field-required">ETD</span>
                <input type="date" value={form.etd} onChange={(e) => update('etd', e.target.value)} />
                {errors.etd && <span className="field-error-msg" role="alert">{errors.etd}</span>}
              </label>
              <label className="wizard-field">
                <span className="field-label">ETA</span>
                <input type="date" value={form.eta} onChange={(e) => update('eta', e.target.value)} />
              </label>
              <label className="wizard-field">
                <span className="field-label">Vessel / Flight</span>
                <input value={form.vessel} onChange={(e) => update('vessel', e.target.value)} placeholder="Optional" />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="wizard-section" aria-labelledby="wizard-s2">
            <h3 id="wizard-s2">Document & Packing Details</h3>
            <div className="wizard-grid">
              <label className="wizard-field">
                <span className="field-label">B/L Number</span>
                <input value={form.bl_number} onChange={(e) => update('bl_number', e.target.value)} placeholder="Bill of lading reference" />
              </label>
              <label className="wizard-field">
                <span className="field-label">Packing type</span>
                <select value={form.packing_type} onChange={(e) => update('packing_type', e.target.value)}>
                  <option value="">Select</option>
                  {['Bags', 'Drums', 'Cartons', 'Pallets', 'Bulk', 'Containers'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="wizard-field wizard-field-full">
                <span className="field-label">Shipping marks</span>
                <input value={form.marks} onChange={(e) => update('marks', e.target.value)} placeholder="Marks and numbers on packages" />
              </label>
              <label className="wizard-field wizard-field-full">
                <span className="field-label">Logistics notes</span>
                <textarea value={form.logistics_notes} onChange={(e) => update('logistics_notes', e.target.value)} rows={3} placeholder="Special handling, temperature, hazmat notes..." />
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-section" aria-labelledby="wizard-s3">
            <h3 id="wizard-s3">Review & Confirm</h3>
            <div className="wizard-review-grid">
              {[
                ['Buyer',        buyers.find((b) => b.id === form.buyer_id)?.company_name || '-'],
                ['Product',      form.product_name],
                ['Quantity',     `${form.quantity} ${form.unit}`],
                ['Origin',       form.origin],
                ['Destination',  form.destination],
                ['Incoterm',     form.incoterm],
                ['ETD',          form.etd],
                ['ETA',          form.eta || '-'],
                ['Vessel',       form.vessel || '-'],
                ['B/L Number',   form.bl_number || '-'],
                ['Packing',      form.packing_type || '-'],
              ].map(([label, value]) => (
                <div key={label} className="wizard-review-row">
                  <span className="wizard-review-label">{label}</span>
                  <span className="wizard-review-value">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="wizard-footer">
        <button className="ghost-button" onClick={isFirst ? onCancel : back}>
          <ArrowLeft size={14} aria-hidden="true" />
          {isFirst ? 'Cancel' : 'Back'}
        </button>
        <div className="wizard-step-count" aria-live="polite">
          Step {step + 1} of {SHIPMENT_WIZARD_STEPS.length}
        </div>
        <button className="tactical-button" onClick={isLast ? () => onComplete(form) : handleNext}>
          {isLast ? 'Create Shipment' : 'Continue'}
          {!isLast && <ChevronRight size={14} aria-hidden="true" />}
        </button>
      </footer>
    </div>
  );
}

const SHIPMENT_STAGE_LIST = [
  'Order Confirmed',
  'Production Ready',
  'Pre-Shipment Inspection',
  'Customs Clearance - Export',
  'Port Loading',
  'In Transit',
  'Customs Clearance - Import',
  'Port Discharge',
  'Delivered',
];

const ShipmentProgressTracker = React.memo(function ShipmentProgressTracker({ currentStage, shipment }) {
  const currentIdx = SHIPMENT_STAGE_LIST.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const active = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div className="shipment-tracker" aria-label="Shipment progress">
      <ol className="tracker-steps">
        {SHIPMENT_STAGE_LIST.map((stage, i) => {
          const done    = i < active;
          const current = i === active;
          return (
            <li
              key={i}
              className={`tracker-step ${done ? 'done' : current ? 'current' : 'pending'}`}
              aria-current={current ? 'step' : undefined}
            >
              <div className="tracker-node" aria-hidden="true">
                {done
                  ? <CheckCircle2 size={14} />
                  : current
                    ? <Zap size={14} />
                    : <span>{i + 1}</span>
                }
              </div>
              <span className="tracker-stage-label">{stage}</span>
              {i < SHIPMENT_STAGE_LIST.length - 1 && (
                <span className={`tracker-line ${done ? 'done' : ''}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
      {shipment?.etd && (
        <div className="tracker-meta">
          <span>ETD <time dateTime={shipment.etd}>{new Date(shipment.etd).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>
          {shipment.eta && <span>ETA <time dateTime={shipment.eta}>{new Date(shipment.eta).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>}
          {shipment.vessel && <span>Vessel - {shipment.vessel}</span>}
        </div>
      )}
    </div>
  );
});


const shipmentFilterOptions = ['All', 'Active', 'In Transit', 'Delivered', 'Issue / Hold'];

export default function ShipmentTrackerPage({ navigate, onBack, shipmentId }) {
  const [shipments, setShipments] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(shipmentId || '');
  const [notice, setNotice] = useState('');
  const [dataMode, setDataMode] = useState('Loading');
  const [form, setForm] = useState({
    buyer_id: '',
    product_name: '',
    quantity: '',
    origin: '',
    destination: '',
    current_stage: 'Order Confirmed',
    etd: '',
    eta: '',
    logistics_notes: ''
  });

  useEffect(() => {
    let active = true;
    async function loadTracker() {
      const result = await getShipmentTrackerData(demoTenantId);
      if (!active) return;
      const nextShipments = result.data?.shipments || [];
      const nextBuyers = result.data?.buyers || [];
      setShipments(nextShipments);
      setBuyers(nextBuyers);
      setDataMode(result.data?.dataMode || backendStatus.mode);
      setForm((current) => ({ ...current, buyer_id: current.buyer_id || nextBuyers[0]?.id || '' }));
      if (shipmentId) setSelectedId(shipmentId);
      else setSelectedId((current) => current || nextShipments[0]?.id || '');
    }
    loadTracker();
    return () => { active = false; };
  }, [shipmentId]);

  const visibleShipments = shipments.filter((shipment) => {
    const status = getShipmentStatus(shipment);
    if (filter === 'All') return true;
    if (filter === 'Active') return status === 'active' || status === 'delayed';
    if (filter === 'In Transit') return shipment.current_stage === 'In Transit';
    if (filter === 'Delivered') return shipment.current_stage === 'Delivered';
    return shipment.current_stage === 'Issue / Hold';
  });
  const shipmentRows = React.useMemo(() => visibleShipments.map((shipment) => ({
    ...shipment,
    reference: shipment.shipment_reference || shipment.reference || shipment.id,
    status: shipmentStatusLabel(getShipmentStatus(shipment))
  })), [visibleShipments]);
  const { sorted: sortedShipments, sortKey, sortDir, toggle: toggleSort } = useSortable(shipmentRows, 'current_stage');
  const { selected, toggle, toggleAll, clear, isSelected, allSelected, someSelected, selectedItems } = useRowSelection(sortedShipments);
  const SHIPMENT_COLS = React.useMemo(() => [
    { key: 'reference', label: 'Reference', flex: 1.2 },
    { key: 'product_name', label: 'Product', flex: 1.5 },
    { key: 'destination', label: 'Destination', flex: 1 },
    { key: 'current_stage', label: 'Stage', flex: 1.2 },
    { key: 'etd', label: 'ETD', flex: 0.9, accessor: (shipment) => formatShipmentDate(shipment.etd) },
    { key: 'status', label: 'Status', flex: 0.9, sortable: false },
  ], []);
  const selectedShipment = shipments.find((shipment) => shipment.id === selectedId || shipment.shipment_reference === selectedId) || null;
  const referencePreview = generateShipmentReference(shipments);
  const verifiedBuyer = buyers.find((buyer) => buyer.id === form.buyer_id);
  const summary = {
    active: shipments.filter((shipment) => ['active', 'delayed'].includes(getShipmentStatus(shipment))).length,
    inTransit: shipments.filter((shipment) => shipment.current_stage === 'In Transit').length,
    delivered: shipments.filter((shipment) => shipment.current_stage === 'Delivered').length,
    urgent: shipments.filter((shipment) => getShipmentStatus(shipment) === 'urgent').length
  };

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'buyer_id') setNotice('');
  }

  function openShipment(shipment) {
    setSelectedId(shipment.id);
    if (navigate) navigate(`/export-os/shipments/${shipment.id}`);
  }

  function closeDetail() {
    setSelectedId('');
    if (navigate) navigate('/export-os/shipments');
  }

  async function updateShipmentStage(shipment, nextStage) {
    if (nextStage === 'Delivered') {
      await requestDeliveryApproval(shipment);
      return;
    }
    const persisted = await updateShipment(demoTenantId, shipment.id, { current_stage: nextStage }, buyers);
    if (!persisted.ok) {
      setNotice(persisted.error?.message || 'Shipment stage could not be saved.');
      return;
    }
    const nextShipment = { ...shipment, ...persisted.data, current_stage: nextStage, status: getShipmentStatus({ ...shipment, current_stage: nextStage }) };
    setShipments((current) => current.map((item) => item.id === shipment.id ? nextShipment : item));
    await createAuditLog({
      tenant_id: demoTenantId,
      action_type: 'Shipment status changed',
      module: 'Shipment Tracker',
      related_table: 'shipments',
      related_record_id: shipment.id,
      actor: 'COO Command',
      description: `Shipment ${shipment.shipment_reference} moved from ${shipment.current_stage} to ${nextStage}.`,
      old_value: { current_stage: shipment.current_stage },
      new_value: { current_stage: nextStage },
      risk_level: nextStage === 'Issue / Hold' ? 'High' : 'Low'
    });
    const nextStatus = getShipmentStatus(nextShipment);
    if (nextStatus === 'delayed' || nextStatus === 'urgent' || nextStage === 'Issue / Hold') {
      await sendSlackNotification({
        type: 'Shipment Delayed',
        priority: 'URGENT',
        reference: nextShipment.shipment_reference,
        buyer: nextShipment.buyer_company || nextShipment.buyer?.company_name,
        status: nextStage,
        eta: nextShipment.eta,
        actionRequired: getNextShipmentAction(nextShipment),
        source: 'Shipment Tracker'
      });
    }
  }

  async function requestDeliveryApproval(shipment) {
    const result = await requestSensitiveActionApproval({
      action_type: 'MARK_SHIPMENT_DELIVERED',
      tenant_id: demoTenantId,
      title: `${shipment.shipment_reference} delivery confirmation needs founder approval`,
      related_record: shipment.id,
      related_record_label: shipment.shipment_reference,
      requested_by: 'COO Command',
      executive_owner: 'COO Command',
      department: 'Operations',
      source_module: 'Shipment Tracker',
      risk_level: getShipmentStatus(shipment) === 'urgent' ? 'Critical' : 'High',
      reason: 'Shipment delivery status changes buyer-facing operational records and requires founder approval.',
      summary: `${shipment.shipment_reference} remains at ${shipment.current_stage}; Delivered will not be applied until approved.`,
      details: {
        shipment_reference: shipment.shipment_reference,
        buyer_company: shipment.buyer_company || shipment.buyer?.company_name,
        product: shipment.product_name,
        current_stage: shipment.current_stage,
        destination: shipment.destination,
        eta: shipment.eta
      }
    });
    if (result.ok) {
      setShipments((current) => current.map((item) => item.id === shipment.id ? { ...item, approval_status: 'Pending Approval' } : item));
      setNotice(`Founder approval requested for ${shipment.shipment_reference}. Delivery remains blocked until approved.`);
    } else {
      setNotice(result.error?.message || 'Delivery approval request failed.');
    }
  }

  async function submitShipment(eventOrPayload) {
    const payload = eventOrPayload?.preventDefault ? form : eventOrPayload || form;
    eventOrPayload?.preventDefault?.();
    const verification = await verifyShipmentCompany(demoTenantId, payload.buyer_id, buyers);
    if (!verification.ok || !verification.data) {
      setNotice('Company not verified. Add buyer first.');
      return;
    }
    const result = await createShipment(demoTenantId, payload, shipments, buyers);
    if (!result.ok) {
      setNotice(result.error?.message || 'Shipment could not be created.');
      return;
    }
    setShipments((current) => [result.data, ...current]);
    setSelectedId(result.data.id);
    setNotice(`Shipment created: ${result.data.shipment_reference}`);
    announceToSR('Shipment created');
    const shipmentStatus = getShipmentStatus(result.data);
    await sendSlackNotification({
      type: 'New Shipment Created',
      priority: shipmentStatus === 'urgent' || shipmentStatus === 'delayed' ? 'WARNING' : 'INFO',
      reference: result.data.shipment_reference,
      buyer: result.data.buyer_company || result.data.buyer?.company_name,
      status: result.data.current_stage,
      eta: result.data.eta,
      actionRequired: getNextShipmentAction(result.data),
      source: 'Shipment Tracker'
    });
    if (shipmentStatus === 'delayed') {
      await sendSlackNotification({
        type: 'Shipment Delayed',
        priority: 'URGENT',
        reference: result.data.shipment_reference,
        buyer: result.data.buyer_company || result.data.buyer?.company_name,
        status: 'Delayed',
        eta: result.data.eta,
        actionRequired: getNextShipmentAction(result.data),
        source: 'Shipment Tracker'
      });
    }
    setForm({
      buyer_id: buyers[0]?.id || '',
      product_name: '',
      quantity: '',
      origin: '',
      destination: '',
      current_stage: 'Order Confirmed',
      etd: '',
      eta: '',
      logistics_notes: ''
    });
  }

  return (
    <ExportOSShell className="shipment-shell">
      <header className="deck-header shipment-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>Shipment Tracker</h1>
          <p>Track export shipments from order confirmation to delivery with verified buyer linkage, clear references, clean stages, and next actions.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={dataMode} state={dataMode === 'Live Supabase' ? 'online' : 'attention'} />
          <StatusBadge label={`${shipments.length} shipments`} state="progress" />
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <section className={`shipment-notice ${notice.includes('not verified') ? 'urgent' : ''}`}><AlertTriangle size={16} /><span>{notice}</span></section>}

      <section className="shipment-summary-grid">
        <ShipmentStat label="Active" value={summary.active} note="Open or delayed" />
        <ShipmentStat label="In Transit" value={summary.inTransit} note="Carrier movement" />
        <ShipmentStat label="Delivered" value={summary.delivered} note="Completed" />
        <ShipmentStat label="Issue / Hold" value={summary.urgent} note="Urgent" />
      </section>

      <main className="shipment-layout">
        <section className="shipment-left-stack">
          <ShipmentWizard buyers={buyers} onComplete={submitShipment} onCancel={() => setNotice('Shipment creation cancelled.')} />
          <ShipmentFilterPanel filter={filter} onFilter={setFilter} />
        </section>
        <section className="shipment-card-grid">
          <BulkActionBar
            count={selected.size}
            onClear={clear}
            onExport={() => exportCSV(selectedItems, SHIPMENT_COLS, 'shipments')}
            actions={[
              { label: 'Mark Completed', icon: CheckCircle2, onClick: async () => {
                for (const s of selectedItems) {
                  await updateShipmentStage(s, 'Delivered');
                }
                clear();
                setNotice(`${selectedItems.length} shipment(s) marked as Delivered.`);
              }},
              { label: 'Escalate', icon: TriangleAlert, onClick: async () => {
                for (const s of selectedItems) {
                  await updateShipmentStage(s, 'Issue / Hold');
                }
                clear();
                setNotice(`${selectedItems.length} shipment(s) escalated to Issue / Hold.`);
              }},
            ]}
          />
          <SortableTableHeader
            columns={SHIPMENT_COLS}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleAll}
          />
          {sortedShipments.map((shipment) => (
            <ShipmentTrackerRow
              key={shipment.id}
              shipment={shipment}
              selected={isSelected(shipment.id)}
              onToggle={() => toggle(shipment.id)}
              onOpen={openShipment}
            />
          ))}
          {!sortedShipments.length && <section className="shipment-empty"><strong>No shipments match this filter.</strong><span>Create a shipment or switch filter.</span></section>}
        </section>
      </main>

      {selectedShipment && <ShipmentDetailModal shipment={selectedShipment} onClose={closeDetail} onChangeStage={updateShipmentStage} />}
    </ExportOSShell>
  );
}

function ShipmentStat({ label, value, note }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ShipmentCreatePanel({ form, buyers, verifiedBuyer, referencePreview, onChange, onSubmit }) {
  return (
    <section className="shipment-panel">
      <div className="approval-section-header"><div><span>Create Shipment</span><h2>{referencePreview}</h2></div><PackageCheck size={18} /></div>
      <form className="shipment-form" onSubmit={onSubmit}>
        <label><span>Buyer company</span><select value={form.buyer_id} onChange={(event) => onChange('buyer_id', event.target.value)} required><option value="">Select verified buyer</option>{buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyer.company_name}</option>)}</select></label>
        {!verifiedBuyer && <p className="shipment-form-warning">Company not verified. Add buyer first.</p>}
        <label><span>Product</span><input value={form.product_name} onChange={(event) => onChange('product_name', event.target.value)} required /></label>
        <label><span>Quantity</span><input value={form.quantity} onChange={(event) => onChange('quantity', event.target.value)} required /></label>
        <label><span>Origin</span><input value={form.origin} onChange={(event) => onChange('origin', event.target.value)} required /></label>
        <label><span>Destination</span><input value={form.destination} onChange={(event) => onChange('destination', event.target.value)} required /></label>
        <label><span>Current stage</span><select value={form.current_stage} onChange={(event) => onChange('current_stage', event.target.value)}>{shipmentStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <label><span>ETD</span><input type="date" value={form.etd} onChange={(event) => onChange('etd', event.target.value)} /></label>
        <label><span>ETA</span><input type="date" value={form.eta} onChange={(event) => onChange('eta', event.target.value)} /></label>
        <label className="span-2"><span>Logistics notes</span><textarea value={form.logistics_notes} onChange={(event) => onChange('logistics_notes', event.target.value)} /></label>
        <button className="tactical-button span-2" type="submit" disabled={!verifiedBuyer}>Create Shipment</button>
      </form>
    </section>
  );
}

function ShipmentFilterPanel({ filter, onFilter }) {
  return <section className="shipment-panel"><div className="approval-section-header"><div><span>Filters</span><h2>Status view</h2></div><SlidersHorizontal size={18} /></div><div className="shipment-filter-row">{shipmentFilterOptions.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}</div></section>;
}

const ShipmentTrackerCard = React.memo(function ShipmentTrackerCard({ shipment, onOpen }) {
  const status = getShipmentStatus(shipment);
  return (
    <button className={`shipment-card status-${status}`} onClick={() => onOpen(shipment)}>
      <header>
        <div><span>{shipment.shipment_reference}</span><strong>{shipment.buyer_company || shipment.buyer?.company_name || 'Company not verified'}</strong></div>
        <StatusBadge label={shipmentStatusLabel(status)} state={shipmentStatusState(status)} />
      </header>
      <div className="shipment-card-gridlet">
        <div><span>Product</span><strong>{shipment.product_name}</strong></div>
        <div><span>Quantity</span><strong>{shipment.quantity}</strong></div>
        <div><span>Origin</span><strong>{shipment.origin || 'Pending'}</strong></div>
        <div><span>Destination</span><strong>{shipment.destination}</strong></div>
        <div><span>Current Stage</span><strong>{shipment.current_stage}</strong></div>
        <div><span>ETD / ETA</span><strong>{formatShipmentDate(shipment.etd)} / {formatShipmentDate(shipment.eta)}</strong></div>
      </div>
      <footer><span>Next action</span><strong>{getNextShipmentAction(shipment)}</strong></footer>
    </button>
  );
});

const ShipmentTrackerRow = React.memo(function ShipmentTrackerRow({ shipment, selected, onToggle, onOpen }) {
  const status = getShipmentStatus(shipment);
  return (
    <button className={`shipment-card stable-row status-${status}`} onClick={() => onOpen(shipment)}>
      <div className="stable-cell stable-check">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select shipment ${shipment.reference}`}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
      <div className="stable-cell stable-data" style={{ flex: 1.2, minWidth: 80 }}>
        <span>Reference</span>
        <strong>{shipment.reference}</strong>
      </div>
      <div className="stable-cell stable-data" style={{ flex: 1.5, minWidth: 80 }}>
        <span>Product</span>
        <strong>{shipment.product_name}</strong>
      </div>
      <div className="stable-cell stable-data" style={{ flex: 1, minWidth: 80 }}>
        <span>Destination</span>
        <strong>{shipment.destination}</strong>
      </div>
      <div className="stable-cell stable-data" style={{ flex: 1.2, minWidth: 80 }}>
        <span>Stage</span>
        <strong>{shipment.current_stage}</strong>
      </div>
      <div className="stable-cell stable-data" style={{ flex: 0.9, minWidth: 80 }}>
        <span>ETD</span>
        <strong>{formatShipmentDate(shipment.etd)}</strong>
      </div>
      <div className="stable-cell stable-data" style={{ flex: 0.9, minWidth: 80 }}>
        <span>Status</span>
        <StatusBadge label={shipmentStatusLabel(status)} state={shipmentStatusState(status)} />
      </div>
    </button>
  );
});

function ShipmentDetailModal({ shipment, onClose, onChangeStage }) {
  const modalRef = React.useRef(null);
  useFocusTrap(modalRef, true);
  const completedDocuments = new Set(shipment.documents || []);
  const timeline = shipmentStages.map((stage) => {
    const currentIndex = shipmentStages.indexOf(shipment.current_stage);
    const index = shipmentStages.indexOf(stage);
    return { stage, state: stage === shipment.current_stage ? 'current' : index < currentIndex && shipment.current_stage !== 'Issue / Hold' ? 'done' : 'pending' };
  });
  return (
    <div className="shipment-modal-backdrop" role="presentation" onClick={onClose}>
      <section ref={modalRef} className="shipment-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-modal-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Shipment Detail</span><h2 id="shipment-modal-title">{shipment.shipment_reference}</h2><p>{getNextShipmentAction(shipment)}</p></div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </header>
        <ShipmentProgressTracker
          currentStage={shipment.current_stage}
          shipment={shipment}
        />
        <div className="shipment-detail-grid">
          <section>
            <div className="approval-section-header"><div><span>Buyer details</span><h3>{shipment.buyer_company || shipment.buyer?.company_name || 'Company not verified'}</h3></div><Building2 size={17} /></div>
            <ShipmentInfo rows={[['Buyer', shipment.buyer?.buyer_name || 'Pending'], ['Country', shipment.buyer?.country || 'Pending'], ['Email', shipment.buyer?.email || 'Pending'], ['Phone', shipment.buyer?.phone || 'Pending']]} />
          </section>
          <section>
            <div className="approval-section-header"><div><span>Product details</span><h3>{shipment.product_name}</h3></div><PackageCheck size={17} /></div>
            <ShipmentInfo rows={[['Quantity', shipment.quantity], ['Origin', shipment.origin || 'Pending'], ['Destination', shipment.destination], ['ETD / ETA', `${formatShipmentDate(shipment.etd)} / ${formatShipmentDate(shipment.eta)}`]]} />
          </section>
          <section className="span-2">
            <div className="approval-section-header"><div><span>Timeline</span><h3>{shipment.current_stage}</h3></div><Route size={17} /></div>
            <div className="shipment-timeline">{timeline.map((item) => <div key={item.stage} className={item.state}><i /> <span>{item.stage}</span></div>)}</div>
          </section>
          <section>
            <div className="approval-section-header"><div><span>Documents checklist</span><h3>Export file</h3></div><FileText size={17} /></div>
            <div className="shipment-doc-list">{shipmentDocumentChecklist.map((doc) => <span key={doc} className={completedDocuments.has(doc) ? 'done' : ''}><CheckCircle2 size={14} />{doc}</span>)}</div>
          </section>
          <section>
            <div className="approval-section-header"><div><span>Logistics notes</span><h3>Next action</h3></div><ClipboardCheck size={17} /></div>
            <p>{shipment.logistics_notes || 'No logistics notes added yet.'}</p>
            <strong className="shipment-next-action">{getNextShipmentAction(shipment)}</strong>
            <div className="shipment-approval-gate">
              <span>Delivery approval</span>
              <StatusBadge label={shipment.approval_status || 'Approved'} state={shipment.approval_status === 'Pending Approval' ? 'attention' : 'online'} />
              <small>Delivered cannot be applied until founder approval is recorded.</small>
            </div>
            <div className="shipment-stage-actions">
              {['In Transit', 'Issue / Hold', 'Delivered'].map((stage) => (
                <button key={stage} className="ghost-button" onClick={() => onChangeStage(shipment, stage)}>{stage}</button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ShipmentInfo({ rows }) {
  return <div className="shipment-info-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Pending'}</strong></div>)}</div>;
}

function shipmentStatusLabel(status) {
  return status === 'completed' ? 'Completed' : status === 'urgent' ? 'Urgent' : status === 'delayed' ? 'Delayed' : 'Active';
}

function shipmentStatusState(status) {
  if (status === 'completed') return 'online';
  if (status === 'urgent' || status === 'delayed') return 'error';
  return 'progress';
}

function formatShipmentDate(value) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { dateStyle: 'medium' });
}

