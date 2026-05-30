# PENDING SQL — Run in Supabase SQL Editor

URL: https://supabase.com/dashboard/project/ogrmmhlaxfxrtpdzzwti/sql/new

---

## STEP 0 — CFO Market Prices Table (Run This First — Unblocks Live Pricing)

This table powers the CFO → Market Prices tab and makes every quote use your actual purchase price instead of a hardcoded estimate.

```sql
create table if not exists public.commodity_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_key text not null,
  product_label text,
  price_inr_per_kg numeric not null,
  source text,
  note text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists commodity_prices_tenant_product_idx
  on public.commodity_prices(tenant_id, product_key);

alter table public.commodity_prices enable row level security;

grant select, insert, update on public.commodity_prices to authenticated, service_role;

notify pgrst, 'reload schema';
```

After running this: Go to **CFO → Market Prices tab** and enter today's actual purchase prices. Every quote from Slack or the Quotation page will use those prices immediately.

---

## STEP 1 — Create Missing Core Tables

These tables are referenced by the Slack lead handler but don't exist yet.
Without them: leads don't save, COO/Director show 0, agents show "not created".

```sql
create table if not exists public.lead_intake (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source text, buyer_name text, company_name text, country text,
  email text, phone text, product text, quantity numeric, unit text,
  destination_port text, shipping_mode text, incoterm text, notes text,
  status text default 'Draft', assigned_to text,
  source_channel text, source_thread_ts text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, lead_id uuid,
  buyer_name text, product text, quantity numeric, destination text,
  incoterm text, product_cost numeric, freight_cost numeric,
  margin_target numeric, currency text default 'USD',
  status text default 'Draft', payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, title text, description text,
  workflow_source text, linked_record_id text, linked_label text,
  linked_route text, department text, owner_command text,
  assigned_to text, assigned_role text,
  priority text default 'Medium', status text default 'Pending',
  due_date text, escalation_level text, blocking_reason text,
  next_action text, buyer text, product text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, lead_id uuid, pricing_request_id uuid,
  approval_id uuid, task_id uuid, agent_name text, agent_role text,
  status text default 'Pending',
  input jsonb default '{}'::jsonb, output jsonb default '{}'::jsonb,
  error_message text, started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.integration_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, platform_key text, platform_name text,
  logo_key text, provider text, channel_display text,
  status text, runtime text, error_message text,
  last_checked_at timestamptz, metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index if not exists integration_services_tenant_platform_key_idx
  on public.integration_services(tenant_id, platform_key);

create table if not exists public.slack_event_dedup (
  event_id text primary key,
  processed_at timestamptz default now()
);
```

---

## STEP 2 — Fix founder_approvals Table (Add Missing Columns)

The founder_approvals table exists but is missing columns the Slack handler writes to.

```sql
alter table public.founder_approvals add column if not exists approval_request_id uuid;
alter table public.founder_approvals add column if not exists request_type text;
alter table public.founder_approvals add column if not exists summary text;
alter table public.founder_approvals add column if not exists source_module text;
alter table public.founder_approvals add column if not exists related_table text;
alter table public.founder_approvals add column if not exists related_record_id uuid;
alter table public.founder_approvals add column if not exists related_record text;
alter table public.founder_approvals add column if not exists buyer_name text;
alter table public.founder_approvals add column if not exists amount text;
alter table public.founder_approvals add column if not exists requested_by text;
alter table public.founder_approvals add column if not exists risk_level text default 'Medium';
alter table public.founder_approvals add column if not exists reason text;
alter table public.founder_approvals add column if not exists approval_status text default 'Pending Approval';
alter table public.founder_approvals add column if not exists whatsapp_status text default 'Pending';
alter table public.founder_approvals add column if not exists whatsapp_provider text default 'slack';
alter table public.founder_approvals add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.founder_approvals add column if not exists audit_trail jsonb default '[]'::jsonb;
alter table public.founder_approvals add column if not exists updated_at timestamptz default now();
```

