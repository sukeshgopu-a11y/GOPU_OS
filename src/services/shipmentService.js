import { backendStatus, requireSupabaseSession } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';
import { createAuditLog } from './auditService.js';

export const shipmentStages = [
  'Order Confirmed',
  'Documents Preparing',
  'Export Clearance',
  'Goods Dispatched',
  'In Transit',
  'Customs Clearance',
  'Delivered',
  'Issue / Hold'
];

export const shipmentDocumentChecklist = [
  'Proforma Invoice',
  'Commercial Invoice',
  'Packing List',
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'Bill of Lading / Airway Bill',
  'Insurance Certificate'
];

const fallbackBuyers = [];

const fallbackShipments = [];

function response(data, error = null) {
  return { ok: !error, data, error, backend: backendStatus };
}

function toDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return toDateKey(new Date());
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

export function generateShipmentReference(existingShipments = [], date = new Date()) {
  const dateKey = toDateKey(date);
  const matcher = new RegExp(`^GOPU-SHIP-${dateKey}-(\\d{4})$`);
  const highest = existingShipments.reduce((max, shipment) => {
    const reference = shipment.shipment_reference || shipment.shipment_code || shipment.referenceNumber || shipment.reference_number || '';
    const match = String(reference).match(matcher);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `GOPU-SHIP-${dateKey}-${String(highest + 1).padStart(4, '0')}`;
}

export function getShipmentStatus(shipment) {
  if (shipment.current_stage === 'Delivered') return 'completed';
  if (shipment.current_stage === 'Issue / Hold') return 'urgent';
  const eta = shipment.eta ? new Date(shipment.eta) : null;
  if (eta && !Number.isNaN(eta.getTime()) && eta < startOfToday() && shipment.current_stage !== 'Delivered') return 'delayed';
  return 'active';
}

export function getNextShipmentAction(shipment) {
  const stage = shipment.current_stage || 'Order Confirmed';
  if (stage === 'Delivered') return 'Close shipment file and archive final delivery documents.';
  if (stage === 'Issue / Hold') return 'Resolve hold reason, alert COO, and pause buyer-facing delivery promises.';
  if (getShipmentStatus(shipment) === 'delayed') return 'Review ETA delay, update buyer draft, and escalate logistics follow-up.';
  const actions = {
    'Order Confirmed': 'Verify buyer, confirm product quantity, and start document preparation.',
    'Documents Preparing': 'Complete invoice, packing list, COO, phytosanitary, and transport document checks.',
    'Export Clearance': 'Confirm CHA filing, port cut-off, and clearance readiness.',
    'Goods Dispatched': 'Capture dispatch proof and handover details before transit update.',
    'In Transit': 'Monitor ETA, carrier update, and destination customs readiness.',
    'Customs Clearance': 'Coordinate buyer broker response and final delivery documents.'
  };
  return actions[stage] || 'Review shipment owner and set the next operating action.';
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeBuyer(row) {
  return {
    id: row.id,
    buyer_name: row.buyer_name || row.buyerName || '',
    company_name: row.company_name || row.company || '',
    country: row.country || '',
    email: row.email || '',
    phone: row.phone || row.whatsapp || '',
    relationship_status: row.relationship_status || row.status || 'Verified',
    risk_level: row.risk_level || row.risk || 'Monitoring',
    product_interests: Array.isArray(row.product_interests) ? row.product_interests : []
  };
}

function normalizeShipment(row, buyers = fallbackBuyers) {
  const payload = row.payload || {};
  const buyer = row.buyer || buyers.find((item) => item.id === row.buyer_id) || null;
  const shipment = {
    id: row.id,
    tenant_id: row.tenant_id || demoTenantId,
    shipment_reference: row.shipment_reference || row.shipment_code || row.reference_number || row.referenceNumber,
    buyer_id: row.buyer_id,
    buyer_company: row.buyer_company || buyer?.company_name || payload.buyer_company || '',
    product_name: row.product_name || row.product || payload.product_name || payload.product || '',
    quantity: row.quantity || payload.quantity || '',
    origin: row.origin || payload.origin || '',
    destination: row.destination || payload.destination || '',
    current_stage: row.current_stage || row.status || 'Order Confirmed',
    etd: row.etd || payload.etd || '',
    eta: row.eta || payload.eta || '',
    logistics_notes: row.logistics_notes || payload.logistics_notes || '',
    approval_status: row.approval_status || payload.approval_status || 'Approved',
    documents: Array.isArray(row.documents) ? row.documents : Array.isArray(payload.documents) ? payload.documents : [],
    buyer: buyer ? normalizeBuyer(buyer) : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  return {
    ...shipment,
    shipment_code: shipment.shipment_reference,
    product: shipment.product_name,
    status: row.status || getShipmentStatus(shipment),
    next_action: getNextShipmentAction(shipment)
  };
}

async function getBuyers(tenantId) {
  const { client, error } = await requireSupabaseSession();
  if (error) return response(fallbackBuyers);

  const { data, error: queryError } = await client
    .from('buyers')
    .select('id,buyer_name,company_name,country,email,phone,product_interests,relationship_status,risk_level')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (queryError) return response(fallbackBuyers, queryError);
  if (!data?.length) return response([]);
  return response(data.map(normalizeBuyer));
}

async function getShipments(tenantId, buyers) {
  const { client, error } = await requireSupabaseSession();
  if (error) return response(fallbackShipments.map((shipment) => normalizeShipment(shipment, buyers)));

  const { data, error: queryError } = await client
    .from('shipments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (queryError) return response(fallbackShipments.map((shipment) => normalizeShipment(shipment, buyers)), queryError);
  if (!data?.length) return response([]);
  return response(data.map((shipment) => normalizeShipment(shipment, buyers)));
}

export async function getShipmentTrackerData(tenantId = demoTenantId) {
  const buyersResult = await getBuyers(tenantId);
  const buyers = buyersResult.data || fallbackBuyers;
  const shipmentsResult = await getShipments(tenantId, buyers);
  return response({
    buyers,
    shipments: shipmentsResult.data || [],
    dataMode: shipmentsResult.error || buyersResult.error || backendStatus.mode !== 'Connected' ? 'Integration Pending - sample fallback' : 'Live Supabase'
  }, shipmentsResult.error || buyersResult.error || null);
}

export async function createShipment(tenantId = demoTenantId, payload, existingShipments = [], verifiedBuyers = []) {
  const buyer = verifiedBuyers.find((item) => item.id === payload.buyer_id);
  if (!buyer?.company_name) {
    return response(null, new Error('Company not verified. Add buyer first.'));
  }

  const shipment_reference = generateShipmentReference(existingShipments);
  const current_stage = payload.current_stage || 'Order Confirmed';
  const base = {
    tenant_id: tenantId,
    shipment_reference,
    shipment_code: shipment_reference,
    buyer_company: buyer.company_name,
    buyer_id: buyer.id,
    product: payload.product_name || payload.product,
    product_name: payload.product_name || payload.product,
    quantity: payload.quantity,
    origin: payload.origin,
    destination: payload.destination,
    current_stage,
    etd: payload.etd || null,
    eta: payload.eta || null,
    logistics_notes: payload.logistics_notes || '',
    next_action: getNextShipmentAction({ ...payload, current_stage }),
    status: getShipmentStatus({ ...payload, current_stage }),
    payload: {
      shipment_reference,
      buyer_company: buyer.company_name,
      product: payload.product_name || payload.product,
      product_name: payload.product_name || payload.product,
      origin: payload.origin,
      destination: payload.destination,
      etd: payload.etd || null,
      eta: payload.eta || null,
      logistics_notes: payload.logistics_notes || '',
      documents: payload.documents || []
    }
  };

  const { client, error } = await requireSupabaseSession();
  if (error || !isUuid(buyer.id)) {
    const localShipment = normalizeShipment({ ...base, id: `shipment-local-${Date.now()}`, buyer }, verifiedBuyers);
    await createAuditLog({
      tenant_id: tenantId,
      action_type: 'Shipment created',
      module: 'Shipment Tracker',
      related_table: 'shipments',
      related_record_id: localShipment.id,
      actor: 'COO Command',
      description: `Shipment ${localShipment.shipment_reference} created for ${localShipment.buyer_company}.`,
      new_value: localShipment,
      risk_level: localShipment.status === 'urgent' ? 'High' : 'Low'
    });
    return response(localShipment);
  }

  const { data, error: insertError } = await client.from('shipments').insert(base).select('*').single();
  if (insertError) return response(null, insertError);
  const shipment = normalizeShipment({ ...data, buyer }, verifiedBuyers);
  await createAuditLog({
    tenant_id: tenantId,
    action_type: 'Shipment created',
    module: 'Shipment Tracker',
    related_table: 'shipments',
    related_record_id: shipment.id,
    actor: 'COO Command',
    description: `Shipment ${shipment.shipment_reference} created for ${shipment.buyer_company}.`,
    new_value: shipment,
    risk_level: shipment.status === 'urgent' ? 'High' : 'Low'
  });
  return response(shipment);
}

export async function updateShipment(tenantId = demoTenantId, shipmentId, changes = {}, buyers = []) {
  if (!shipmentId) return response(null, new Error('Shipment ID is required.'));

  const nextStage = changes.current_stage;
  const statusSource = { ...changes, current_stage: nextStage || changes.current_stage };
  const updatePayload = {
    ...changes,
    status: changes.status || (nextStage ? getShipmentStatus(statusSource) : undefined),
    next_action: nextStage ? getNextShipmentAction(statusSource) : changes.next_action,
    updated_at: new Date().toISOString()
  };

  if (changes.product_name && !changes.product) updatePayload.product = changes.product_name;
  if (changes.product && !changes.product_name) updatePayload.product_name = changes.product;

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key];
  });

  const { client, error } = await requireSupabaseSession();
  if (error || !isUuid(shipmentId)) {
    return response(normalizeShipment({ id: shipmentId, tenant_id: tenantId, ...updatePayload }, buyers));
  }

  const { data, error: updateError } = await client
    .from('shipments')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', shipmentId)
    .select('*')
    .single();

  if (updateError) return response(null, updateError);
  return response(normalizeShipment(data, buyers));
}

export async function verifyShipmentCompany(tenantId = demoTenantId, buyerId, buyers = []) {
  const cached = buyers.find((buyer) => buyer.id === buyerId);
  if (cached?.company_name) return response(cached);

  const { client, error } = await requireSupabaseSession();
  if (error) return response(null, new Error('Company not verified. Add buyer first.'));

  const { data, error: queryError } = await client
    .from('buyers')
    .select('id,buyer_name,company_name,country,email,phone,product_interests,relationship_status,risk_level')
    .eq('tenant_id', tenantId)
    .eq('id', buyerId)
    .maybeSingle();

  if (queryError || !data) return response(null, queryError || new Error('Company not verified. Add buyer first.'));
  return response(normalizeBuyer(data));
}
