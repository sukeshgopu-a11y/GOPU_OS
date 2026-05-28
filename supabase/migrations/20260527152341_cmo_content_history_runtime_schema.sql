-- CMO content history runtime schema.
-- Creates the missing durable content state before any Step 6 publishing work.

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

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id text not null,
  platform text not null check (platform in ('LinkedIn','Facebook','Instagram','YouTube','X','Blog','Email')),
  platform_target text,
  content_type text not null default 'Post',
  campaign_name text,
  region_country text,
  topic text,
  caption text,
  hashtags jsonb not null default '[]'::jsonb,
  image_prompt text,
  poster_url text,
  image_url text,
  generated_text text,
  final_text text,
  final_approved_content text,
  approval_status text not null default 'pending_approval',
  approved_at timestamptz,
  approved_at_utc timestamptz,
  rejected_at timestamptz,
  rejected_at_utc timestamptz,
  publish_status text not null default 'not_published',
  live_post_url text,
  post_url text,
  audit_references jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  generated_at_utc timestamptz not null default now(),
  scheduled_at_utc timestamptz,
  published_at timestamptz,
  published_at_utc timestamptz,
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  platform_integration_connected boolean not null default false,
  publish_attempt_count integer not null default 0,
  last_publish_attempt_at timestamptz,
  last_publish_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_history_run_platform_unique unique (tenant_id, run_id, platform)
);

alter table public.content_history
  add column if not exists run_id text,
  add column if not exists platform_target text,
  add column if not exists caption text,
  add column if not exists hashtags jsonb not null default '[]'::jsonb,
  add column if not exists image_prompt text,
  add column if not exists poster_url text,
  add column if not exists image_url text,
  add column if not exists final_approved_content text,
  add column if not exists approval_status text not null default 'pending_approval',
  add column if not exists approved_at_utc timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_at_utc timestamptz,
  add column if not exists publish_status text not null default 'not_published',
  add column if not exists live_post_url text,
  add column if not exists audit_references jsonb not null default '[]'::jsonb,
  add column if not exists generated_at_utc timestamptz not null default now(),
  add column if not exists scheduled_at_utc timestamptz,
  add column if not exists published_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India',
  add column if not exists platform_integration_connected boolean not null default false,
  add column if not exists publish_attempt_count integer not null default 0,
  add column if not exists last_publish_attempt_at timestamptz,
  add column if not exists last_publish_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content_history'
      and column_name = 'hashtags'
      and data_type <> 'jsonb'
  ) then
    alter table public.content_history
      alter column hashtags drop default,
      alter column hashtags type jsonb using case
        when hashtags is null then '[]'::jsonb
        when hashtags::text ~ '^\s*\[' then hashtags::jsonb
        else to_jsonb(string_to_array(hashtags::text, ' '))
      end,
      alter column hashtags set default '[]'::jsonb;
  end if;
end $$;

update public.content_history
set caption = coalesce(caption, generated_text),
    run_id = coalesce(run_id, 'legacy-' || id::text),
    poster_url = coalesce(poster_url, image_url),
    live_post_url = coalesce(live_post_url, post_url),
    generated_at_utc = coalesce(generated_at_utc, generated_at, now()),
    approved_at_utc = coalesce(approved_at_utc, approved_at),
    rejected_at_utc = coalesce(rejected_at_utc, rejected_at),
    published_at_utc = coalesce(published_at_utc, published_at)
where caption is null
   or poster_url is null
   or live_post_url is null
   or generated_at_utc is null
   or approved_at_utc is null
   or rejected_at_utc is null
   or published_at_utc is null;

alter table public.content_history
  alter column run_id set not null,
  alter column hashtags set default '[]'::jsonb,
  alter column audit_references set default '[]'::jsonb,
  alter column metadata set default '{}'::jsonb;

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  run_id text,
  version_number integer not null default 1,
  version_type text not null default 'generated',
  caption text,
  hashtags jsonb not null default '[]'::jsonb,
  image_prompt text,
  poster_url text,
  draft_text text,
  final_text text,
  approval_status text,
  audit_references jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.content_versions
  add column if not exists run_id text,
  add column if not exists caption text,
  add column if not exists hashtags jsonb not null default '[]'::jsonb,
  add column if not exists image_prompt text,
  add column if not exists poster_url text,
  add column if not exists approval_status text,
  add column if not exists audit_references jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content_versions'
      and column_name = 'hashtags'
      and data_type <> 'jsonb'
  ) then
    alter table public.content_versions
      alter column hashtags drop default,
      alter column hashtags type jsonb using case
        when hashtags is null then '[]'::jsonb
        when hashtags::text ~ '^\s*\[' then hashtags::jsonb
        else to_jsonb(string_to_array(hashtags::text, ' '))
      end,
      alter column hashtags set default '[]'::jsonb;
  end if;
