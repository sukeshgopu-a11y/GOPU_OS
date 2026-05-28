create table if not exists public.importer_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  company_name text,
  country text,
  city text,
  importer_type text,
  industry_category text,
  products jsonb default '[]'::jsonb,
  apeda_relevance jsonb default '[]'::jsonb,
  spice_board_relevance jsonb default '[]'::jsonb,
  website text,
  email text,
  phone text,
  whatsapp text,
  linkedin text,
  social_links jsonb default '[]'::jsonb,
  contact_person text,
  company_description text,
  source_platform text,
  source_url text,
  confidence_score numeric,
  verification_status text,
  buyer_risk text,
  preferred_products jsonb default '[]'::jsonb,
  preferred_shipment_type text,
  logistics_preference text,
  estimated_import_behavior text,
  relationship_status text,
  strategic_opportunity_score numeric,
  strategic_opportunity_tier text,
  probable_order_size text,
  preferred_packing text,
  communication_style text,
  operational_complexity text,
  documentation_sensitivity text,
  preferred_incoterms jsonb default '[]'::jsonb,
  preferred_payment_terms text,
  communication_notes text,
  outreach_history jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  assigned_owner text,
  outreach_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.importer_outreach (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  importer_id uuid references public.importer_records(id) on delete cascade,
  outreach_type text,
  draft_content text,
  status text,
  owner text,
  created_at timestamptz default now()
);

create table if not exists public.importer_market_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  importer_id uuid references public.importer_records(id) on delete set null,
  signal_type text,
  country text,
  product text,
  summary text,
  confidence text,
  created_at timestamptz default now()
);

create table if not exists public.importer_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  importer_id uuid references public.importer_records(id) on delete cascade,
  memory_type text,
  content text,
  source text,
  created_at timestamptz default now()
);

create index if not exists importer_records_tenant_country_idx on public.importer_records(tenant_id, country);
create index if not exists importer_records_tenant_type_idx on public.importer_records(tenant_id, importer_type);
create index if not exists importer_records_tenant_status_idx on public.importer_records(tenant_id, verification_status);
create index if not exists importer_outreach_importer_idx on public.importer_outreach(importer_id);
create index if not exists importer_market_signals_tenant_country_idx on public.importer_market_signals(tenant_id, country);
create index if not exists importer_memory_importer_idx on public.importer_memory(importer_id);

alter table public.importer_records enable row level security;
alter table public.importer_outreach enable row level security;
alter table public.importer_market_signals enable row level security;
alter table public.importer_memory enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'importer_records',
    'importer_outreach',
    'importer_market_signals',
    'importer_memory'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format('create policy %I on public.%I for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))', table_name || '_tenant_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_insert', table_name);
    execute format('create policy %I on public.%I for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))', table_name || '_tenant_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_update', table_name);
    execute format('create policy %I on public.%I for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())) with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))', table_name || '_tenant_update', table_name);
  end loop;
end $$;
