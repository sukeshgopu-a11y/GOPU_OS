alter table public.marketing_campaigns
  add column if not exists objective text,
  add column if not exists country_target text,
  add column if not exists audience_target text,
  add column if not exists daily_budget_inr numeric not null default 0,
  add column if not exists total_budget_inr numeric not null default 0,
  add column if not exists spend_inr numeric not null default 0,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists ai_suggestion_enabled boolean not null default false,
  add column if not exists founder_approval_status text not null default 'Founder approval required',
  add column if not exists updated_at timestamptz not null default now();

alter table public.campaign_budgets
  add column if not exists campaign_id uuid,
  add column if not exists daily_budget_inr numeric not null default 0,
  add column if not exists total_budget_inr numeric not null default 0,
  add column if not exists start_date date,
  add column if not exists end_date date;

create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid,
  campaign_name text,
  platform text,
  metric_name text not null,
  metric_value numeric not null default 0,
  metric_unit text,
  measured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid,
  campaign_name text,
  lead_name text,
  importer_name text,
  lead_source text,
  source text,
  whatsapp_clicks integer not null default 0,
  website_visits integer not null default 0,
  importer_response text,
  inquiry_id uuid,
  status text not null default 'New',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_schedule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid,
  campaign_name text,
  schedule_type text not null,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null default 'Pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaign_metrics enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.campaign_schedule enable row level security;

grant select, insert, update on table public.marketing_campaigns, public.campaign_budgets, public.campaign_metrics, public.campaign_leads, public.campaign_schedule to authenticated;
revoke all on table public.campaign_metrics, public.campaign_leads, public.campaign_schedule from anon;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['campaign_metrics', 'campaign_leads', 'campaign_schedule']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_update', table_name);

    execute format('create policy %I on public.%I for select to authenticated using (true)', table_name || '_authenticated_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', table_name || '_authenticated_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', table_name || '_authenticated_update', table_name);
  end loop;
end $$;

create index if not exists idx_campaign_metrics_campaign
on public.campaign_metrics (tenant_id, campaign_id, metric_name, measured_at desc);

create index if not exists idx_campaign_leads_campaign
on public.campaign_leads (tenant_id, campaign_id, created_at desc);

create index if not exists idx_campaign_schedule_campaign
on public.campaign_schedule (tenant_id, campaign_id, scheduled_at);