---

## STEP 3 — Fix Permissions (service_role must have access)

The previous migrations only granted to `authenticated`. The Slack serverless function uses `service_role` so it also needs explicit grants.

```sql
grant select, insert, update on public.lead_intake to authenticated, service_role;
grant select, insert, update on public.pricing_requests to authenticated, service_role;
grant select, insert, update on public.tasks to authenticated, service_role;
grant select, insert, update on public.ai_agent_runs to authenticated, service_role;
grant select, insert, update on public.founder_approvals to authenticated, service_role;
grant select, insert, update on public.integration_services to authenticated, service_role;
grant select, insert, update, delete on public.slack_event_dedup to service_role;

notify pgrst, 'reload schema';
```

---

## What This Fixes After Running

| Problem | Fixed by |
|---|---|
| Slack leads not recording in COO | Step 1 — creates lead_intake + tasks tables |
| COO shows 0 workflows | Step 1 — tasks table missing |
| Director shows 0 decisions | Step 1 — ai_agent_runs table missing |
| Duplicate Slack replies | Step 1 — slack_event_dedup table (code already deployed) |
| Agent shows "not created" | Steps 1 + 3 — tables + permissions |
| founder_approvals insert errors | Step 2 — adds missing columns |

---

## After Running SQL — Test With This Slack Message

Send in #exports-command-center:
```
New lead: 10 MT Red Chilli, buyer Ahmed Trading from Dubai, need FOB quote
```

Expected result:
- Bot replies with COO + CFO agent IDs and Director approval pending
- COO Command shows 1 active workflow
- Director Command shows 1 pending decision
- No duplicate replies

---

## Full Flow — How It Works (Confirmed)

```
Phone → Slack: "New lead: 10 MT Red Chilli, buyer Ahmed from Dubai"
         ↓
   GOPU OS receives it
         ↓
   COO Command → Lead saved to lead_intake → Task created → shows in Leads list
         ↓
   CFO Pricing Engine → Calculates total price, per unit, margin, delivery time
         ↓
   Director Panel → Approval request queued (pending your tap to approve)
         ↓
   Slack Reply (example):
   ✅ New Lead Received — GOPU OS
   Buyer: Ahmed Trading
   Product: 10 MT Red Chilli
   Destination: Dubai
   💰 Total: USD 19,914 | Per MT: USD 1,991
   Margin: 20% | Delivery: 10–35 days
   ⏳ Director Approval: Pending your approval
   ⚠️ No quote sent to buyer until you approve in Director panel
```

### What shows where after SQL is run

| Panel | What appears |
|---|---|
| COO Command → Leads | Every Slack lead as a new entry |
| COO Command → Workflows/Tasks | AI COO Agent task for each lead |
| CFO Command | Lead listed with Pending COO Verification status |
| Director Command | Approval request with full pricing for your decision |
| Slack | Clean reply with price, delivery time, approval status |

### Lead message format that works best from phone

Structured (best results):
```
New lead: 20 MT Turmeric
Buyer: Spice World LLC
Country: UAE
Incoterm: CIF
```

Short format (also works):
```
New lead: 10 MT Red Chilli buyer Ahmed Dubai FOB quote
```

---

## EXPORT DOCUMENT FLOW — RESEARCH NOTES (Indian Spice Exports)

Source: Deep research verified May 2026 across APEDA, Spice Board, ICEGATE, UCP 600, FEMA.

### 7 Stages of Every Export Order

```
STAGE 1: ENQUIRY & PROFORMA INVOICE         (Day 0–2)
STAGE 2: ORDER CONFIRMATION & PAYMENT TERMS  (Day 3–10)
STAGE 3: PRODUCTION & LAB TESTING           (Day 5–20)
STAGE 4: PRE-SHIPMENT DOCUMENTS             (Day 15–27)
STAGE 5: CUSTOMS — SHIPPING BILL & LEO      (Day 22–28)
STAGE 6: SHIPPING — BILL OF LADING          (Day 25–30)
STAGE 7: PAYMENT REALISATION & eBRC         (Day 35–120 depending on terms)
```

