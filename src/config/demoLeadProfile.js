import { buildWorkflowIds } from './workflowIds.js';

export const demoBuyerEmail = 'sukeshgopu@gmail.com';
export const demoLeadId = 'demo-sukesh-turmeric-australia';
export const demoLeadNumber = 'GOPU-DEMO-0001';

export function getDemoLeadProfile() {
  const workflowIds = buildWorkflowIds({ leadNumber: demoLeadNumber, buyer: 'Sukesh Reddy', product: 'Turmeric Powder' });
  return {
    id: demoLeadId,
    lead_number: demoLeadNumber,
    workflow_ids: workflowIds,
    quote_id: workflowIds.quote,
    approval_id: workflowIds.approval,
    export_order_id: workflowIds.exportOrder,
    payment_id: workflowIds.payment,
    shipment_reference: workflowIds.shipment,
    document_set_id: workflowIds.document,
    buyer_name: 'Sukesh Reddy',
    company_name: 'Sukesh Reddy Trading',
    contact_person: 'Sukesh Reddy',
    email: demoBuyerEmail,
    buyer_email: demoBuyerEmail,
    phone: '+61 demo pending',
    country: 'Australia',
    destination_country: 'Australia',
    destination_port: 'Sydney / Melbourne',
    product: 'Turmeric Powder',
    product_grade: 'Export grade turmeric powder',
    hs_code: '0910.30',
    quantity: 20,
    unit: 'MT',
    unit_of_measure: 'MT',
    container_load: '1 x 20 ft FCL',
    container_type: '20 ft dry container',
    shipment_type: 'FCL sea freight',
    shipping_mode: 'Sea freight',
    incoterm: 'CIF',
    payment_terms: '100% advance payment',
    payment_type: 'Advance payment',
    currency: 'USD',
    target_margin: 20,
    min_margin: 12,
    status: 'COO Review Ready',
    source: 'Demo Buyer Profile',
    special_notes: 'Demo buyer profile is used until live buyer data is enabled.'
  };
}

export const demoLeadProfile = getDemoLeadProfile();
