# GOPU OS COO Lead-to-Shipment Flow

Status: Product and implementation specification
Owner: COO Command, Director Command, CFO Command, Document Factory
Present email mode: buyer-facing quote and proforma emails route to `admin@gopuexports.com` until live buyer release is approved.

## 1. Purpose

When a lead enters GOPU OS from the website, Slack, WhatsApp, or manual entry, the system must show the complete export execution flow from enquiry to shipment and payment realization.

The COO must be able to click a lead number and immediately see:

- Buyer/client details.
- Product, quantity, container/load assumption, price, Incoterm, destination, delivery target.
- Required documents and certificates based on product and destination.
- Proforma invoice status and structure.
- Payment status, paid amount, balance, due date, and follow-up date.
- Shipment planning steps including supplier readiness, booking date, container booking, CHA/customs, and delivery ETA.
- A document list where each document can be generated/uploaded/reviewed and viewed.
- Director-facing summary with the same commercial, payment, document, and delivery risks.

This document uses red raw chilli, 20 metric tons, 1 container load, USD 49,000 as the example lead.

## 2. External Compliance Baseline

The system should not hard-code every country rule as final law, but it must start from these baseline rules and mark country-specific requirements as "verify required".

Sources checked:

- DGFT Foreign Trade Policy Chapter 2 says the mandatory export documents for goods from India include transport document, commercial invoice cum packing list, and shipping bill/bill of export. It also states product-specific compliance may require additional documents from regulatory authorities. Source: https://content.dgft.gov.in/Website/dgftprod/c5ccbcbf-d61e-4279-abe7-ce2c6c99d62d/FTP%20Chapter%202%20updated%20as%20on%2031032021.pdf
- APEDA export documentation flow includes proforma generation after enquiry, order placement, goods readiness, invoice/packing list, C&F/customs, bill of lading/airway bill, bank document negotiation, and bank certificate after receipt of payment. Source: https://apeda.gov.in/Export-Documentation
- India PQMS allows exporters to apply online for phytosanitary certificates for plant/plant-product exports. Source: https://pqms.cgg.gov.in/pqms-angular/home
- Spices Board chilli/chilli product consignments are subject to mandatory sampling/testing for Sudan dye and aflatoxin, with certificate submission before customs clearance. Source: https://indianspices.com/hin/trade/trade-notifications/mandatory-sampling-and-testing-chillichilli-products-consignments-exports.html
- Spices Board CRES/RCMC is relevant for spice exporters. Source: https://www.indianspices.com/trade/trade-notifications/simplification-procedure-cres-issued-spices-board-treated-rcmc-also.html

## 3. End-to-End Flow

### Stage 1: Lead intake

Input sources:

- Website lead form.
- Slack message.
- WhatsApp message.
- Manual COO/Director entry.

Minimum fields:

- Lead number.
- Buyer name.
- Company name.
- Phone.
- Email.
- Country and destination port.
- Product.
- Grade/specification.
- Quantity and unit.
- Shipment mode.
- Incoterm.
- Payment terms.
- Required delivery date.
- Notes and buyer-specific document requests.

System action:

- Create or update `lead_intake`.
- Create AI/agent tasks for COO, CFO, CMO/Sales, Compliance, Logistics, and Director.
- CFO generates price.
- COO generates product/document/shipment readiness checklist.
- Director approval is created before any buyer-facing quote/proforma release.

### Stage 2: CFO price and COO readiness

For the example lead:

- Lead number: `GOPU-LD-0001`
- Buyer: example buyer
- Product: Raw red chilli
- Quantity: 20 MT
- Load: 1 x FCL container, verify 20 ft/40 ft based on packing and gross weight
- Quote: USD 49,000
- Price per MT: USD 2,450
- Incoterm: FOB/CIF as selected
- Delivery target: buyer requested date or system ETA
- Delivery estimate: derived from destination profile and shipping mode

COO must show:

- Supplier readiness.
- Stock availability.
- Packing type.
- Container type.
- Quality/testing requirements.
- Required documents.
- Booking window.
- Operational blockers.

### Stage 3: Director approval

Director sees:

- Lead summary.
- Buyer/client details.
- Product, quantity, quote, margin, delivery estimate.
- Required documents and certificates.
- Payment terms and risk.
- Email/proforma preview.
- Approve, reject, or request modification.

Present flow:

- Approval triggers buyer-facing quote/proforma creation.
- Email recipient is overridden to `admin@gopuexports.com`.
- Original buyer email is retained in metadata for audit.
- No real buyer receives email until live buyer release is enabled.

