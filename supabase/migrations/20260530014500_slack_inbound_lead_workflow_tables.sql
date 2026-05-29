-- Slack inbound lead workflow support.
-- Creates only the operational tables needed for Slack -> COO -> CFO -> Director routing.
-- No fake/sample lead data is inserted.

create extension if not exists pgcrypto;

create table if not exists public.lead_intake (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
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
  required_delivery_date date,
  incoterm text,
  payment_preference text,
  notes text,
  status text not null default 'Draft',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lead_intake
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists source text,
  add column if not exists buyer_name text,
  add column if not exists company_name text,
  add column if not exists country text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists product text,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists destination_port text,
  add column if not exists shipping_mode text,
  add column if not exists required_delivery_date date,
  add column if not exists incoterm text,
  add column if not exists payment_preference text,
  add column if not exists notes text,
  add column if not exists status text not null default 'Draft',
  add column if not exists assigned_to text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.lead_intake(id) on delete set null,
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

alter table public.pricing_requests
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists lead_id uuid references public.lead_intake(id) on delete set null,
  add column if not exists buyer_name text,
  add column if not exists product text,
  add column if not exists quantity numeric,
  add column if not exists destination text,
  add column if not exists incoterm text,
  add column if not exists product_cost numeric,
  add column if not exists freight_cost numeric,
  add column if not exists margin_target numeric,
  add column if not exists currency text default 'USD',
  add column if not exists status text not null default 'Draft',
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
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

alter table public.tasks
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists workflow_source text,
  add column if not exists linked_record_id text,
  add column if not exists linked_label text,
  add column if not exists linked_route text,
  add column if not exists department text,
  add column if not exists owner_command text,
  add column if not exists assigned_to text,
  add column if not exists assigned_role text,
  add column if not exists priority text not null default 'Medium',
  add column if not exists status text not null default 'New',
  add column if not exists due_date text,
  add column if not exists escalation_level text,
  add column if not exists blocking_reason text,
  add column if not exists next_action text,
  add column if not exists buyer text,
  add column if not exists product text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid unique,
  request_type text not null,
  title text,
  summary text,
  source_module text,
  related_table text,
  related_record_id uuid,
  related_record text,
  buyer_name text,
  amount text,
  requested_by text,
  risk_level text not null default 'Medium',
  reason text,
  status text not null default 'Pending Approval',
  approval_status text not null default 'Pending Approval',
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  whatsapp_status text not null default 'Pending',
  whatsapp_provider text not null default 'slack',
  provider_message_id text,
  retry_count integer not null default 0,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.founder_approvals
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists approval_request_id uuid unique,
  add column if not exists request_type text,
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists source_module text,
  add column if not exists related_table text,
  add column if not exists related_record_id uuid,
  add column if not exists related_record text,
  add column if not exists buyer_name text,
  add column if not exists amount text,
  add column if not exists requested_by text,
  add column if not exists risk_level text not null default 'Medium',
  add column if not exists reason text,
  add column if not exists status text not null default 'Pending Approval',
  add column if not exists approval_status text not null default 'Pending Approval',
  add column if not exists decision_note text,
  add column if not exists decided_by text,
  add column if not exists decided_at timestamptz,
  add column if not exists whatsapp_status text not null default 'Pending',
  add column if not exists whatsapp_provider text not null default 'slack',
  add column if not exists provider_message_id text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists lead_intake_tenant_status_idx
  on public.lead_intake(tenant_id, status);

create index if not exists pricing_requests_tenant_status_idx
  on public.pricing_requests(tenant_id, status);

create index if not exists tasks_tenant_status_idx
  on public.tasks(tenant_id, status);

create index if not exists tasks_owner_command_idx
  on public.tasks(tenant_id, owner_command);

create index if not exists founder_approvals_tenant_status_idx
  on public.founder_approvals(tenant_id, status, approval_status, whatsapp_status);

create index if not exists founder_approvals_request_idx
  on public.founder_approvals(approval_request_id);

alter table public.lead_intake enable row level security;
alter table public.pricing_requests enable row level security;
alter table public.tasks enable row level security;
alter table public.founder_approvals enable row level security;

grant select, insert, update on public.lead_intake to authenticated;
grant select, insert, update on public.pricing_requests to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update on public.founder_approvals to authenticated;
