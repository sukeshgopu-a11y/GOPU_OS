create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  platform_key text not null,
  platform_name text not null,
  logo_key text,
  status text not null default 'pending' check (status in ('live', 'error', 'pending')),
  error_message text,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_key)
);

alter table public.platform_integrations enable row level security;

revoke all on table public.platform_integrations from anon;
grant select, insert, update on table public.platform_integrations to authenticated;

drop policy if exists platform_integrations_authenticated_select on public.platform_integrations;
create policy platform_integrations_authenticated_select
on public.platform_integrations for select
to authenticated
using (true);

drop policy if exists platform_integrations_authenticated_insert on public.platform_integrations;
create policy platform_integrations_authenticated_insert
on public.platform_integrations for insert
to authenticated
with check (true);

drop policy if exists platform_integrations_authenticated_update on public.platform_integrations;
create policy platform_integrations_authenticated_update
on public.platform_integrations for update
to authenticated
using (true)
with check (true);

create index if not exists idx_platform_integrations_platform_key
on public.platform_integrations (platform_key);

create index if not exists idx_platform_integrations_status
on public.platform_integrations (status);