### Stage 4: Proforma invoice and document pack

After Director approval:

- Create Stage 1 proforma invoice.
- Send proforma/quote email to the configured review inbox.
- Update lead status.
- If an export order exists, advance the export order to Stage 2.
- Create document rows for the required document checklist.

### Stage 5: Buyer confirmation and payment tracking

Payment panel must show:

- Invoice/proforma number.
- Total quote amount.
- Amount paid.
- Balance due.
- Due date.
- Payment method: TT advance, LC, DP, DA, open account, etc.
- Payment status: pending, partial, confirmed, overdue.
- CFO query trail.
- Next follow-up date.
- Follow-up owner.

If CFO confirms payment:

- Operation panel updates payment status.
- Director panel updates payment readiness.
- COO unlocks shipment booking tasks if other blockers are clear.

### Stage 6: Shipment planning

COO shipment panel must show:

- Shipment type: sea/air/road.
- Container type: 20 ft FCL, 40 ft FCL, LCL, or air cargo.
- Target booking date.
- Cargo ready date.
- Supplier pickup date.
- Port cutoff date.
- ETD.
- ETA.
- CHA/customs owner.
- Shipping line/freight forwarder.
- Booking status.
- Delivery date.
- Delay risk.

Shipment must not be marked ready unless:

- Payment status meets terms.
- Product allocated.
- Packing confirmed.
- Required certificates are planned or complete.
- Proforma/commercial invoice fields pass validation.
- CHA/customs documents are ready.

## 4. COO Lead List Requirements

The COO lead list should show each lead as a clickable row. Clicking any important cell in the row should open the lead detail page.

Required columns:

- Lead No
- Buyer
- Product
- Quantity
- Load
- Destination
- Quote
- Payment
- Documents
- Delivery ETA
- Status
- Risk

Example row:

| Lead No | Buyer | Product | Quantity | Load | Destination | Quote | Payment | Documents | Delivery ETA | Status |
|---|---|---|---:|---|---|---:|---|---|---|---|
| GOPU-LD-0001 | ABC Trading LLC | Raw red chilli | 20 MT | 1 x FCL | Dubai, UAE | USD 49,000 | Pending advance | 9 required / 0 complete | 18 days | Director approved |

Row behavior:

- Click Lead No: open lead detail page.
- Click Product: open product compliance section within lead detail.
- Click Documents: open document checklist section.
- Click Payment: open payment section.
- Click Delivery ETA: open shipment planning section.

## 5. COO Lead Detail Page

Route:

- Preferred: `/export-os/coo/leads/:leadId`
- Alternative if routing already exists: `/export-os/leads/:leadId`

Top header:

- Lead number.
- Buyer name.
- Product.
- Quantity.
- Quote amount.
- Current stage.
- Next action.

### Section A: Client details

Fields:

- Buyer name.
- Company name.
- Contact person.
- Phone number.
- Email ID.
- WhatsApp number.
- Country.
- Destination port.
- Billing address.
- Delivery address.
- Buyer tax/import ID if available.
- Buyer document requirements.

### Section B: Commercial details

Fields:

- Product.
- Grade/spec.
- HS code.
- Quantity.
- Unit.
- Container/load assumption.
- Incoterm.
- Shipment mode.
- Payment terms.
- Quote amount.
- Price per unit.
- Currency.
- Validity date.
- Delivery target.
- CFO margin status.

### Section C: Invoice flow

The invoice section should show types and status in sequence:

1. Proforma Invoice
   - Status: drafted, sent to admin review, sent to buyer, accepted, revised, cancelled.
   - Fields: PI number, date, buyer, product, quantity, price, Incoterm, payment terms, validity.

2. Commercial Invoice
   - Status: blocked until buyer confirmation/payment/shipment readiness.
   - Fields: final invoice number, GST/LUT export mode, HSN, value, buyer, consignee, shipment details.

3. Packing List
   - Status: blocked until packing details confirmed.
   - Fields: package count, package type, net weight, gross weight, dimensions, marks and numbers.

4. Certificate of Origin
   - Status: required or verify.
   - Fields: issuing body, origin declaration, product, invoice reference.

5. Shipping Bill
   - Status: customs filing stage.
   - Fields: port, invoice reference, scheme, shipping bill number, LEO status.

6. Bill of Lading / Sea Waybill / Airway Bill
   - Status: post-shipment.
   - Fields: carrier, vessel/flight, ETD, ETA, container, seal number, consignee, notify party.

### Section D: Documents and certificates

Document table columns:

