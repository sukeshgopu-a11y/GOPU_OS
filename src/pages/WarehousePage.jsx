import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Boxes,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardList,
  Command,
  Gauge,
  PackageCheck,
  Route,
  ShieldCheck,
  TrendingUp,
  TriangleAlert
} from 'lucide-react';
import { ExportOSShell } from '../shared/routeShell.jsx';
import { SeverityBadge, StatusBadge } from '../shared/uiPrimitives.jsx';
const warehouseInventorySeed = [];

const stockMovementSeed = [
  ['Inward Stock', 'Black pepper', 'BP2401', '1,200 KG', 'Warehouse Manager', 'Pending shipment allocation', 'Today 08:50', 'Monitoring'],
  ['Dispatch Allocation', 'Black pepper', 'TF2408', '600 KG', 'COO Command', 'UAE-SHP-001', 'Today 09:30', 'Reserved'],
  ['Quality Hold', 'Cumin Seeds', 'CS2404', '300 KG', 'Quality Control', 'Shipment blocked', 'Today 10:00', 'Blocked'],
  ['Packing Material Issue', 'Export Bags', 'BAG-EXP-01', '500 pcs demand', 'Warehouse Staff', 'UAE-SHP-001', 'Today 10:20', 'Attention'],
  ['Warehouse Transfer', 'Black pepper', 'CP2402', '240 KG', 'Operations', 'Packing zone transfer', 'Yesterday 15:10', 'Dispatch Ready']
].map(([type, product, batch, quantity, owner, linkedShipment, timestamp, status], index) => ({ id: `movement-${index}`, type, product, batch, quantity, owner, linkedShipment, timestamp, status }));

const shipmentAllocationSeed = [
  ['UAE-SHP-001', 'Black pepper / BP2401', '400 KG', '800 KG', 'Packing in progress', 'Invoice draft linked', 'Attention'],
  ['OMN-SHP-002', 'Black pepper / TF2408', '600 KG', '250 KG', 'Dispatch dependency: bags', 'Pricing approved / invoice pending', 'Review Required'],
  ['VNM-SHP-003', 'Black pepper / CP2402', '240 KG', '400 KG', 'Ready', 'Document Factory linked', 'Dispatch Ready']
].map(([shipment, allocatedStock, allocated, remaining, packingReadiness, invoiceLinkage, status], index) => ({ id: `allocation-${index}`, shipment, allocatedStock, allocated, remaining, packingReadiness, invoiceLinkage, status }));

const batchTrackingSeed = [];

const qualityHoldSeed = [
  ['Damaged stock', 'Medium', 'Outer bag damage found in receiving bay.', 'Review Required'],
  ['Quality review', 'High', 'Cumin Seeds batch CS2404 on quality hold before allocation.', 'Blocked'],
  ['Packaging issue', 'Medium', 'Export bags below reorder threshold for UAE shipment cycle.', 'Attention'],
  ['Batch mismatch', 'Low', 'Label check needed before packing list is finalized.', 'Monitoring']
].map(([issueType, severity, description, status], index) => ({ id: `quality-${index}`, issueType, severity, description, status }));

const packingMaterialSeed = [
  ['Export bags', '850 pcs', '1,000 pcs', '1,200 pcs for UAE cycle', 'Low Stock'],
  ['Cartons', '1,900 pcs', '700 pcs', '400 pcs for retail packs', 'Healthy'],
  ['Labels', '4,200 pcs', '1,500 pcs', '800 pcs for current dispatch', 'Healthy'],
  ['Pallets', '26 pcs', '20 pcs', '18 pcs booked', 'Monitoring'],
  ['Wrapping material', '12 rolls', '20 rolls', '8 rolls for dispatch queue', 'Attention']
].map(([material, quantity, reorderThreshold, demand, status], index) => ({ id: `material-${index}`, material, quantity, reorderThreshold, demand, status }));