end $$;

create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  run_id text,
  platform text not null,
  platform_target text,
  link_type text not null default 'poster',
  label text,
  url text not null,
  live_post_url text,
  poster_url text,
  publish_status text not null default 'not_published',
  published_at timestamptz,
  published_at_utc timestamptz,
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  audit_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.content_links
  add column if not exists run_id text,
  add column if not exists platform_target text,
  add column if not exists link_type text not null default 'poster',
  add column if not exists live_post_url text,
  add column if not exists poster_url text,
  add column if not exists publish_status text not null default 'not_published',
  add column if not exists published_at_utc timestamptz,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India',
  add column if not exists audit_references jsonb not null default '[]'::jsonb;

create table if not exists public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  run_id text,
  approval_status text not null default 'pending_approval',
  status text not null default 'Pending',
  approved_by uuid,
  approved_at timestamptz,
  approved_at_utc timestamptz,
  rejected_at timestamptz,
  rejected_at_utc timestamptz,
  slack_approval_id text,
  audit_references jsonb not null default '[]'::jsonb,
  notes text,
  timezone text not null default 'Asia/Kolkata',
  country text not null default 'India',
  created_at timestamptz not null default now()
);

alter table public.content_approvals
  add column if not exists run_id text,
  add column if not exists approval_status text not null default 'pending_approval',
  add column if not exists approved_at_utc timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_at_utc timestamptz,
  add column if not exists slack_approval_id text,
  add column if not exists audit_references jsonb not null default '[]'::jsonb,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists country text not null default 'India';

create index if not exists content_history_run_idx on public.content_history(tenant_id, run_id);
create index if not exists content_history_platform_publish_idx on public.content_history(tenant_id, platform, publish_status);
create index if not exists content_history_approval_idx on public.content_history(tenant_id, approval_status, generated_at_utc desc);
create unique index if not exists content_history_unique_run_platform_idx on public.content_history(tenant_id, run_id, platform);
create index if not exists content_versions_history_idx on public.content_versions(content_history_id);
create index if not exists content_versions_run_idx on public.content_versions(tenant_id, run_id);
create index if not exists content_links_history_idx on public.content_links(content_history_id);
create index if not exists content_links_run_idx on public.content_links(tenant_id, run_id);
create index if not exists content_approvals_history_idx on public.content_approvals(content_history_id);
create index if not exists content_approvals_run_idx on public.content_approvals(tenant_id, run_id);

drop trigger if exists set_content_history_updated_at on public.content_history;
create trigger set_content_history_updated_at
before update on public.content_history
for each row execute function public.set_updated_at();

alter table public.content_history enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_links enable row level security;
alter table public.content_approvals enable row level security;

revoke all on table public.content_history from anon;
revoke all on table public.content_versions from anon;
revoke all on table public.content_links from anon;
revoke all on table public.content_approvals from anon;

grant select, insert, update on table public.content_history to authenticated;
grant select, insert, update on table public.content_versions to authenticated;
grant select, insert, update on table public.content_links to authenticated;
grant select, insert, update on table public.content_approvals to authenticated;

drop policy if exists content_history_select_member on public.content_history;
create policy content_history_select_member on public.content_history
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_history_insert_member on public.content_history;
create policy content_history_insert_member on public.content_history
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_history_update_member on public.content_history;
create policy content_history_update_member on public.content_history
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_versions_select_member on public.content_versions;
create policy content_versions_select_member on public.content_versions
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_versions_insert_member on public.content_versions;
create policy content_versions_insert_member on public.content_versions
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_versions_update_member on public.content_versions;
create policy content_versions_update_member on public.content_versions
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_links_select_member on public.content_links;
create policy content_links_select_member on public.content_links
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_links_insert_member on public.content_links;
create policy content_links_insert_member on public.content_links
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_links_update_member on public.content_links;
create policy content_links_update_member on public.content_links
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_approvals_select_member on public.content_approvals;
create policy content_approvals_select_member on public.content_approvals
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_approvals_insert_member on public.content_approvals;
create policy content_approvals_insert_member on public.content_approvals
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_approvals_update_member on public.content_approvals;
create policy content_approvals_update_member on public.content_approvals
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));
