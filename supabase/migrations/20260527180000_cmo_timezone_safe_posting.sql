-- CMO travel-safe posting timezone controls.
-- Source of truth is the selected IANA timezone, while execution timestamps are stored in UTC.

create table if not exists public.cmo_timezone_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cmo_timezone_preferences_timezone_check check (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?$')
);

create table if not exists public.cmo_posting_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null check (platform in ('LinkedIn','Facebook','Instagram','YouTube','X','Blog','Email')),
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  local_post_time time not null,
  approval_required boolean not null default true,
  platform_integration_connected boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cmo_posting_settings_timezone_check check (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?$'),
  constraint cmo_posting_settings_unique_platform unique (tenant_id, platform)
);

alter table public.content_history
  add column if not exists scheduled_at_utc timestamptz,
  add column if not exists published_at_utc timestamptz,
  add column if not exists generated_at_utc timestamptz,
  add column if not exists approved_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India',
  add column if not exists approval_status text not null default 'pending_approval',
  add column if not exists publish_status text not null default 'queued',
  add column if not exists platform_integration_connected boolean not null default false;

update public.content_history
set generated_at_utc = coalesce(generated_at_utc, generated_at),
    approved_at_utc = coalesce(approved_at_utc, approved_at),
    published_at_utc = coalesce(published_at_utc, published_at)
where generated_at_utc is null
   or approved_at_utc is null
   or published_at_utc is null;

alter table public.content_links
  add column if not exists published_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India';

update public.content_links
set published_at_utc = coalesce(published_at_utc, published_at)
where published_at_utc is null;

alter table public.content_approvals
  add column if not exists approved_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India';

update public.content_approvals
set approved_at_utc = coalesce(approved_at_utc, approved_at)
where approved_at_utc is null;

alter table public.ai_generation_logs
  add column if not exists generated_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India';

update public.ai_generation_logs
set generated_at_utc = coalesce(generated_at_utc, generated_at)
where generated_at_utc is null;

create index if not exists cmo_timezone_preferences_tenant_idx on public.cmo_timezone_preferences(tenant_id, updated_at desc);
create index if not exists cmo_posting_settings_tenant_platform_idx on public.cmo_posting_settings(tenant_id, platform);
create index if not exists content_history_schedule_utc_idx on public.content_history(tenant_id, scheduled_at_utc, publish_status, approval_status);
create index if not exists content_history_generated_utc_idx on public.content_history(tenant_id, generated_at_utc desc);

drop trigger if exists set_cmo_timezone_preferences_updated_at on public.cmo_timezone_preferences;
create trigger set_cmo_timezone_preferences_updated_at
before update on public.cmo_timezone_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_cmo_posting_settings_updated_at on public.cmo_posting_settings;
create trigger set_cmo_posting_settings_updated_at
before update on public.cmo_posting_settings
for each row execute function public.set_updated_at();

create or replace function app_private.cmo_auto_publish_decision(
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

alter table public.cmo_timezone_preferences enable row level security;
alter table public.cmo_posting_settings enable row level security;

revoke all on table public.cmo_timezone_preferences from anon;
revoke all on table public.cmo_posting_settings from anon;
grant select, insert, update on table public.cmo_timezone_preferences to authenticated;
grant select, insert, update on table public.cmo_posting_settings to authenticated;

drop policy if exists cmo_timezone_preferences_select_member on public.cmo_timezone_preferences;
create policy cmo_timezone_preferences_select_member on public.cmo_timezone_preferences
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists cmo_timezone_preferences_insert_member on public.cmo_timezone_preferences;
create policy cmo_timezone_preferences_insert_member on public.cmo_timezone_preferences
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists cmo_timezone_preferences_update_member on public.cmo_timezone_preferences;
create policy cmo_timezone_preferences_update_member on public.cmo_timezone_preferences
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists cmo_posting_settings_select_member on public.cmo_posting_settings;
create policy cmo_posting_settings_select_member on public.cmo_posting_settings
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists cmo_posting_settings_insert_member on public.cmo_posting_settings;
create policy cmo_posting_settings_insert_member on public.cmo_posting_settings
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists cmo_posting_settings_update_member on public.cmo_posting_settings;
create policy cmo_posting_settings_update_member on public.cmo_posting_settings
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));