const warehouseTimelineSeed = [
  ['Warehouse Manager', '08:40', 'stock inward recorded for BP2401', 'Monitoring'],
  ['COO Command', '09:15', 'shipment allocation prepared for UAE-SHP-001', 'Reserved'],
  ['Quality Control', '10:00', 'quality hold created for CS2404', 'Blocked'],
  ['Warehouse Staff', '10:20', 'packing material shortage flagged', 'Attention'],
  ['COO Command', '10:45', 'shortage escalation draft prepared', 'Review Required']
];

const inventoryForecastSeed = [];

function WarehouseDashboard({ navigate, onBack, view = 'warehouse', inventoryId }) {
  const [inventory, setInventory] = useState(warehouseInventorySeed);
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(inventoryId || null);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [dispatchPlan, setDispatchPlan] = useState('');
  const [timeline, setTimeline] = useState(warehouseTimelineSeed);
  const [actionNotice, setActionNotice] = useState('');
  const selectedItem = inventory.find((item) => item.id === selectedId) || null;
  const filteredInventory = filter === 'All' ? inventory : inventory.filter((item) => item.status === filter || item.product === filter);
  const lowStockCount = inventory.filter((item) => item.status === 'Low Stock').length + packingMaterialSeed.filter((item) => item.status === 'Low Stock').length;
  const currentDateTime = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

  function openInventory(itemOrId) {
    const id = typeof itemOrId === 'object' ? itemOrId?.id : itemOrId;
    if (!id) return;
    setSelectedId(id);
    navigate(`/export-os/warehouse/${id}`);
  }

  function reserveBatch(batch) {
    setInventory((current) => current.map((item) => item.batch === batch ? { ...item, status: 'Reserved', reserved: Math.max(item.reserved, Math.min(item.available, 250)) } : item));
    setActionNotice(`Batch ${batch} reserved in Connect Supabase to activate. No shipment dispatch was confirmed.`);
    setTimeline((current) => [['COO Command', 'Now', `batch ${batch} reservation prepared`, 'Reserved'], ...current]);
  }

  function allocateStock(id) {
    if (!id) {
      setActionNotice('Select an inventory item before allocating stock.');
      return;
    }
    setInventory((current) => current.map((item) => item.id === id ? { ...item, status: 'Reserved', reserved: Math.max(item.reserved, 250) } : item));
    const item = inventory.find((row) => row.id === id) || selectedItem;
    if (!item) return;
    setActionNotice(`${item.product} allocation prepared for COO review. Final dispatch remains blocked until linked shipment checks pass.`);
    setTimeline((current) => [['Warehouse Engine', 'Now', `${item.batch} stock allocation prepared`, 'Review Required'], ...current]);
  }

  function generateDispatchPlan() {
    setDispatchPlan('1. Prioritize UAE-SHP-001 packing bags reorder.\n2. Keep CS2404 blocked until quality review closes.\n3. Allocate BP2401 only after packing confirmation.\n4. Prepare COO follow-up for export bags and carton readiness.\n5. Escalate shortage if bags are not confirmed by evening.');
    setActionNotice('COO dispatch plan generated in Connect Supabase to activate.');
    setTimeline((current) => [['COO Command', 'Now', 'dispatch plan generated for warehouse review', 'Monitoring'], ...current]);
  }

  function createProcurementFollowup() {
    setActionNotice('Procurement follow-up task prepared in Connect Supabase to activate for export bags and wrapping material.');
    setTimeline((current) => [['Task Engine', 'Now', 'procurement follow-up task prepared', 'Review Required'], ...current]);
  }

  function escalateInventoryRisk() {
    setActionNotice('Inventory risk escalation prepared for Founder/COO review. No release action was executed.');
    setTimeline((current) => [['COO Command', 'Now', 'inventory shortage escalation prepared', 'Attention'], ...current]);
  }

  return (
    <ExportOSShell className="warehouse-shell">
      <header className="deck-header warehouse-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <h1>{view === 'inventory' ? 'Inventory Intelligence' : view === 'stock-movement' ? 'Stock Movement' : view === 'detail' ? 'Warehouse Batch Detail' : 'Warehouse & Inventory Intelligence'}</h1>
          <p>Stock Operations Layer for inventory visibility, batch tracking, dispatch readiness, stock movement, packing materials, shipment allocation, and warehouse risk.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <div className="coo-status"><PackageCheck size={16} /><strong>Stock Value: ₹18.4L Local</strong></div>
          <StatusBadge label={`${lowStockCount} low stock`} state="attention" />
          <StatusBadge label={`${shipmentAllocationSeed.length} dispatch pending`} state="progress" />
          <span className="deck-time-chip">{currentDateTime}</span>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>

      {actionNotice && <div className="warehouse-action-notice"><CheckCircle2 size={16} /><span>{actionNotice}</span></div>}

      <main className="warehouse-layout">
        <section className="warehouse-left-stack">
          <WarehouseSummaryCards inventory={inventory} />
          <ShipmentAllocationPanel allocations={shipmentAllocationSeed} navigate={navigate} onAllocate={() => allocateStock(selectedItem?.id)} />
          <PackingMaterialControl materials={packingMaterialSeed} />
        </section>
        <section className="warehouse-center-stack">
          <InventoryGrid inventory={filteredInventory} selectedId={selectedItem?.id} filter={filter} onFilter={setFilter} onOpen={openInventory} />
          <StockMovementPanel movements={stockMovementSeed} />
          <BatchTrackingPanel batches={batchTrackingSeed} expanded={expandedBatch} onExpand={setExpandedBatch} onReserve={reserveBatch} />
          <WarehouseTimeline events={timeline} />
        </section>
        <aside className="warehouse-right-stack">
          <InventoryDetailPanel item={selectedItem} />
          <QualityHoldPanel holds={qualityHoldSeed} />
          <COOInventoryControl onGenerate={generateDispatchPlan} onProcurement={createProcurementFollowup} onEscalate={escalateInventoryRisk} dispatchPlan={dispatchPlan} />
          <InventoryForecastPanel forecasts={inventoryForecastSeed} />
          <InventoryMemoryPanel />
        </aside>
      </main>
    </ExportOSShell>
  );
}

