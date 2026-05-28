create table if not exists public.social_growth_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  platform text not null,
  followers numeric,
  reach numeric,
  engagement numeric,
  growth_rate numeric,
  created_at timestamptz default now()
);

alter table public.marketing_campaigns
  add column if not exists platform text,
  add column if not exists allocated_budget numeric,
  add column if not exists approved_budget numeric,
  add column if not exists performance_status text;

create table if not exists public.content_performance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  content_id text,
  platform text,
  reach numeric,
  engagement numeric,
  watch_time_placeholder text,
  created_at timestamptz default now()
);

create table if not exists public.growth_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  platform text not null,
  target_growth numeric,
  current_growth numeric,
  created_at timestamptz default now()
);

create table if not exists public.cmo_openai_content_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  memory_type text not null,
  content text,
  source text,
  approved_by_founder boolean default false,
  created_at timestamptz default now()
);

create index if not exists social_growth_metrics_tenant_platform_idx
  on public.social_growth_metrics (tenant_id, platform, created_at);

create index if not exists marketing_campaigns_tenant_platform_status_idx
  on public.marketing_campaigns (tenant_id, platform, performance_status);

create index if not exists content_performance_tenant_platform_idx
  on public.content_performance (tenant_id, platform, created_at);

create index if not exists growth_targets_tenant_platform_idx
  on public.growth_targets (tenant_id, platform);

create index if not exists cmo_openai_content_memory_tenant_type_idx
  on public.cmo_openai_content_memory (tenant_id, memory_type, created_at);

alter table public.social_growth_metrics enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.content_performance enable row level security;
alter table public.growth_targets enable row level security;
alter table public.cmo_openai_content_memory enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'social_growth_metrics',
    'marketing_campaigns',
    'content_performance',
    'growth_targets',
    'cmo_openai_content_memory'
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
