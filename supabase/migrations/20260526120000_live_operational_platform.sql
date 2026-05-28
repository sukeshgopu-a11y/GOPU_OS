-- GOPU Export OS live operational platform
-- Additive production schema for Supabase-backed operational mode.
-- No raw card numbers, CVV, OTP, banking passwords, or API secrets are stored here.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('founder','director','coo','cfo','cto','cmo','cio')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, auth_user_id)
);

create table if not exists public.director_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_type text not null default 'workflow',
  source_record_id uuid,
  title text not null,
  summary text,
  owner_role text check (owner_role in ('director','coo','cfo','cto','cmo','cio')),
  priority text not null default 'Medium',
  status text not null default 'Awaiting Review',
  impact text,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  workflow_source text,
  linked_record_id text,
  linked_label text,
  linked_route text,
  department text,
  owner_command text,
  assigned_to text,
  assigned_role text,
  priority text not null default 'Medium',
  status text not null default 'New',
  due_date text,
  escalation_level text,
  blocking_reason text,
  next_action text,
  buyer text,
  product text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text not null,
  module text,
  status text not null default 'Awaiting Sync',
  current_stage text,
  owner_role text,
  blocked_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_type text not null,
  source_module text,
  source_record_id uuid,
  requested_by uuid references auth.users(id) on delete set null,
  approver_role text check (approver_role in ('director','coo','cfo','cto','cmo','cio')),
  status text not null default 'Pending',
  priority text not null default 'Medium',
  summary text,
  decision_note text,
  decided_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_type text,
  invoice_number text,
  status text not null default 'Draft',
  approval_status text,
  buyer_id uuid,
  quote_id uuid,
  currency text,
  subtotal numeric,
  tax_total numeric,
  grand_total numeric,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid,
  buyer_name text,
  product text,
  quantity numeric,
  destination text,
  incoterm text,
  product_cost numeric,
  freight_cost numeric,
  margin_target numeric,
  currency text default 'USD',
  status text not null default 'Draft',
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shipment_code text,
  buyer_id uuid,
  supplier_id uuid,
  product text,
  quantity text,
  destination text,
  status text not null default 'Planning',
  current_stage text,
  eta date,
  risk_state text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  supplier_name text not null,
  location text,
  contact_person text,
  phone text,
  email text,
  products_supplied jsonb not null default '[]'::jsonb,
  reliability_score numeric,
  status text not null default 'Awaiting Sync',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_name text,
  company_name text,
  country text,
  email text,
  phone text,
  product_interests jsonb not null default '[]'::jsonb,
  relationship_status text not null default 'New',
  risk_level text not null default 'Awaiting Sync',
  owner_role text default 'cmo',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_vault (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_name text not null,
  category text,
  amount numeric,
  currency text not null default 'INR',
  payment_reason text,
  payment_status text not null default 'Draft',
  approval_status text not null default 'Pending',
  tokenized_reference text,
  masked_metadata jsonb not null default '{}'::jsonb,
  receipt_url text,
  audit_trail jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  tokenized_reference text not null,
  brand text,
  masked_last4 text,
  expiry_label text,
  status text not null default 'Verification Pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_methods_no_raw_card check (masked_last4 is null or masked_last4 ~ '^[0-9X*]{4}$')
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_role text,
  recipient_user_id uuid references auth.users(id) on delete set null,
  source_module text,
  title text not null,
  message text,
  status text not null default 'Unread',
  priority text not null default 'Medium',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  module text not null,
  record_type text,
  record_id text,
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.importer_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_name text not null,
  country text,
  products jsonb not null default '[]'::jsonb,
  source text,
  verification_status text not null default 'Verification Pending',
  outreach_status text not null default 'Not Started',
  opportunity_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  market text,
  product text,
  signal_type text,
  confidence text,
  summary text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  platform text,
  content_type text,
  status text not null default 'Draft',
  approval_status text not null default 'Pending',
  scheduled_at timestamptz,
  owner_role text default 'cmo',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_name text not null,
  currency text not null default 'INR',
  budget_amount numeric,
  spend_amount numeric not null default 0,
  approval_status text not null default 'Pending',
  owner_role text default 'cmo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_tenant_auth_idx on public.profiles(tenant_id, auth_user_id);
create index if not exists director_queue_tenant_status_idx on public.director_queue(tenant_id, status, priority);
create index if not exists tasks_tenant_status_idx on public.tasks(tenant_id, status, priority);
create index if not exists approvals_tenant_status_idx on public.approvals(tenant_id, status, priority);
create index if not exists audit_logs_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);
create index if not exists notifications_tenant_status_idx on public.notifications(tenant_id, status, created_at desc);
create index if not exists importer_records_tenant_country_idx on public.importer_records(tenant_id, country);
create index if not exists content_projects_tenant_status_idx on public.content_projects(tenant_id, status, scheduled_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tenants','users','profiles','director_queue','tasks','workflows','approvals',
    'invoices','pricing_requests','shipments','suppliers','buyers','payment_vault',
    'billing_methods','notifications','audit_logs','importer_records','market_signals',
    'content_projects','campaign_budgets'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'director_queue','tasks','workflows','approvals','invoices','pricing_requests',
    'shipments','suppliers','buyers','payment_vault','billing_methods','notifications',
    'audit_logs','importer_records','market_signals','content_projects','campaign_budgets'
  ]
  loop
    execute format('drop policy if exists tenant_select on public.%I', table_name);
    execute format('drop policy if exists tenant_insert on public.%I', table_name);
    execute format('drop policy if exists tenant_update on public.%I', table_name);
    execute format('drop policy if exists tenant_delete on public.%I', table_name);
    execute format(
      'create policy tenant_select on public.%I for select to authenticated using (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = %I.tenant_id and p.status = ''active''))',
      table_name, table_name
    );
    execute format(
      'create policy tenant_insert on public.%I for insert to authenticated with check (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = %I.tenant_id and p.status = ''active''))',
      table_name, table_name
    );
    execute format(
      'create policy tenant_update on public.%I for update to authenticated using (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = %I.tenant_id and p.status = ''active'')) with check (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = %I.tenant_id and p.status = ''active''))',
      table_name, table_name, table_name
    );
    execute format(
      'create policy tenant_delete on public.%I for delete to authenticated using (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = %I.tenant_id and p.status = ''active''))',
      table_name, table_name
    );
  end loop;
end $$;

drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select
on public.tenants for select to authenticated
using (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = tenants.id and p.status = 'active'));

drop policy if exists users_self_select on public.users;
create policy users_self_select
on public.users for select to authenticated
using (auth_user_id = (select auth.uid()));

drop policy if exists profiles_member_select on public.profiles;
create policy profiles_member_select
on public.profiles for select to authenticated
using (exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()) and p.tenant_id = profiles.tenant_id and p.status = 'active'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.tenants, public.profiles to authenticated;
