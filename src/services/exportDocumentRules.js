function text(value) {
  return String(value || '').trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function includesAny(value, needles = []) {
  const normalized = lower(value);
  return needles.some((needle) => normalized.includes(needle));
}

function destinationCountry(lead = {}) {
  return text(lead.destination_country || lead.country || lead.destination || '');
}

function leadProduct(lead = {}) {
  return text(lead.product || lead.product_name || '');
}

function isCifShipment(lead = {}, pricing = {}) {
  return lower(lead.incoterm || pricing.incoterm).includes('cif');
}

function doc(id, fields) {
  return {
    id,
    requirement: 'Required',
    status: 'Not started',
    owner: 'COO Command',
    due: 'Before shipment booking',
    gate: 'Document generation approval',
    ...fields
  };
}

export function getRequiredDocumentsForLead(lead = {}, pricing = {}) {
  const product = leadProduct(lead);
  const country = destinationCountry(lead);
  const productLower = lower(product);
  const isSpice = includesAny(product, ['turmeric', 'chilli', 'chili', 'pepper', 'cardamom', 'cumin', 'coriander', 'spice']);
  const isFood = isSpice || includesAny(product, ['rice', 'agri', 'agricultural', 'food']);
  const isAustralia = lower(country).includes('australia');
  const documents = [
    doc('proforma-invoice', {
      name: 'Proforma Invoice',
      type: 'Invoice',
      owner: 'CFO + COO',
      status: 'Draft ready',
      due: 'Before buyer payment request',
      gate: 'Proforma send approval',
      why: 'Starts the commercial offer and advance payment request.',
      preview: [
        ['Buyer', lead.buyer_name || lead.company_name || 'Buyer'],
        ['Product', product || 'Export product'],
        ['Quantity', `${lead.quantity || ''} ${lead.unit || lead.unit_of_measure || ''}`.trim()],
        ['Incoterm', lead.incoterm || pricing.incoterm || 'FOB'],
        ['Payment', lead.payment_terms || lead.payment_type || 'To be confirmed']
      ]
    }),
    doc('commercial-invoice', {
      name: 'Commercial Invoice',
      type: 'Invoice',
      owner: 'CFO',
      status: 'Blocked until payment confirmation',
      due: 'After payment confirmation',
      gate: 'Payment confirmation approval',
      why: 'Final invoice for customs and accounting after buyer payment is confirmed.'
    }),
    doc('packing-list', {
      name: 'Packing List',
      type: 'Shipping document',
      owner: 'COO + Warehouse',
      status: 'Data required',
      due: 'Before container handover',
      why: 'Confirms package count, net weight, gross weight, lot details, and marks.'
    }),
    doc('shipping-bill', {
      name: 'Shipping Bill',
      type: 'Customs document',
      owner: 'CHA + COO',
      status: 'Pending CHA filing',
      due: 'Before export customs clearance',
      why: 'Mandatory India export customs filing.'
    }),
    doc('bill-of-lading', {
      name: 'Bill of Lading',
      type: 'Carrier document',
      owner: 'Forwarder + COO',
      status: 'Generated after vessel loading',
      due: 'After container loading',
      why: 'Carrier transport document and shipment proof.'
    }),
    doc('certificate-of-origin', {
      name: 'Certificate of Origin',
      type: 'Origin certificate',
      owner: 'COO + Chamber/authorized agency',
      status: 'Required',
      due: 'Before document package release',
      why: 'Confirms Indian origin for buyer customs clearance.'
    })
  ];

  if (isSpice) {
    documents.push(
      doc('spice-board-registration-check', {
        name: 'Spice Board CRES/RCMC Check',
        type: 'Compliance check',
        owner: 'Compliance + COO',
        status: 'Verify before export',
        due: 'Before proforma release',
        why: `${product || 'This spice product'} needs exporter registration and spice export compliance validation.`
      }),
      doc('certificate-of-analysis', {
        name: 'Certificate of Analysis',
        type: 'Quality certificate',
        owner: 'Quality + COO',
        status: 'Lab test required',
        due: 'Before shipment booking',
        why: 'Buyer and destination authorities may need quality, purity, and contaminant test results.'
      })
    );
  }

  if (isFood || isAustralia) {
    documents.push(
      doc('phytosanitary-certificate', {
        name: 'Phytosanitary Certificate',
        type: 'Plant health certificate',
        owner: 'COO + Plant Quarantine authority',
        status: 'Likely required',
        due: 'Before container gate-in',
        why: `${country || 'Destination'} food/agri imports can require plant health certification.`
      }),
      doc('fumigation-certificate', {
        name: 'Fumigation Certificate',
        type: 'Treatment certificate',
        owner: 'COO + approved fumigator',
        status: 'Verify packaging requirement',
        due: 'Before container stuffing',
        why: 'Required when wooden packing or destination biosecurity treatment rules apply.'
      })
    );
  }

  if (isAustralia) {
    documents.push(
      doc('australia-biosecurity-check', {
        name: 'Australia Biosecurity Import Check',
        type: 'Destination compliance',
        owner: 'Compliance + COO',
        status: 'Mandatory review',
        due: 'Before final document release',
        why: 'Australia has strict food and agricultural import biosecurity controls.'
      })
    );
  }

  if (isCifShipment(lead, pricing)) {
    documents.push(
      doc('insurance-certificate', {
        name: 'Insurance Certificate',
        type: 'Commercial document',
        owner: 'CFO + COO',
        status: 'Required for CIF',
        due: 'Before document package release',
        why: 'CIF shipment requires insurance evidence for the buyer.'
      })
    );
  }

  if (productLower.includes('turmeric')) {
    documents.push(
      doc('curcumin-and-microbial-test', {
        name: 'Curcumin and Microbial Test Report',
        type: 'Quality certificate',
        owner: 'Quality + COO',
        status: 'Lab test required',
        due: 'Before final booking',
        why: 'Turmeric buyers commonly request curcumin, moisture, ash, and microbial parameters.'
      })
    );
  }

  return documents.map((item, index) => ({ ...item, step: index + 1 }));
}

export function getApprovalGatesForLead(lead = {}, pricing = {}, documents = []) {
  const leadNumber = lead.lead_number || lead.id || 'Lead';
  const amount = pricing.recommendedTotalPrice ? `${pricing.currency || lead.currency || 'USD'} ${pricing.recommendedTotalPrice}` : 'Quote pending';
  return [
    {
      key: 'final-rate-approval',
      requestType: 'COO Final Rate Approval',
      title: `Approve final rate for ${leadNumber}`,
      riskLevel: 'High',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Buyer quote email', 'Proforma invoice release'],
      ifApproved: 'CFO quote is locked and COO can request buyer email approval.',
      summary: `Approve final commercial rate ${amount} for ${lead.buyer_name || 'buyer'} before any buyer-facing email is sent.`
    },
    {
      key: 'proforma-send-approval',
      requestType: 'Proforma Invoice Send Approval',
      title: `Approve proforma invoice email for ${leadNumber}`,
      riskLevel: 'High',
      priority: 'High',
      releaseAction: 'buyer_quote_proforma_release',
      blockedItems: ['Buyer email', 'Advance payment request', 'Stage 2 handoff'],
      ifApproved: 'GOPU OS sends the approved buyer email and creates the proforma invoice record.',
      summary: `Send proforma invoice and advance payment request to ${lead.email || lead.buyer_email || 'buyer email'}.`
    },
    {
      key: 'payment-confirmation',
      requestType: 'Buyer Payment Confirmation Approval',
      title: `Confirm advance payment for ${leadNumber}`,
      riskLevel: 'High',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Commercial invoice', 'Document generation', 'Container booking'],
      ifApproved: 'CFO marks payment received and COO can generate final shipping documents.',
      summary: 'Confirm buyer advance payment before generating final documents and booking shipment.'
    },
    {
      key: 'document-generation-approval',
      requestType: 'Export Document Generation Approval',
      title: `Approve document generation for ${leadNumber}`,
      riskLevel: 'Medium',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Commercial invoice', 'Packing list', 'Certificate requests'],
      ifApproved: 'COO document workflow opens for invoice, packing list, certificates, and CHA handoff.',
      summary: `Generate ${documents.length} export documents and certificate checks for this shipment.`
    },
    {
      key: 'certificate-review-approval',
      requestType: 'Certificate Requirement Approval',
      title: `Approve certificate requirements for ${leadNumber}`,
      riskLevel: 'Medium',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Destination compliance release', 'Container booking'],
      ifApproved: 'Required certificates are confirmed for product, destination, and shipment terms.',
      summary: 'Confirm product-specific certifications before shipment booking and document package release.'
    },
    {
      key: 'document-package-send-approval',
      requestType: 'Buyer Document Package Send Approval',
      title: `Approve document package release for ${leadNumber}`,
      riskLevel: 'High',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Buyer document email', 'Forwarder/CHA release'],
      ifApproved: 'COO can send the reviewed document package to buyer and operations partners.',
      summary: 'Approve final document package after invoice, packing list, origin, quality, and compliance checks.'
    },
    {
      key: 'container-booking-approval',
      requestType: 'Container Booking Approval',
      title: `Approve 20 ft container booking for ${leadNumber}`,
      riskLevel: 'Medium',
      priority: 'High',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Forwarder booking', 'Stuffing date', 'Vessel plan'],
      ifApproved: 'COO books the container, locks stuffing date, and updates shipment timeline.',
      summary: `Approve booking for ${lead.container_load || 'container load'} to ${destinationCountry(lead) || 'destination'}.`
    },
    {
      key: 'shipment-dispatch-approval',
      requestType: 'Shipment Dispatch Approval',
      title: `Approve shipment dispatch update for ${leadNumber}`,
      riskLevel: 'Medium',
      priority: 'Medium',
      releaseAction: 'workflow_gate_only',
      blockedItems: ['Buyer dispatch update', 'Tracking release'],
      ifApproved: 'COO sends dispatch and tracking status after container handover.',
      summary: 'Approve final dispatch update once container gate-in and carrier details are confirmed.'
    }
  ];
}
