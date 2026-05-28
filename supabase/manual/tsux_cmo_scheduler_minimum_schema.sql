-- GOPU OS / CMO scheduler minimum schema for Supabase project tsuxodfezumfgiqfjdfk.
-- Safe to run in Supabase SQL Editor. Does not drop existing data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
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
  plan text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  action_type text,
  module text,
  related_table text,
  related_id uuid,
  actor text,
  description text,
  previous_value jsonb,
  new_value jsonb,
  risk_level text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_idx
on public.audit_logs (tenant_id, created_at desc);

create index if not exists audit_logs_action_type_idx
on public.audit_logs (action_type, created_at desc);

create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  platform_key text not null unique,
  platform_name text not null,
  logo_key text,
  provider text,
  status text not null default 'pending' check (status in ('live', 'error', 'pending')),
  runtime text,
  error_message text,
  last_sync_at timestamptz,
  last_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_integrations_platform_key
on public.platform_integrations (platform_key);

create index if not exists idx_platform_integrations_runtime
on public.platform_integrations (runtime, status);

drop trigger if exists set_platform_integrations_updated_at on public.platform_integrations;
create trigger set_platform_integrations_updated_at
before update on public.platform_integrations
for each row execute function public.set_updated_at();

create table if not exists public.cmo_timezone_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cmo_timezone_preferences_timezone_check
    check (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?$')
);

create table if not exists public.cmo_posting_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null check (platform in ('LinkedIn','Facebook','Instagram','YouTube','X','Blog','Email')),
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  local_post_time time not null,
  schedule_mode text not null default 'every_day',
  schedule_days jsonb not null default '[]'::jsonb,
  trigger_window_minutes integer not null default 10,
  last_triggered_at_utc timestamptz,
  approval_required boolean not null default true,
  platform_integration_connected boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cmo_posting_settings_timezone_check
    check (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?$'),
  constraint cmo_posting_settings_unique_platform unique (tenant_id, platform),
  constraint cmo_posting_settings_schedule_mode_check
    check (schedule_mode in ('every_day','specific_days')),
  constraint cmo_posting_settings_trigger_window_check
    check (trigger_window_minutes between 1 and 60)
);

create index if not exists cmo_timezone_preferences_tenant_idx
on public.cmo_timezone_preferences (tenant_id, updated_at desc);

create index if not exists cmo_posting_settings_tenant_platform_idx
on public.cmo_posting_settings (tenant_id, platform);

drop trigger if exists set_cmo_timezone_preferences_updated_at on public.cmo_timezone_preferences;
create trigger set_cmo_timezone_preferences_updated_at
before update on public.cmo_timezone_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_cmo_posting_settings_updated_at on public.cmo_posting_settings;
create trigger set_cmo_posting_settings_updated_at
before update on public.cmo_posting_settings
for each row execute function public.set_updated_at();

create table if not exists public.cmo_schedule_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  posting_setting_id uuid references public.cmo_posting_settings(id) on delete set null,
  platform text not null,
  timezone text not null,
  local_day text not null,
  local_time time not null,
  due_at_utc timestamptz not null,
  triggered_at_utc timestamptz not null default now(),
  trigger_source text not null default 'vercel_cron',
  status text not null default 'queued',
  worker_job_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cmo_schedule_triggers_tenant_due_idx
on public.cmo_schedule_triggers (tenant_id, due_at_utc desc);

create index if not exists cmo_schedule_triggers_status_idx
on public.cmo_schedule_triggers (status, created_at desc);

drop trigger if exists set_cmo_schedule_triggers_updated_at on public.cmo_schedule_triggers;
create trigger set_cmo_schedule_triggers_updated_at
before update on public.cmo_schedule_triggers
for each row execute function public.set_updated_at();

create or replace function public.cmo_auto_publish_decision(
  approval_status text,
  scheduled_at_utc timestamptz,
  publish_status text,
  platform_integration_connected boolean,
  now_utc timestamptz default now()
)
returns text
language sql
stable
as $$
  select case
    when approval_status is distinct from 'approved' then 'pending_approval'
    when coalesce(platform_integration_connected, false) is false then 'skipped'
    when publish_status is distinct from 'queued' then coalesce(publish_status, 'skipped')
    when scheduled_at_utc is null then 'failed'
    when scheduled_at_utc <= now_utc then 'ready_to_publish'
    else 'queued_next_slot'
  end
