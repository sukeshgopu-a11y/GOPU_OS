-- Vercel cron trigger support for CMO posting schedules.
-- Vercel only wakes the endpoint; production publishing workers should process queued trigger rows.

alter table public.cmo_posting_settings
  add column if not exists schedule_mode text not null default 'every_day',
  add column if not exists schedule_days jsonb not null default '[]'::jsonb,
  add column if not exists trigger_window_minutes integer not null default 5,
  add column if not exists last_triggered_at_utc timestamptz;

alter table public.cmo_posting_settings
  drop constraint if exists cmo_posting_settings_schedule_mode_check,
  add constraint cmo_posting_settings_schedule_mode_check
    check (schedule_mode in ('every_day','specific_days'));

alter table public.cmo_posting_settings
  drop constraint if exists cmo_posting_settings_trigger_window_check,
  add constraint cmo_posting_settings_trigger_window_check
    check (trigger_window_minutes between 1 and 60);

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
  on public.cmo_schedule_triggers(tenant_id, due_at_utc desc);

create index if not exists cmo_schedule_triggers_status_idx
  on public.cmo_schedule_triggers(status, created_at desc);

drop trigger if exists set_cmo_schedule_triggers_updated_at on public.cmo_schedule_triggers;
create trigger set_cmo_schedule_triggers_updated_at
before update on public.cmo_schedule_triggers
for each row execute function public.set_updated_at();

alter table public.cmo_schedule_triggers enable row level security;

revoke all on table public.cmo_schedule_triggers from anon;
grant select on table public.cmo_schedule_triggers to authenticated;

drop policy if exists cmo_schedule_triggers_select_member on public.cmo_schedule_triggers;
create policy cmo_schedule_triggers_select_member on public.cmo_schedule_triggers
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));
