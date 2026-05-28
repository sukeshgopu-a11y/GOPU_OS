-- CMO production publish guardrails.
-- Existing options stay unchanged; this adds durable publish state for approved runs.

alter table public.content_history
  add column if not exists run_id text,
  add column if not exists image_url text,
  add column if not exists live_post_url text,
  add column if not exists publish_attempt_count integer not null default 0,
  add column if not exists last_publish_attempt_at timestamptz,
  add column if not exists last_publish_error text;

update public.content_history
set live_post_url = coalesce(live_post_url, post_url)
where live_post_url is null
  and post_url is not null;

create unique index if not exists content_history_unique_run_platform_idx
  on public.content_history(tenant_id, run_id, platform)
  where run_id is not null;

create index if not exists content_history_publish_status_idx
  on public.content_history(tenant_id, publish_status, last_publish_attempt_at desc);

grant select, insert, update on table public.content_history to authenticated;

drop policy if exists content_history_insert_member on public.content_history;
create policy content_history_insert_member on public.content_history
  for insert to authenticated
  with check (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_history_update_member on public.content_history;
create policy content_history_update_member on public.content_history
  for update to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id))
  with check (app_private.gopu_is_tenant_member(tenant_id));