### Documents Per Stage and Who Gets Them

| Stage | Document | Issued By | Goes To |
|---|---|---|---|
| 1 | Proforma Invoice (PI) | Exporter (CFO prices it) | Buyer |
| 1 | Product Spec Sheet | Exporter (COO) | Buyer |
| 2 | Sales Contract / PO | Both parties | Both |
| 2 | LC / TT advice | Buyer's bank | Exporter's bank |
| 3 | Certificate of Analysis (COA) | NABL Lab | Buyer, Bank, Plant Quarantine |
| 3 | Pre-Shipment Inspection Report | SGS/BV/Intertek | Buyer, Bank |
| 4 | GST/Commercial Invoice | Exporter (CFO) | Customs, Bank, Buyer |
| 4 | Packing List | Exporter (COO) | Customs, Bank, Buyer |
| 4 | Certificate of Origin | FIEO/Chamber | Buyer, Bank, Destination Customs |
| 4 | Phytosanitary Certificate | Plant Quarantine (DPPQS) | Buyer's Customs, Bank |
| 4 | Spice Board Certificate | Spices Board of India | Buyer, Bank |
| 4 | FSSAI/Health Certificate | FSSAI | Buyer, Destination Customs |
| 4 | Consular Invoice | Destination consulate | Destination Customs |
| 4 | Insurance Certificate | Insurance company | Bank, Buyer |
| 5 | Shipping Bill | CHA (filed); Customs (approved) | Indian Customs |
| 5 | Let Export Order (LEO) | Indian Customs | Shipping line / CHA |
| 6 | Bill of Lading | Shipping line | Bank, Buyer |
| 7 | Bank Realisation Certificate (eBRC) | Exporter's bank | DGFT, GST Dept |

### Payment Terms and Their Impact on Timeline

| Payment Term | When Exporter Gets Paid | Risk Level |
|---|---|---|
| TT Advance (30%+70%) | 30% before; 70% within 3–7 days of BL copy | Lowest |
| LC at Sight | 5–7 days after compliant documents presented to bank | Low |
| LC Usance 60 days | 60 days from BL date | Medium |
| LC Usance 90 days | 90 days from BL date | Medium |
| DP (Documents against Payment) | When buyer pays at their bank — 10–21 days after docs arrive | Medium-High |
| DA (Documents against Acceptance) | On maturity (30/60/90 days after acceptance) | High |

### Critical Rules (Never Break These)

1. Description must be IDENTICAL across PI, Commercial Invoice, Packing List, Shipping Bill, BL, COO
2. HS code must be 8-digit (mandatory from 2025) — consistent everywhere
3. LUT ARN declaration required on every GST/export invoice
4. Phytosanitary must be applied BEFORE loading (not after)
5. Under LC: present all documents to bank within 21 days of BL date (UCP 600)
6. FEMA: payment must be received within 15 months of shipment date
7. COA must be from NABL-accredited lab — non-NABL rejected by EU and USA

### HS Codes for Gopu Exports

| Product | ITC-HS Code |
|---|---|
| Red Chilli (whole, dried) | 0904 21 10 |
| Chilli (crushed/ground) | 0904 22 00 |
| Turmeric (whole) | 0910 30 10 |
| Turmeric (ground) | 0910 30 20 |
| Pepper (whole) | 0904 11 00 |
| Pepper (ground) | 0904 12 00 |

---

## STEP 4 — New Tables for Export Stage Tracking

These tables power the COO ↔ CFO ↔ Director stage-by-stage communication.