function WarehouseSummaryCards({ inventory }) {
  const totalStock = inventory.reduce((sum, item) => sum + item.available, 0);
  const reserved = inventory.reduce((sum, item) => sum + item.reserved, 0);
  const metrics = [
    ['Total Active Stock', `${totalStock.toLocaleString('en-IN')} KG`, 'Healthy'],
    ['Reserved Stock', `${reserved.toLocaleString('en-IN')} KG`, 'Monitoring'],
    ['Dispatch Ready', inventory.filter((item) => item.status === 'Dispatch Ready').length, 'Dispatch Ready'],
    ['Low Stock Items', inventory.filter((item) => item.status === 'Low Stock').length, 'Low Stock'],
    ['Blocked Inventory', inventory.filter((item) => item.status === 'Quality Hold' || item.status === 'Blocked').length, 'Blocked'],
    ['Packing Material Status', '2 attention', 'Attention'],
    ['Shipment Allocation Pending', shipmentAllocationSeed.length, 'Review Required'],
    ['Batch Review Alerts', batchTrackingSeed.filter((batch) => batch.reviewStatus.includes('Review') || batch.reviewStatus.includes('Hold')).length, 'Review Required']
  ];
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Warehouse Summary</span><h2>Stock health</h2></div><Gauge size={18} /></div><div className="warehouse-summary-grid">{metrics.map(([label, value, status]) => <article key={label}><span>{label}</span><strong>{value}</strong><StatusBadge label={status} state={getWarehouseState(status)} /></article>)}</div></section>;
}

