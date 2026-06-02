-- Slack lead -> COO -> CFO -> Director pipeline structure.
-- Safe/idempotent: adds missing columns and tables only, no fake/sample data.

create extension if not exists pgcrypto;

alter table public.lead_intake
  add column if not exists lead_number text,
  add column if not exists priority text default 'High',
  add column if not exists source_channel text,
  add column if not exists source_thread text,
  add column if not exists source_thread_ts text,
  add column if not exists received_at timestamptz,
  add column if not exists forwarded_by text,
  add column if not exists timeline_metadata jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.pricing_requests
  add column if not exists lead_number text,
  add column if not exists priority text default 'High',
  add column if not exists pricing_source_type text,
  add column if not exists pricing_confidence text,
  add column if not exists pricing_evidence jsonb not null default '{}'::jsonb,
  add column if not exists price_source_type text,
  add column if not exists price_source_name text,
  add column if not exists price_source_reference text,
  add column if not exists price_fetched_at timestamptz,
  add column if not exists price_basis text,
  add column if not exists product_grade text,
  add column if not exists market_location text;

alter table public.founder_approvals
  add column if not exists lead_number text,
  add column if not exists priority text default 'High',
  add column if not exists quotation_amount numeric,
  add column if not exists director_approval_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.commodity_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_key text not null,
  product_label text,
  price_inr_per_kg numeric not null,
  source text,
  price_source_type text,
  price_source_name text,
  price_source_reference text,
  product_grade text,
  market_location text,
  unit text default 'kg',
  currency text default 'INR',
  note text,
  fetched_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_key)
);

alter table public.commodity_prices
  add column if not exists product_label text,
  add column if not exists source text,
  add column if not exists price_source_type text,
  add column if not exists price_source_name text,
  add column if not exists price_source_reference text,
  add column if not exists product_grade text,
  add column if not exists market_location text,
  add column if not exists unit text default 'kg',
  add column if not exists currency text default 'INR',
  add column if not exists note text,
  add column if not exists fetched_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.export_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.lead_intake(id) on delete set null,
  buyer_name text,
  company_name text,
  product text,
  quantity numeric,
  unit text,
  destination_country text,
  destination_port text,
  hs_code text,
  incoterm text,
  payment_term text,
  currency text default 'USD',
  proforma_amount numeric,
  current_stage integer not null default 1,
  current_stage_name text,
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  stage_2_handoff_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  export_order_id uuid not null references public.export_orders(id) on delete cascade,
  document_type text not null,
  document_name text,
  stage integer,
  status text not null default 'Pending',
  issued_by text,
  goes_to text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (export_order_id, document_type)
);

create table if not exists public.export_stage_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  export_order_id uuid not null references public.export_orders(id) on delete cascade,
  from_stage integer,
  to_stage integer,
  stage_name text,
  triggered_by text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.export_agent_comms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  export_order_id uuid references public.export_orders(id) on delete cascade,
  from_agent text,
  to_agent text,
  message_type text,
  stage integer,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  actioned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.slack_event_dedup (
  event_id text primary key,
  created_at timestamptz not null default now()
);

create index if not exists lead_intake_lead_number_idx on public.lead_intake(tenant_id, lead_number);
create index if not exists pricing_requests_source_idx on public.pricing_requests(tenant_id, price_source_type);
create index if not exists founder_approvals_lead_number_idx on public.founder_approvals(tenant_id, lead_number);
create index if not exists export_orders_lead_idx on public.export_orders(tenant_id, lead_id);
create index if not exists export_orders_stage_idx on public.export_orders(tenant_id, current_stage, status);
create index if not exists export_agent_comms_order_idx on public.export_agent_comms(export_order_id, created_at);

alter table public.commodity_prices enable row level security;
alter table public.export_orders enable row level security;
alter table public.export_documents enable row level security;
alter table public.export_stage_logs enable row level security;
alter table public.export_agent_comms enable row level security;
alter table public.slack_event_dedup enable row level security;

grant select, insert, update on public.commodity_prices to authenticated;
grant select, insert, update on public.export_orders to authenticated;
grant select, insert, update on public.export_documents to authenticated;
grant select, insert, update on public.export_stage_logs to authenticated;
grant select, insert, update on public.export_agent_comms to authenticated;
grant select, insert, update on public.slack_event_dedup to service_role;
grant select, insert, update, delete on public.commodity_prices to service_role;
grant select, insert, update, delete on public.export_orders to service_role;
grant select, insert, update, delete on public.export_documents to service_role;
grant select, insert, update, delete on public.export_stage_logs to service_role;
grant select, insert, update, delete on public.export_agent_comms to service_role;

notify pgrst, 'reload schema';