```sql
-- Master export order tracker (one row per confirmed order)
create table if not exists public.export_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid,
  buyer_name text,
  company_name text,
  product text,
  quantity numeric,
  unit text,
  destination_country text,
  destination_port text,
  hs_code text,
  incoterm text,
  payment_term text,  -- TT_ADVANCE, LC_SIGHT, LC_60, LC_90, DP, DA
  currency text default 'USD',
  proforma_amount numeric,
  commercial_invoice_amount numeric,
  current_stage integer default 1,  -- 1 through 7
  current_stage_name text default 'Enquiry & Proforma',
  status text default 'Active',
  lc_number text,
  lc_expiry_date date,
  lc_last_shipment_date date,
  bl_date date,
  bl_number text,
  shipping_line text,
  vessel_name text,
  eta_destination date,
  payment_received_date date,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document checklist per export order
create table if not exists public.export_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  export_order_id uuid,
  lead_id uuid,
  document_type text not null,  -- proforma_invoice, commercial_invoice, packing_list, etc.
  document_name text,
  stage integer,  -- which stage this belongs to
  status text default 'Pending',  -- Pending, In Progress, Ready, Submitted, Approved, Rejected
  issued_by text,  -- Exporter, Bank, NABL Lab, Plant Quarantine, etc.
  goes_to text,  -- Buyer, Bank, Customs
  reference_number text,
  issued_date date,
  expiry_date date,
  file_url text,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stage transition log — records every time an order moves stage
create table if not exists public.export_stage_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  export_order_id uuid,
  from_stage integer,
  to_stage integer,
  stage_name text,
  triggered_by text,  -- COO, CFO, Director, System, Slack
  approval_id uuid,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Agent communications between COO, CFO, Director per order
create table if not exists public.export_agent_comms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  export_order_id uuid,
  from_agent text,  -- COO, CFO, Director
  to_agent text,
  message_type text,  -- proforma_ready, order_confirmed, invoice_ready, docs_complete, payment_received
  stage integer,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',  -- pending, actioned, dismissed
  actioned_at timestamptz,
  created_at timestamptz default now()
);

-- Grants
grant select, insert, update on public.export_orders to authenticated, service_role;
grant select, insert, update on public.export_documents to authenticated, service_role;
grant select, insert, update on public.export_stage_logs to authenticated, service_role;
grant select, insert, update on public.export_agent_comms to authenticated, service_role;

notify pgrst, 'reload schema';
```

### What These Tables Power in GOPU OS

| Table | Powers |
|---|---|
| export_orders | COO pipeline view, CFO invoice tracker, Director order summary |
| export_documents | Document checklist in COO — what's ready, what's pending per stage |
| export_stage_logs | Timeline/audit trail in COO showing who moved the order when |
| export_agent_comms | Inter-agent message feed: "CFO: Proforma priced ✅", "Director: Approved ✅" |

### COO ↔ CFO ↔ Director Communication Per Stage

| Stage | COO Action | CFO Action | Director Action |
|---|---|---|---|
| 1 Proforma | COO creates order, requests CFO to price | CFO prices PI, sends back to COO | Director approves PI before sending to buyer |
| 2 Order Confirmed | COO records payment terms, LC details | CFO logs advance TT or LC receipt | Director notified of confirmed order |
| 3 Lab/Production | COO tracks COA, Phyto application | CFO notes production cost | — |
| 4 Pre-Shipment Docs | COO generates Packing List, applies for COO/Phyto | CFO generates Commercial Invoice | Director approves document package before customs filing |
| 5 Customs | COO confirms LEO obtained | CFO records FOB value | Director notified: shipment cleared customs |
| 6 Shipping | COO uploads BL, confirms vessel/ETA | CFO presents docs to bank | Director notified: goods shipped, BL date confirmed |
| 7 Payment | COO marks order complete | CFO records payment, generates eBRC | Director receives final P&L summary |

---

## FULL API REFERENCE — All Endpoints in GOPU OS

### Slack

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/slack/events` | Slack event webhook — receives messages, detects leads, runs COO→CFO→Director pipeline |
| GET/POST | `/api/slack/sync-leads` | Cron: every 5 min — syncs lead status back to Slack thread (runs `*/5 * * * *`) |

### CFO / Pricing

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/prices/market` | Returns live commodity prices from `commodity_prices` table, merged with reference fallbacks. Used by CFO Pricing Engine and Quotations tab |
| POST | `/api/prices/market` | CFO manually updates a commodity price with source and note |

