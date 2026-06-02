import React, { useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  BrainCircuit,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  PackageCheck,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  TriangleAlert,
  UsersRound
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { SeverityBadge, StatusBadge } from '../shared/uiPrimitives.jsx';
const supplierDirectorySeed = [];

const supplierProductsSeed = [];

const procurementRequestSeed = [
  ['Black pepper', '900 KG', 'May 30, 2026', 'UAE-SHP-001', 'Malabar Spice Supplier', 'Quote Requested', 'COO Command', 'High'],
  ['Export Bags', '1,200 pcs', 'May 28, 2026', 'Warehouse Shortage', 'Packaging vendor pending', 'Supplier Contact Needed', 'Operations', 'Critical'],
  ['Black pepper', '500 KG', 'May 31, 2026', 'OMN-SHP-002', 'Nizam Agro', 'Confirmation Pending', 'COO Command', 'High'],
  ['Cumin Seeds', '300 KG', 'June 2, 2026', 'Quality Hold Replacement', 'Gujarat Seeds Co', 'Blocked', 'COO Command', 'Medium']
].map(([product, quantityNeeded, requiredDate, linkedWorkflow, suggestedSupplier, status, owner, priority], index) => ({ id: `procurement-${index}`, product, quantityNeeded, requiredDate, linkedWorkflow, suggestedSupplier, status, owner, priority }));

const supplierFollowupSeed = [
  ['Nizam Agro', 'Black pepper', 'Confirm current price and ready date', 'Today 16:00', 'COO Command', 'Level 1', 'Pending Confirmation'],
  ['Packaging vendor pending', 'Export Bags', 'Confirm packing availability', 'Today 13:00', 'Operations', 'Level 2', 'Delayed'],
  ['Gujarat Seeds Co', 'Cumin Seeds', 'Confirm quality grade correction', 'Tomorrow 10:00', 'COO Command', 'Founder if unresolved', 'Quality Issue'],
  ['Malabar Spice Supplier', 'Black pepper', 'Confirm dispatch-ready quantity', 'Today 18:00', 'COO Command', 'Level 1', 'Monitoring']
].map(([supplier, product, confirmation, deadline, owner, escalation, status], index) => ({ id: `followup-${index}`, supplier, product, confirmation, deadline, owner, escalation, status }));

const supplierPriceHistorySeed = [
  ['Black pepper', 'Malabar Spice Supplier', 'Grade A', 'INR 612 / KG', '900 KG', 'May 25, 2026', 'Stable supplier rate'],
  ['Black pepper', 'Nizam Agro', 'Premium', 'INR 146 / KG', '500 KG', 'May 22, 2026', 'Price revision expected'],
  ['Cumin Seeds', 'Gujarat Seeds Co', 'Sortex', 'INR 248 / KG', '300 KG', 'May 20, 2026', 'Quality hold affected quote confidence'],
  ['Red Chilli', 'Deccan Chilli Traders', 'Export Grade', 'INR 198 / KG', '700 KG', 'May 19, 2026', 'Availability seasonal']
].map(([product, supplier, grade, price, quantity, date, notes], index) => ({ id: `price-history-${index}`, product, supplier, grade, price, quantity, date, notes }));

const supplierQualityIssueSeed = [
  ['Cumin Seeds', 'CS2404', 'Moisture variance in sample lot', 'High', 'Replacement sample requested', 'Under Review'],
  ['Export Bags', 'BAG-EXP-01', 'Stitching strength needs confirmation', 'Medium', 'Awaiting supplier photos', 'Open'],
  ['Cardamom', 'CD2405', 'Age review before high-value shipment', 'Medium', 'Supplier certificate pending', 'Escalated']
].map(([product, batch, issue, severity, response, status], index) => ({ id: `supplier-quality-${index}`, product, batch, issue, severity, response, status }));

const purchasePlanningSeed = [
  ['UAE black pepper shipment', '900 KG Black pepper', 'Malabar Spice Supplier', 'Low', '2 days', 'Confirm dispatch-ready quantity'],
  ['Packing shortage forecast', '1,200 export bags', 'Packaging vendor pending', 'High', '1 day', 'Create procurement follow-up'],
  ['Oman turmeric enquiry', '500 KG Black pepper', 'Nizam Agro', 'Medium', '3 days', 'Confirm price before CFO quote review'],
  ['Cumin replacement option', '300 KG Cumin Seeds', 'Alternate supplier needed', 'High', '4 days', 'Do not allocate quality-hold batch']
].map(([demand, requiredProcurement, supplierOptions, priceRisk, leadTimeRisk, action], index) => ({ id: `purchase-plan-${index}`, demand, requiredProcurement, supplierOptions, priceRisk, leadTimeRisk, action }));

function SupplierProcurementDashboard({ navigate, onBack, view = 'suppliers', supplierId }) {
  const [suppliers, setSuppliers] = useState(supplierDirectorySeed);
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(supplierId || null);
  const [requests, setRequests] = useState(procurementRequestSeed);
  const [followups, setFollowups] = useState(supplierFollowupSeed);
  const [notice, setNotice] = useState('');
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedId) || null;
  const visibleSuppliers = filter === 'All' ? suppliers : suppliers.filter((supplier) => supplier.status === filter || supplier.risk === filter);
  const pendingConfirmations = followups.filter((item) => ['Pending Confirmation', 'Delayed', 'Quality Issue'].includes(item.status)).length;
  const procurementRisks = requests.filter((item) => ['Blocked', 'Supplier Contact Needed'].includes(item.status) || item.priority === 'Critical').length;
  const currentDateTime = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

  function openSupplier(id) {
    setSelectedId(id);
    navigate(`/export-os/suppliers/${id}`);
  }

  function createProcurementRequest() {
    const request = {
      id: `procurement-local-${Date.now()}`,
      product: 'Export Bags',
      quantityNeeded: '1,200 pcs',
      requiredDate: 'Today',
      linkedWorkflow: 'Warehouse Shortage',
      suggestedSupplier: 'Packaging vendor pending',
      status: 'Supplier Contact Needed',
      owner: 'COO Command',
      priority: 'Critical'
    };
    setRequests((current) => [request, ...current]);
    setNotice('Procurement request created in Connect Supabase to activate. No supplier purchase or payment was made.');
  }

  function createSupplierFollowup() {
    if (!selectedSupplier) {
      setNotice('Select a supplier before creating a follow-up.');
      return;
    }
    const followup = {
      id: `followup-local-${Date.now()}`,
      supplier: selectedSupplier?.name,
      product: selectedSupplier?.products?.[0],
      confirmation: 'Confirm stock availability and dispatch-ready date',
      deadline: 'Today 18:00',
      owner: 'COO Command',
      escalation: 'Level 1',
      status: 'Pending Confirmation'
    };
    setFollowups((current) => [followup, ...current]);
    setNotice(`Follow-up prepared for ${selectedSupplier?.name}. No supplier confirmation is claimed.`);
  }

  function updateConfirmationStatus(productId) {
    setNotice('Confirmation status updated in Connect Supabase to activate for COO review. Supplier confirmation is still pending backend proof.');
  }

  function escalateSupplierDelay() {
    if (!selectedSupplier) {
      setNotice('Select a supplier before escalating delay.');
      return;
    }
    setSuppliers((current) => current.map((supplier) => supplier.id === selectedSupplier?.id ? { ...supplier, status: 'Delayed', risk: 'High' } : supplier));
    setNotice(`${selectedSupplier?.name} delay escalation prepared for COO review.`);
  }

  function linkProcurementToShipment() {
    setNotice('Procurement linked to UAE-SHP-001 in Connect Supabase to activate. Shipment dispatch was not confirmed.');
  }

  return (
    <ExportOSShell className="supplier-shell">
      <header className="deck-header supplier-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'procurement' ? 'Procurement Control' : view === 'purchase-followups' ? 'Purchase Follow-ups' : view === 'detail' ? 'Supplier Detail Page' : 'Supplier & Procurement Control'}</h1>
          <p>Supply Operations Layer for supplier records, availability, procurement requests, follow-ups, price history, quality issues, and delivery commitments.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <StatusBadge label={`${suppliers.filter((supplier) => supplier.status === 'Active').length} active suppliers`} state="online" />
          <StatusBadge label={`${pendingConfirmations} pending confirmations`} state="attention" />
          <StatusBadge label={`${procurementRisks} procurement risks`} state="attention" />
          <span className="deck-time-chip">{currentDateTime}</span>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {notice && <div className="supplier-action-notice"><CheckCircle2 size={16} /><span>{notice}</span></div>}

      <main className="supplier-layout">
        <section className="supplier-left-stack">
          <SupplierDirectory suppliers={visibleSuppliers} selectedId={selectedSupplier?.id} filter={filter} onFilter={setFilter} onOpen={openSupplier} />
          <SupplierReliabilityScore supplier={selectedSupplier} />
          <SupplierMemoryPanel />
        </section>
        <section className="supplier-center-stack">
          <SupplierDetailPage supplier={selectedSupplier} />
          <ProductAvailabilityBoard products={supplierProductsSeed} onUpdate={updateConfirmationStatus} />
          <ProcurementRequestsPanel requests={requests} onCreate={createProcurementRequest} onLink={linkProcurementToShipment} />
          <SupplierPriceHistory history={supplierPriceHistorySeed} />
        </section>
        <aside className="supplier-right-stack">
          <SupplierFollowupQueue followups={followups} onCreate={createSupplierFollowup} onEscalate={escalateSupplierDelay} />
          <SupplierQualityIssueLog issues={supplierQualityIssueSeed} />
          <PurchasePlanningPanel plans={purchasePlanningSeed} onCreate={createProcurementRequest} onEscalate={escalateSupplierDelay} />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function SupplierDirectory({ suppliers, selectedId, filter, onFilter, onOpen }) {
  const filters = ['All', 'Active', 'Pending Confirmation', 'Delayed', 'Quality Issue', 'Blocked', 'Monitoring'];
  return (
    <section className="supplier-panel">
      <div className="approval-section-header"><div><span>Supplier Directory</span><h2>Supply base</h2></div><UsersRound size={18} /></div>
      <div className="supplier-filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item}</button>)}</div>
      <div className="supplier-directory-list">
        {suppliers.map((supplier) => (
          <button key={supplier.id} className={selectedId === supplier.id ? 'selected' : ''} onClick={() => onOpen(supplier.id)}>
            <div><strong>{supplier.name}</strong><StatusBadge label={supplier.status} state={getSupplierState(supplier.status)} /></div>
            <span>{supplier.location} / {supplier.products.join(', ')}</span>
            <small>{supplier.contact} / WhatsApp {supplier.whatsapp} / Last response: {supplier.lastResponse}</small>
            <b>{supplier.score}% reliability</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function SupplierDetailPage({ supplier }) {
  if (!supplier) return <div className="empty-state"><p>Select a supplier from the list to view details.</p></div>;
  return (
    <section className="supplier-panel">
      <div className="approval-section-header"><div><span>Supplier Detail Page</span><h2>{supplier.name}</h2></div><Building2 size={18} /></div>
      <div className="supplier-detail-grid">
        {[
          ['Location', supplier.location],
          ['Products supplied', supplier.products.join(', ')],
          ['Contact person', supplier.contact],
          ['Phone / WhatsApp', `${supplier.phone} / ${supplier.whatsapp}`],
          ['Email', supplier.email],
          ['Past orders', 'Order history available when connected'],
          ['Linked shipments', 'UAE-SHP-001 / OMN-SHP-002'],
          ['Pending follow-ups', supplier.status === 'Active' ? '1 monitoring item' : 'Action required']
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}

function ProductAvailabilityBoard({ products, onUpdate }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Product Availability Board</span><h2>Sourceable stock</h2></div><Boxes size={18} /></div><div className="supplier-table-list">{products.map((item) => <article key={item.id}><div><strong>{item.product}</strong><StatusBadge label={item.status} state={getSupplierState(item.status)} /></div><span>{item.supplier} / {item.quantity} / {item.grade}</span><small>Ready: {item.readyDate} / Estimate: {item.price}</small><button onClick={() => onUpdate(item.id)}>Update Confirmation</button></article>)}</div></section>;
}

function ProcurementRequestsPanel({ requests, onCreate, onLink }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Procurement Requests</span><h2>Purchase planning queue</h2></div><ClipboardCheck size={18} /></div><div className="supplier-table-list">{requests.map((request) => <article key={request.id}><div><strong>{request.product}</strong><StatusBadge label={request.status} state={getSupplierState(request.status)} /></div><span>{request.quantityNeeded} needed by {request.requiredDate} / {request.linkedWorkflow}</span><small>{request.suggestedSupplier} / Owner: {request.owner} / Priority: {request.priority}</small></article>)}</div><div className="supplier-action-row"><button onClick={onCreate}>Create Procurement Request</button><button onClick={onLink}>Link Procurement to Shipment</button></div></section>;
}

function SupplierFollowupQueue({ followups, onCreate, onEscalate }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Supplier Follow-up Queue</span><h2>Pending confirmations</h2></div><TimerReset size={18} /></div><div className="supplier-table-list">{followups.map((item) => <article key={item.id}><div><strong>{item.supplier}</strong><StatusBadge label={item.status} state={getSupplierState(item.status)} /></div><span>{item.product} / {item.confirmation}</span><small>Deadline: {item.deadline} / Owner: {item.owner} / Escalation: {item.escalation}</small></article>)}</div><div className="supplier-action-row"><button onClick={onCreate}>Create Supplier Follow-up</button><button onClick={onEscalate}>Escalate Supplier Delay</button></div></section>;
}

function SupplierReliabilityScore({ supplier }) {
  if (!supplier) return <div className="empty-state"><p>Select a supplier to view reliability details.</p></div>;
  const drivers = [
    ['Response time', supplier.score > 80 ? 'Strong' : 'Needs Review'],
    ['Delivery reliability', supplier.score > 75 ? 'Monitoring' : 'Risk Detected'],
    ['Quality consistency', supplier.status === 'Quality Issue' ? 'Attention' : 'Stable'],
    ['Pricing stability', supplier.risk === 'High' ? 'Volatile' : 'Monitoring'],
    ['Documentation support', 'Needs COO review'],
    ['Dispute history', supplier.risk === 'Low' ? 'Low' : 'Monitor']
  ];
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Supplier Reliability Score</span><h2>{supplier.score}% / {supplier.risk} risk</h2></div><Gauge size={18} /></div><div className="supplier-score-meter"><i style={{ width: `${supplier.score}%` }} /></div><div className="supplier-memory-list">{drivers.map(([label, value]) => <span key={label}>{label}: {value}</span>)}</div><p>Improvement notes are advisory until connected procurement and quality history is approved.</p></section>;
}

function SupplierPriceHistory({ history }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Price History</span><h2>Pricing engine feed</h2></div><CircleDollarSign size={18} /></div><div className="supplier-table-list">{history.map((item) => <article key={item.id}><div><strong>{item.product}</strong><span>{item.price}</span></div><span>{item.supplier} / {item.grade} / {item.quantity}</span><small>{item.date} / {item.notes}</small></article>)}</div></section>;
}

function SupplierQualityIssueLog({ issues }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Quality Issue Log</span><h2>Supplier quality risks</h2></div><TriangleAlert size={18} /></div><div className="supplier-table-list">{issues.map((issue) => <article key={issue.id}><div><strong>{issue.product} / {issue.batch}</strong><SeverityBadge severity={issue.severity} /></div><span>{issue.issue}</span><small>{issue.supplierResponse} / {issue.status}</small></article>)}</div></section>;
}

function PurchasePlanningPanel({ plans, onCreate, onEscalate }) {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Purchase Planning</span><h2>Demand and shortage forecast</h2></div><TrendingUp size={18} /></div><div className="supplier-table-list">{plans.map((plan) => <article key={plan.id}><div><strong>{plan.demand}</strong><SeverityBadge severity={plan.priceRisk === 'High' ? 'High' : 'Medium'} /></div><span>{plan.requiredProcurement} / {plan.supplierOptions}</span><small>Price risk: {plan.priceRisk} / Lead time: {plan.leadTimeRisk} / Next: {plan.action}</small></article>)}</div><div className="supplier-action-row"><button onClick={onCreate}>Create Procurement Request</button><button onClick={onEscalate}>Escalate Procurement Risk</button></div></section>;
}

function SupplierMemoryPanel() {
  return <section className="supplier-panel"><div className="approval-section-header"><div><span>Supplier Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div><div className="supplier-memory-list">{['Supplier patterns', 'Recurring delays', 'Recurring quality issues', 'Trusted products', 'Negotiation history', 'Preferred suppliers'].map((item) => <span key={item}>{item}</span>)}</div><p>Future connected supplier memory should feed Pricing Engine assumptions and COO procurement planning.</p></section>;
}

function getSupplierState(status) {
  if (['Blocked', 'Quality Issue', 'Not Available', 'Critical'].includes(status)) return 'error';
  if (['Pending Confirmation', 'Delayed', 'Needs Review', 'Needs Confirmation', 'Price Pending', 'Quality Review', 'Supplier Contact Needed', 'Confirmation Pending'].includes(status)) return 'attention';
  if (['Monitoring', 'Draft', 'Quote Requested'].includes(status)) return 'progress';
  return 'online';
}

const buyerDirectorySeed = [];

const buyerEnquirySeed = [];

const buyerQuoteSeed = [
  ['GOPU-QTN-PENDING', 'Black pepper', '2 tons', 'No live amount', '12%', 'CFO Review', 'Founder Approval', 'May 31, 2026'],
  ['GOPU-QTN-PENDING', 'Black pepper', '5 tons', 'No live amount', '10%', 'Draft', 'CFO Review', 'June 2, 2026'],
  ['GOPU-QTN-PENDING', 'Black pepper', '1.5 tons', 'No live amount', '14%', 'Revised', 'Monitoring', 'Expired']
].map(([quoteNumber, product, quantity, price, margin, status, approvalState, expiryDate], index) => ({ id: `buyer-quote-${index}`, quoteNumber, product, quantity, price, margin, status, approvalState, expiryDate }));

const buyerInvoiceSeed = [
  ['GOPU-INV-DRAFT', 'Export Tax Invoice under LUT', 'No live amount', 'Draft', 'Founder Review Required', 'Payment pending only'],
  ['GOPU-PI-DRAFT', 'Proforma Invoice', 'No live amount', 'Draft', 'CFO Review', 'Payment pending only'],
  ['GOPU-CI-DRAFT', 'Commercial Invoice', 'No live amount', 'Validation Failed', 'Revision Required', 'Payment pending only']
].map(([invoiceNumber, invoiceType, value, status, approvalState, paymentStatus], index) => ({ id: `buyer-invoice-${index}`, invoiceNumber, invoiceType, value, status, approvalState, paymentStatus }));

const buyerShipmentSeed = [
  ['UAE-SHP-001', 'Black pepper', '2 tons', 'UAE', 'Planning', 'June 8, 2026', 'Attention'],
  ['OMN-SHP-002', 'Black pepper', '5 tons', 'Oman', 'Documentation', 'June 12, 2026', 'Monitoring'],
  ['VNM-SHP-003', 'Black pepper', '1.5 tons', 'UAE', 'Dispatch Ready', 'June 15, 2026', 'Low']
].map(([shipmentId, product, quantity, destination, status, eta, riskState], index) => ({ id: `buyer-shipment-${index}`, shipmentId, product, quantity, destination, status, eta, riskState }));

const buyerFollowupSeed = [
  ['Gulf Foods LLC', 'Quote follow-up', 'Today 17:00', 'COO Command', 'High', 'Confirm destination port and payment terms', 'Follow-up Due'],
  ['Oman Gulf Wholesale', 'Payment term clarification', 'Tomorrow 11:00', 'CFO Command', 'Medium', 'Clarify advance payment preference', 'Monitoring'],
  ['Southern Organics Pty', 'Origin claim review', 'Today 15:30', 'CMO + Founder', 'Critical', 'Route organic/origin claim to Director Queue', 'Risk Review'],
  ['UAE Spice Distribution', 'Repeat enquiry follow-up', 'This week', 'CMO Command', 'Medium', 'Prepare buyer outreach draft', 'Draft']
].map(([buyer, reason, dueDate, owner, priority, nextAction, status], index) => ({ id: `buyer-followup-${index}`, buyer, reason, dueDate, owner, priority, nextAction, status }));


export default SupplierProcurementDashboard;