function InventoryGrid({ inventory, selectedId, filter, onFilter, onOpen }) {
  const filters = ['All', 'Healthy', 'Reserved', 'Low Stock', 'Quality Hold', 'Dispatch Ready', 'Review Required'];
  return (
    <section className="warehouse-panel">
      <div className="approval-section-header"><div><span>Inventory Grid</span><h2>Stock rows</h2></div><Boxes size={18} /></div>
      <div className="warehouse-filter-row">{filters.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => onFilter(item)}>{item}</button>)}</div>
      <div className="inventory-grid-list">
        {inventory.map((item) => (
          <button key={item.id} className={selectedId === item.id ? 'selected' : ''} onClick={() => onOpen(item)}>
            <strong>{item.product}</strong>
            <span>{item.grade} / {item.batch}</span>
            <span>{item.available} {item.unit} available / {item.reserved} {item.unit} reserved</span>
            <span>{item.location}</span>
            <StatusBadge label={item.status} state={getWarehouseState(item.status)} />
            <small>{item.lastUpdated}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function InventoryDetailPanel({ item }) {
  if (!item) return <div className="empty-state"><p>Select an item from the list to view details.</p></div>;
  return (
    <section className="warehouse-panel">
      <div className="approval-section-header"><div><span>Inventory Detail</span><h2>{item.batch}</h2></div><PackageCheck size={18} /></div>
      <div className="warehouse-detail-grid">
        {[
          ['Product', item.product],
          ['Grade', item.grade],
          ['Available', `${item.available} ${item.unit}`],
          ['Reserved', `${item.reserved} ${item.unit}`],
          ['Location', item.location],
          ['Status', item.status],
          ['Last Updated', item.lastUpdated]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </section>
  );
}

function StockMovementPanel({ movements }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Stock Movements</span><h2>Inward / outward trace</h2></div><Route size={18} /></div><div className="stock-movement-list">{movements.map((movement) => <article key={movement.id}><div><strong>{movement.type}</strong><StatusBadge label={movement.status} state={getWarehouseState(movement.status)} /></div><span>{movement.product} / {movement.batch} / {movement.quantity}</span><small>{movement.owner} / {movement.linkedShipment} / {movement.timestamp}</small></article>)}</div></section>;
}

function ShipmentAllocationPanel({ allocations, navigate, onAllocate }) {
  return (
    <section className="warehouse-panel">
      <div className="approval-section-header"><div><span>Shipment Allocation</span><h2>Dispatch stock linkage</h2></div><Route size={18} /></div>
      <div className="shipment-allocation-list">{allocations.map((allocation) => <article key={allocation.id}><div><strong>{allocation.shipment}</strong><StatusBadge label={allocation.status} state={getWarehouseState(allocation.status)} /></div><span>{allocation.allocatedStock} / allocated {allocation.allocated} / remaining {allocation.remaining}</span><small>{allocation.packingReadiness} / {allocation.invoiceLinkage}</small></article>)}</div>
      <div className="warehouse-action-row"><button onClick={onAllocate}>Allocate Stock</button><button onClick={onAllocate}>Reserve Batch</button><button onClick={onAllocate}>Escalate Shortage</button><button onClick={() => navigate('/export-os/workflows')}>Open Shipment Workflow</button></div>
    </section>
  );
}

function BatchTrackingPanel({ batches, expanded, onExpand, onReserve }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Batch Tracking</span><h2>Batch risk and age</h2></div><ClipboardList size={18} /></div><div className="batch-tracking-list">{batches.map((batch) => <button key={batch?.id} className={expanded === batch?.id ? 'expanded' : ''} onClick={() => onExpand(batch?.id)}><div><strong>{batch?.batch}</strong><StatusBadge label={batch?.reviewStatus} state={getWarehouseState(batch?.reviewStatus)} /></div><span>{batch?.supplier} / {batch?.inwardDate} / {batch?.location}</span>{expanded === batch?.id && <small>Quality: {batch?.qualityStatus} / Reserved: {batch?.reservedShipments} / Age: {batch?.stockAge}</small>}<em onClick={(event) => { event.stopPropagation(); onReserve(batch?.batch); }}>Reserve Batch</em></button>)}</div></section>;
}

function QualityHoldPanel({ holds }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Quality & Hold Panel</span><h2>Inventory risk</h2></div><TriangleAlert size={18} /></div><div className="quality-hold-list">{holds.map((hold) => <article key={hold.id}><div><strong>{hold.issueType}</strong><SeverityBadge severity={hold.severity} /></div><p>{hold.description}</p><StatusBadge label={hold.status} state={getWarehouseState(hold.status)} /></article>)}</div></section>;
}

function PackingMaterialControl({ materials }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Packing Material Control</span><h2>Export supplies</h2></div><PackageCheck size={18} /></div><div className="packing-material-list">{materials.map((material) => <article key={material.id}><div><strong>{material.material}</strong><StatusBadge label={material.status} state={getWarehouseState(material.status)} /></div><span>Stock: {material.quantity} / Threshold: {material.reorderThreshold}</span><small>{material.demand}</small></article>)}</div></section>;
}

function COOInventoryControl({ onGenerate, onProcurement, onEscalate, dispatchPlan }) {
  return (
    <section className="warehouse-panel">
      <div className="approval-section-header"><div><span>COO Inventory Control</span><h2>Operational bottlenecks</h2></div><Command size={18} /></div>
      <div className="warehouse-memory-list">{['Blocked dispatches: 1', 'Stock shortages: 2', 'Pending allocations: 3', 'Quality issues: 2', 'Operational bottleneck: export bags'].map((item) => <span key={item}>{item}</span>)}</div>
      <div className="warehouse-action-row"><button onClick={onGenerate}>Generate Dispatch Plan</button><button onClick={onProcurement}>Create Procurement Follow-up</button><button onClick={onEscalate}>Escalate Inventory Risk</button></div>
      {dispatchPlan && <pre className="warehouse-plan-output">{dispatchPlan}</pre>}
    </section>
  );
}

function InventoryMemoryPanel() {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Inventory Intelligence Memory</span><h2>Memory</h2></div><BrainCircuit size={18} /></div><div className="warehouse-memory-list">{['Recurring stock shortages', 'Supplier quality issues', 'Warehouse bottlenecks', 'Dispatch delays', 'Damaged stock trends', 'Allocation conflicts'].map((item) => <span key={item}>{item}</span>)}</div><p>Future connected inventory memory should use approved stock movement history and shipment allocations.</p></section>;
}

function WarehouseTimeline({ events }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Warehouse Timeline</span><h2>Operational trace</h2></div><Activity size={18} /></div><div className="warehouse-timeline">{events.map(([actor, time, event, status]) => <article key={`${time}-${event}`}><time>{time}</time><div><strong>{event}</strong><span>{actor} / {status}</span></div></article>)}</div></section>;
}

function InventoryForecastPanel({ forecasts }) {
  return <section className="warehouse-panel"><div className="approval-section-header"><div><span>Inventory Forecast</span><h2>Projected shortages</h2></div><TrendingUp size={18} /></div><div className="inventory-forecast-list">{forecasts.map((forecast) => <article key={forecast.id}><div><strong>{forecast.product}</strong><SeverityBadge severity={forecast.severity} /></div><span>{forecast.forecastType} / {forecast.expectedDate}</span><p>{forecast.projectedIssue}</p></article>)}</div></section>;
}

function getWarehouseState(status) {
  if (['Blocked', 'Quality Hold', 'Critical'].includes(status)) return 'error';
  if (['Attention', 'Low Stock', 'Review Required', 'Delayed'].includes(status)) return 'attention';
  if (['Monitoring', 'Reserved', 'Planning', 'Packing', 'Documentation', 'In Progress'].includes(status)) return 'progress';
  return 'online';
}


export default WarehouseDashboard;