### Export Pipeline

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/export/stages` | Creates a new export order (Stage 1) or advances an order to the next stage. Called internally by Slack handler and COO pipeline UI |

### Cron Jobs (Scheduled — Vercel)

| Schedule | Path | Purpose |
|---|---|---|
| `30 3 * * *` (9 AM IST) | `/api/cron/morning-price-fetch` | Fetches live commodity prices from Agmarknet (data.gov.in), updates `commodity_prices` table, sends Slack price report |
| `0 3 * * *` (8:30 AM IST) | `/api/cron/daily-social-trigger` | Triggers CMO daily social media posts (LinkedIn, Instagram, Facebook) |
| `*/5 * * * *` | `/api/slack/sync-leads` | Syncs leads every 5 minutes |

### CTO Integrations

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cto/integrations` | Returns status of all platform integrations (Slack, WhatsApp, Meta, etc.) |

---

## FULL ENV VARS REFERENCE — Add in Vercel Dashboard

Vercel → Project → Settings → Environment Variables

### Required Right Now (System Broken Without These)

| Variable | Value / Where to Get |
|---|---|
| `SUPABASE_URL` | `https://ogrmmhlaxfxrtpdzzwti.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |
| `SLACK_BOT_TOKEN` | Slack API → Your App → OAuth & Permissions → Bot User OAuth Token |
| `SLACK_CHANNEL_ID` | Right-click channel in Slack → Copy Link → last part is the ID |
| `SLACK_SIGNING_SECRET` | Slack API → Your App → Basic Information → Signing Secret |

### Required for Live Commodity Prices (Morning Cron)

| Variable | Value / Where to Get |
|---|---|
| `DATA_GOV_API_KEY` | Register free at data.gov.in → My Account → API Keys. Unlocks Agmarknet live mandi prices |
| `CRON_SECRET` | Generate any random string (e.g. `openssl rand -hex 32`) — secures cron endpoints |

### Required for Social Media Posting (CMO)

| Variable | Value / Where to Get |
|---|---|
| `META_ACCESS_TOKEN` | Meta Business → Graph API Explorer → generate long-lived token |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Meta Business → Instagram Account → Settings → ID |
| `FACEBOOK_PAGE_ID` | Facebook Page → About → Page ID |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer Portal → OAuth 2.0 → `w_member_social` scope |
| `LINKEDIN_ORGANIZATION_ID` | LinkedIn Company Page URL — last number in the URL |

### Optional

| Variable | Value / Where to Get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL — used by frontend |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL — used by Vite frontend build |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |

---

## QUICK CHECKLIST — What to Run / Set Up

### One-time Supabase SQL (run in order)
- [ ] Step 0 — `commodity_prices` table
- [ ] Step 1 — `lead_intake`, `pricing_requests`, `tasks`, `ai_agent_runs`, `integration_services`, `slack_event_dedup`
- [ ] Step 2 — `founder_approvals` missing columns
- [ ] Step 3 — permissions (service_role grants)
- [ ] Step 4 — `export_orders`, `export_documents`, `export_stage_logs`, `export_agent_comms`

### Vercel Env Vars to Add
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` + `SLACK_SIGNING_SECRET`
- [ ] `DATA_GOV_API_KEY` — for live 9 AM price fetch
- [ ] `CRON_SECRET` — for securing cron endpoints
- [ ] Meta / LinkedIn tokens — for CMO social posting

### After SQL + Env Vars — Test This Flow
Send in Slack `#exports-command-center`:
```
New lead: 10 MT Red Chilli, buyer Ahmed Trading from Dubai, need FOB quote
```
Expected: Bot replies with price, COO shows lead, Director shows approval, 9 AM cron updates prices daily.