- Document name.
- Required: yes/no/verify.
- Reason.
- Owner.
- Source: generated/uploaded/buyer/supplier/lab/government.
- Status.
- Due date.
- File.
- Actions.

Actions:

- Generate.
- Upload.
- Send to Claude review.
- View.
- Mark verified.
- Request correction.

View behavior:

- Clicking `View` opens a document preview page or modal.
- PDF, image, DOCX, and generated HTML documents should render in preview.
- If preview is not supported, show metadata and download/open fallback.
- The row should still store the file URL, source, upload date, reviewer, and validation result.

Claude review behavior:

- Send the uploaded/generated document and lead metadata to review.
- Extract document fields.
- Compare against lead/invoice/order values.
- Return mismatches:
  - Buyer mismatch.
  - Quantity mismatch.
  - Price mismatch.
  - Incoterm mismatch.
  - Destination mismatch.
  - Missing HS code.
  - Missing certificate number.
  - Date expired.
- Store result next to the document row.

### Section E: Certificate rules engine

The system must map product and destination to document requirements.

For raw red chilli/chilli products:

Required baseline:

- Proforma Invoice.
- Commercial Invoice.
- Packing List.
- Shipping Bill.
- Bill of Lading or Airway Bill.
- Certificate of Origin: usually required by buyer/bank/import customs; mark required if buyer asks or LC requires it.
- Spice Board/CRES check: exporter must have valid spice exporter registration/RCMC.
- Chilli mandatory sampling/testing certificate: required for Sudan dye and aflatoxin according to Spices Board notification.
- Certificate of Analysis: recommended/required for buyer and destination compliance; include moisture, aflatoxin, pesticide residue, microbiology, color/ASTA if applicable.
- Phytosanitary Certificate: required/verify for plant product export and destination import clearance; apply through PQMS if required by destination or buyer.
- Fumigation Certificate: required if wooden pallets/wood packaging are used or destination/buyer requires fumigation.
- Insurance Certificate: required for CIF/CIP or if buyer/bank asks.
- Health Certificate: required/verify for specific markets such as EU/UK chilli/chilli products when applicable.

Important correction:

- The certificate is `phytosanitary certificate`, not physiotherapy certificate.

Rules examples:

| Product | Destination | Trigger | Required document |
|---|---|---|---|
| Raw red chilli | Any destination | Chilli/chilli product export | Spices Board sampling/testing for Sudan dye and aflatoxin |
| Raw red chilli | Plant product shipment | Import country or buyer requires plant health clearance | Phytosanitary certificate |
| Raw red chilli | EU/UK or strict food market | Destination food safety rules | COA, pesticide residue/aflatoxin report, health certificate verify |
| Any cargo | Wooden pallets/wood packaging | ISPM-15 or buyer/importer requirement | Fumigation/wood treatment certificate |
| CIF/CIP shipment | Seller responsible for insurance | Incoterm | Insurance certificate |
| LC payment | Bank document condition | LC terms | Exact LC document set |

### Section F: Payment and CFO sync

Payment card must show:

- Total invoice/proforma amount.
- Amount paid.
- Balance due.
- Payment method.
- Payment reference.
- Payment received date.
- Due date.
- Follow-up date.
- CFO owner.
- CFO notes.
- Payment proof document.

Payment event model:

- `payment_requested`
- `payment_followup_due`
- `payment_partial_received`
- `payment_confirmed`
- `payment_overdue`
- `payment_mismatch`

When CFO asks or answers a payment query:

- The event must appear in COO operations panel.
- The same event must appear in Director panel.
- Payment-dependent shipment tasks must update their blockers automatically.

### Section G: Shipment and delivery flow

Shipment card must show:

- Cargo ready date.
- Booking needed by date.
- Container booking date.
- Container type.
- Freight forwarder.
- Shipping line.
- CHA/customs broker.
- Pickup date.
- Port cutoff.
- ETD.
- ETA.
- Final delivery date.
- Delivery follow-up date.

Shipment stage statuses:

1. Enquiry received.
2. Quote approved.
3. Proforma sent.
4. Buyer confirmed.
5. Payment pending/partial/confirmed.
6. Production/stock allocation.
7. QC/testing.
8. Certificates in progress.
9. Packing complete.
10. Container booking due.
11. Container booked.
12. Customs filed.
13. LEO received.
14. Shipped.
15. Documents sent to buyer/bank.
16. Delivered.
17. Payment realized/eBRC/closure.

## 6. Director Panel Requirements

Director queue row should show:

- Lead number.
- Buyer.
- Product.
- Quantity.
- Quote.
- Margin/risk.
- Payment status.
- Document readiness.
- Delivery ETA.
- Required approval action.

