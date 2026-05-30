-- Run this in Supabase SQL editor to fix missing tables and permissions.
-- Removes FK to non-existent tenants table.

create extension if not exists pgcrypto;

-- lead_intake
create table if not exists public.lead_intake (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source text,
  buyer_name text,
  company_name text,
  country text,
  email text,
  phone text,
  product text,
  quantity numeric,
  unit text,
  destination_port text,
  shipping_mode text,
  incoterm text,
  notes text,
  status text default 'Draft',
  assigned_to text,
  source_channel text,
  source_thread_ts text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.lead_intake add column if not exists source_channel text;
alter table public.lead_intake add column if not exists source_thread_ts text;
alter table public.lead_intake add column if not exists company_name text;

-- pricing_requests
create table if not exists public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid,
  buyer_name text,
  product text,
  quantity numeric,
  destination text,
  incoterm text,
  product_cost numeric,
  freight_cost numeric,
  margin_target numeric,
  currency text default 'USD',
  status text default 'Draft',
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text,
  description text,
  workflow_source text,
  linked_record_id text,
  linked_label text,
  linked_route text,
  department text,
  owner_command text,
  assigned_to text,
  assigned_role text,
  priority text default 'Medium',
  status text default 'Pending',
  due_date text,
  escalation_level text,
  blocking_reason text,
  next_action text,
  buyer text,
  product text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.tasks add column if not exists assigned_role text;
alter table public.tasks add column if not exists linked_label text;
alter table public.tasks add column if not exists linked_route text;

-- ai_agent_runs
create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid,
  pricing_request_id uuid,
  approval_id uuid,
  task_id uuid,
  agent_name text,
  agent_role text,
  status text default 'Pending',
  input jsonb default '{}'::jsonb,
  output jsonb default '{}'::jsonb,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- founder_approvals (add missing columns)
create table if not exists public.founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  approval_request_id uuid,
  request_type text,
  title text,
  summary text,
  source_module text,
  related_table text,
  related_record_id uuid,
  related_record text,
  buyer_name text,
  amount text,
  requested_by text,
  risk_level text default 'Medium',
  reason text,
  status text default 'Pending Approval',
  approval_status text default 'Pending Approval',
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  whatsapp_status text default 'Pending',
  whatsapp_provider text default 'slack',
  provider_message_id text,
  retry_count integer default 0,
  last_error text,
  metadata jsonb default '{}'::jsonb,
  audit_trail jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
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
alter table public.founder_approvals add column if not exists decision_note text;
alter table public.founder_approvals add column if not exists decided_by text;
alter table public.founder_approvals add column if not exists decided_at timestamptz;
alter table public.founder_approvals add column if not exists whatsapp_status text default 'Pending';
alter table public.founder_approvals add column if not exists whatsapp_provider text default 'slack';
alter table public.founder_approvals add column if not exists provider_message_id text;
alter table public.founder_approvals add column if not exists retry_count integer default 0;
alter table public.founder_approvals add column if not exists last_error text;
alter table public.founder_approvals add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.founder_approvals add column if not exists audit_trail jsonb default '[]'::jsonb;
alter table public.founder_approvals add column if not exists updated_at timestamptz default now();

-- integration_services
create table if not exists public.integration_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  platform_key text,
  platform_name text,
  logo_key text,
  provider text,
  channel_display text,
  status text,
  runtime text,
  error_message text,
  last_checked_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists integration_services_tenant_platform_key_idx
  on public.integration_services(tenant_id, platform_key);

-- slack_event_dedup (prevents duplicate processing)
create table if not exists public.slack_event_dedup (
  event_id text primary key,
  processed_at timestamptz default now()
);

-- RLS
alter table public.lead_intake enable row level security;
alter table public.pricing_requests enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_agent_runs enable row level security;
alter table public.founder_approvals enable row level security;
alter table public.integration_services enable row level security;
alter table public.slack_event_dedup enable row level security;

-- Grants (service_role bypasses RLS, authenticated needs explicit grant)
grant select, insert, update on public.lead_intake to authenticated, service_role;
grant select, insert, update on public.pricing_requests to authenticated, service_role;
grant select, insert, update on public.tasks to authenticated, service_role;
grant select, insert, update on public.ai_agent_runs to authenticated, service_role;
grant select, insert, update on public.founder_approvals to authenticated, service_role;
grant select, insert, update on public.integration_services to authenticated, service_role;
grant select, insert, update, delete on public.slack_event_dedup to service_role;

notify pgrst, 'reload schema';
