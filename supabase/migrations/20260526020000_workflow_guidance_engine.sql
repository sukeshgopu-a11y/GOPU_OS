create table if not exists public.customer_verifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  buyer_id uuid,
  buyer_name text,
  verification_status text,
  risk_level text,
  risk_score numeric,
  missing_fields jsonb default '[]'::jsonb,
  verification_checks jsonb default '{}'::jsonb,
  recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workflow_guidance_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id uuid,
  stage_name text,
  validation_status text,
  passed_checks jsonb default '[]'::jsonb,
  missing_dependencies jsonb default '[]'::jsonb,
  next_action text,
  recommended_owner text,
  escalation_rule text,
  created_at timestamptz default now()
);

create table if not exists public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id uuid,
  communication_type text,
  recipient_type text,
  draft_body text,
  validation_status text,
  approval_status text,
  required_approvals jsonb default '[]'::jsonb,
  release_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workflow_guidance_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id uuid,
  event text,
  actor text,
  status text,
  notes text,
  created_at timestamptz default now()
);

alter table public.customer_verifications enable row level security;
alter table public.workflow_guidance_checks enable row level security;
alter table public.communication_drafts enable row level security;
alter table public.workflow_guidance_audit_log enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customer_verifications',
    'workflow_guidance_checks',
    'communication_drafts',
    'workflow_guidance_audit_log'
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