Director detail page should show:

- Same client details as COO.
- CFO price summary.
- COO document/certification checklist.
- Payment status.
- Shipment timeline.
- Email/proforma preview.
- Risk summary:
  - Missing buyer data.
  - Missing payment proof.
  - Missing certificate.
  - Country compliance risk.
  - Delivery risk.
- Buttons:
  - Approve.
  - Reject.
  - Request modification.
  - Ask CFO.
  - Ask COO.
  - Hold buyer release.

## 7. Data Model Additions

Recommended tables or views:

### `lead_execution_summary`

Can be a view joining lead, pricing, invoice, payment, documents, and shipment.

Fields:

- lead_id
- lead_number
- buyer_name
- company_name
- phone
- email
- country
- destination_port
- product
- grade
- hs_code
- quantity
- unit
- container_load
- quote_amount
- currency
- incoterm
- payment_terms
- paid_amount
- balance_amount
- payment_status
- payment_due_date
- followup_date
- delivery_eta
- shipment_status
- document_readiness_percent
- certificate_risk
- next_action

### `lead_required_documents`

Fields:

- id
- lead_id
- export_order_id
- document_type
- document_name
- required_status: required, optional, verify
- requirement_reason
- owner_command
- issuing_party
- due_date
- status
- file_url
- generated_document_id
- claude_review_status
- validation_result
- created_at
- updated_at

### `lead_payment_events`

Fields:

- id
- lead_id
- invoice_id
- event_type
- amount
- currency
- payment_reference
- payment_date
- due_date
- followup_date
- owner_command
- status
- notes
- proof_file_url

### `lead_shipment_plan`

Fields:

- id
- lead_id
- export_order_id
- shipment_mode
- container_type
- container_count
- cargo_ready_date
- booking_due_date
- booking_date
- port_cutoff_date
- pickup_date
- etd
- eta
- delivery_date
- freight_forwarder
- shipping_line
- cha
- status
- risk_notes

## 8. Example Detail Page Content

Lead header:

```text
Lead: GOPU-LD-0001
Buyer: ABC Trading LLC
Product: Raw red chilli
Quantity: 20 MT
Load: 1 x FCL container, verify 20 ft/40 ft
Quote: USD 49,000
Price: USD 2,450/MT
Destination: Dubai, UAE
Delivery estimate: 18 days after cargo readiness
Next action: Director approval recorded. Proforma routed to admin review inbox.
```

Client details:

```text
Name: ABC Trading LLC
Phone: +971...
Email: buyer@example.com
Release email for present flow: admin@gopuexports.com
Location: Dubai, UAE
Shipment type: Sea freight
Payment type: TT advance
Payment status: Pending
Follow-up date: Tomorrow
```

Required documents:

```text
1. Proforma Invoice - Sent to admin review
2. Commercial Invoice - Blocked until buyer/payment confirmation
3. Packing List - Pending packing details
4. Shipping Bill - Pending customs filing
5. Bill of Lading - Pending shipment
6. Certificate of Origin - Verify buyer/bank requirement
7. Phytosanitary Certificate - Verify destination/buyer requirement
8. Chilli sampling/testing certificate - Required, Sudan dye/aflatoxin
9. Certificate of Analysis - Required/recommended, pesticide residue/aflatoxin/moisture
10. Fumigation Certificate - Required if wood packaging or destination requires
11. Insurance Certificate - Required for CIF/CIP
```

## 9. Acceptance Criteria

The flow is complete only when:

- Clicking a COO lead row opens a lead detail page.
- The detail page shows client, commercial, invoice, payment, document, certificate, and shipment sections.
- Required documents are generated from product/destination rules.
- Red chilli automatically shows chilli sampling/testing, COA, phytosanitary verify, and fumigation verify.
- Each document row has a `View` action.
- Generated and uploaded documents can be previewed.
- Claude review can be triggered from a document row and stores mismatch results.
- CFO payment updates appear in COO and Director panels.
- Director can see quote, paid amount, balance, due date, follow-up, ETA, and shipment booking needs.
- No buyer-facing email goes to a real buyer in present mode; it routes to `admin@gopuexports.com`.

## 10. Implementation Order

1. Create lead execution summary view/service.
2. Create product/destination document rules service.
3. Add COO lead detail route.
4. Add document checklist and viewer.
5. Add payment events and CFO sync.
6. Add shipment plan section.
7. Mirror summary in Director panel.
8. Add Claude document review action.
9. Add acceptance tests for red chilli 20 MT example.
10. Enable real buyer release only after Director approval and explicit live-release setting.
