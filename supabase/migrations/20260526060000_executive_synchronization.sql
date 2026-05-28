create table if not exists public.executive_sync_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id text,
  source_executive text not null,
  target_executive text,
  event_type text not null,
  severity text,
  created_at timestamptz default now()
);

create table if not exists public.executive_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id text,
  executive_type text not null,
  recommendation text not null,
  severity text,
  created_at timestamptz default now()
);

create table if not exists public.cross_department_risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  workflow_id text,
  risk_type text not null,
  severity text,
  impacted_departments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.executive_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  memory_type text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists executive_sync_events_tenant_workflow_severity_idx
  on public.executive_sync_events (tenant_id, workflow_id, severity);

create index if not exists executive_recommendations_workflow_exec_idx
  on public.executive_recommendations (tenant_id, workflow_id, executive_type, severity);

create index if not exists cross_department_risks_workflow_severity_idx
  on public.cross_department_risks (tenant_id, workflow_id, severity);

create index if not exists executive_memory_tenant_type_idx
  on public.executive_memory (tenant_id, memory_type);

alter table public.executive_sync_events enable row level security;
alter table public.executive_recommendations enable row level security;
alter table public.cross_department_risks enable row level security;
alter table public.executive_memory enable row level security;

drop policy if exists executive_sync_events_tenant_select on public.executive_sync_events;
create policy executive_sync_events_tenant_select on public.executive_sync_events
  for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_sync_events_tenant_insert on public.executive_sync_events;
create policy executive_sync_events_tenant_insert on public.executive_sync_events
  for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_sync_events_tenant_update on public.executive_sync_events;
create policy executive_sync_events_tenant_update on public.executive_sync_events
  for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_memory_tenant_select on public.executive_memory;
create policy executive_memory_tenant_select on public.executive_memory
  for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_memory_tenant_insert on public.executive_memory;
create policy executive_memory_tenant_insert on public.executive_memory
  for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_memory_tenant_update on public.executive_memory;
create policy executive_memory_tenant_update on public.executive_memory
  for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_recommendations_tenant_select on public.executive_recommendations;
create policy executive_recommendations_tenant_select on public.executive_recommendations
  for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_recommendations_tenant_insert on public.executive_recommendations;
create policy executive_recommendations_tenant_insert on public.executive_recommendations
  for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists executive_recommendations_tenant_update on public.executive_recommendations;
create policy executive_recommendations_tenant_update on public.executive_recommendations
  for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists cross_department_risks_tenant_select on public.cross_department_risks;
create policy cross_department_risks_tenant_select on public.cross_department_risks
  for select using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists cross_department_risks_tenant_insert on public.cross_department_risks;
create policy cross_department_risks_tenant_insert on public.cross_department_risks
  for insert with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));

drop policy if exists cross_department_risks_tenant_update on public.cross_department_risks;
create policy cross_department_risks_tenant_update on public.cross_department_risks
  for update using (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from public.user_profiles where auth_user_id = auth.uid()));
