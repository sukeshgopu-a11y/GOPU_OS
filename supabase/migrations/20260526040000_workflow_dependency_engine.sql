create table if not exists public.workflow_dependencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_type text not null,
  workflow_id text,
  dependency_name text not null,
  status text not null,
  linked_record_id text,
  owner text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_blockers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  blocker_type text not null,
  severity text not null,
  workflow_id text,
  owner text,
  escalation_target text,
  status text not null,
  blocker_reason text,
  business_impact text,
  next_action text,
  linked_route text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_guidance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id text,
  next_action text not null,
  recommended_owner text,
  suggested_timeline text,
  operational_risk text,
  suggested_escalation text,
  shipment_guidance text,
  certification_guidance text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_health (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id text,
  health_score numeric not null,
  risk_level text not null,
  dependency_completion numeric not null,
  created_at timestamptz default now()
);

create index if not exists workflow_dependencies_tenant_type_status_idx
  on public.workflow_dependencies (tenant_id, workflow_type, status);

create index if not exists workflow_blockers_tenant_workflow_severity_status_idx
  on public.workflow_blockers (tenant_id, workflow_id, severity, status);

create index if not exists workflow_guidance_tenant_workflow_idx
  on public.workflow_guidance (tenant_id, workflow_id);

create index if not exists workflow_health_tenant_workflow_risk_idx
  on public.workflow_health (tenant_id, workflow_id, risk_level);

alter table public.workflow_dependencies enable row level security;
alter table public.workflow_blockers enable row level security;
alter table public.workflow_guidance enable row level security;
alter table public.workflow_health enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'workflow_dependencies',
    'workflow_blockers',
    'workflow_guidance',
    'workflow_health'
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