$$;

alter table public.tenants enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.cmo_timezone_preferences enable row level security;
alter table public.cmo_posting_settings enable row level security;
alter table public.cmo_schedule_triggers enable row level security;

revoke all on table public.tenants from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.platform_integrations from anon;
revoke all on table public.cmo_timezone_preferences from anon;
revoke all on table public.cmo_posting_settings from anon;
revoke all on table public.cmo_schedule_triggers from anon;

grant select on table public.tenants to authenticated;
grant select on table public.audit_logs to authenticated;
grant select, insert, update on table public.platform_integrations to authenticated;
grant select, insert, update on table public.cmo_timezone_preferences to authenticated;
grant select, insert, update on table public.cmo_posting_settings to authenticated;
grant select on table public.cmo_schedule_triggers to authenticated;

drop policy if exists tenants_authenticated_select on public.tenants;
create policy tenants_authenticated_select on public.tenants
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists audit_logs_authenticated_select on public.audit_logs;
create policy audit_logs_authenticated_select on public.audit_logs
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists platform_integrations_authenticated_access on public.platform_integrations;
create policy platform_integrations_authenticated_access on public.platform_integrations
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists cmo_timezone_preferences_authenticated_access on public.cmo_timezone_preferences;
create policy cmo_timezone_preferences_authenticated_access on public.cmo_timezone_preferences
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists cmo_posting_settings_authenticated_access on public.cmo_posting_settings;
create policy cmo_posting_settings_authenticated_access on public.cmo_posting_settings
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists cmo_schedule_triggers_authenticated_select on public.cmo_schedule_triggers;
create policy cmo_schedule_triggers_authenticated_select on public.cmo_schedule_triggers
  for select to authenticated
  using (auth.uid() is not null);

insert into public.tenants (id, name, slug, status, plan)
values ('11111111-1111-1111-1111-111111111111', 'GOPU OS', 'gopu-os', 'active', 'production')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    status = excluded.status,
    updated_at = now();

insert into public.platform_integrations (
  platform_key,
  platform_name,
  logo_key,
  provider,
  status,
  runtime,
  error_message,
  metadata,
  last_sync_at,
  last_checked_at
)
values (
  'vercel_cron_scheduler',
  'Vercel Cron Scheduler',
  'vercel',
  'vercel',
  'pending',
  'vercel_cron',
  'Cron endpoint not verified',
  jsonb_build_object(
    'scheduler_runtime', 'vercel_cron',
    'cron_endpoint', '/api/cron/daily-social-trigger',
    'cron_schedule', '0 0 * * *',
    'last_cron_check_status', 'pending'
  ),
  now(),
  now()
)
on conflict (platform_key) do update
set platform_name = excluded.platform_name,
    logo_key = excluded.logo_key,
    provider = excluded.provider,
    runtime = excluded.runtime,
    metadata = public.platform_integrations.metadata || excluded.metadata,
    updated_at = now();

insert into public.cmo_timezone_preferences (tenant_id, timezone, country)
values ('11111111-1111-1111-1111-111111111111', 'Asia/Kolkata', 'India')
on conflict do nothing;

insert into public.cmo_posting_settings (
  tenant_id,
  platform,
  timezone,
  country,
  local_post_time,
  schedule_mode,
  schedule_days,
  trigger_window_minutes,
  approval_required,
  platform_integration_connected
)
values (
  '11111111-1111-1111-1111-111111111111',
  'LinkedIn',
  'Asia/Kolkata',
  'India',
  '08:00',
  'every_day',
  '[]'::jsonb,
  10,
  true,
  false
)
on conflict (tenant_id, platform) do update
set timezone = coalesce(public.cmo_posting_settings.timezone, excluded.timezone),
    country = coalesce(public.cmo_posting_settings.country, excluded.country),
    local_post_time = coalesce(public.cmo_posting_settings.local_post_time, excluded.local_post_time),
    schedule_mode = coalesce(public.cmo_posting_settings.schedule_mode, excluded.schedule_mode),
    trigger_window_minutes = coalesce(public.cmo_posting_settings.trigger_window_minutes, excluded.trigger_window_minutes),
    updated_at = now();
