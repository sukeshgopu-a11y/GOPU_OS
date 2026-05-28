create table if not exists public.master_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_type text not null,
  buyer_id text,
  shipment_id text,
  current_stage text,
  operational_health text,
  risk_level text,
  owner text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_timeline_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.master_workflows(id) on delete cascade,
  stage_name text not null,
  status text not null,
  owner text,
  blocker text,
  next_action text,
  linked_record text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_stage_dependencies (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.master_workflows(id) on delete cascade,
  dependency_name text not null,
  dependency_status text not null,
  created_at timestamptz default now()
);

create table if not exists public.workflow_executive_notes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.master_workflows(id) on delete cascade,
  executive_type text not null,
  recommendation text not null,
  severity text,
  created_at timestamptz default now()
);

create index if not exists master_workflows_tenant_stage_risk_idx
  on public.master_workflows (tenant_id, current_stage, risk_level);

create index if not exists workflow_timeline_events_workflow_status_idx
  on public.workflow_timeline_events (workflow_id, status, created_at);

create index if not exists workflow_stage_dependencies_workflow_status_idx
  on public.workflow_stage_dependencies (workflow_id, dependency_status);

create index if not exists workflow_executive_notes_workflow_exec_idx
  on public.workflow_executive_notes (workflow_id, executive_type, severity);

alter table public.master_workflows enable row level security;
alter table public.workflow_timeline_events enable row level security;
alter table public.workflow_stage_dependencies enable row level security;
alter table public.workflow_executive_notes enable row level security;

drop policy if exists master_workflows_tenant_select on public.master_workflows;
create policy master_workflows_tenant_select on public.master_workflows
  for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists master_workflows_tenant_insert on public.master_workflows;
create policy master_workflows_tenant_insert on public.master_workflows
  for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists master_workflows_tenant_update on public.master_workflows;
create policy master_workflows_tenant_update on public.master_workflows
  for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists workflow_timeline_events_tenant_select on public.workflow_timeline_events;
create policy workflow_timeline_events_tenant_select on public.workflow_timeline_events
  for select using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_timeline_events_tenant_insert on public.workflow_timeline_events;
create policy workflow_timeline_events_tenant_insert on public.workflow_timeline_events
  for insert with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_timeline_events_tenant_update on public.workflow_timeline_events;
create policy workflow_timeline_events_tenant_update on public.workflow_timeline_events
  for update using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())))
  with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_stage_dependencies_tenant_select on public.workflow_stage_dependencies;
create policy workflow_stage_dependencies_tenant_select on public.workflow_stage_dependencies
  for select using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_stage_dependencies_tenant_insert on public.workflow_stage_dependencies;
create policy workflow_stage_dependencies_tenant_insert on public.workflow_stage_dependencies
  for insert with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_stage_dependencies_tenant_update on public.workflow_stage_dependencies;
create policy workflow_stage_dependencies_tenant_update on public.workflow_stage_dependencies
  for update using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())))
  with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_executive_notes_tenant_select on public.workflow_executive_notes;
create policy workflow_executive_notes_tenant_select on public.workflow_executive_notes
  for select using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_executive_notes_tenant_insert on public.workflow_executive_notes;
create policy workflow_executive_notes_tenant_insert on public.workflow_executive_notes
  for insert with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));

drop policy if exists workflow_executive_notes_tenant_update on public.workflow_executive_notes;
create policy workflow_executive_notes_tenant_update on public.workflow_executive_notes
  for update using (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())))
  with check (workflow_id in (select id from public.master_workflows where tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid())));
