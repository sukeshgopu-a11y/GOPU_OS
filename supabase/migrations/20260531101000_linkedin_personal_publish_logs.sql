-- GOPU OS / LinkedIn personal profile publishing log.
-- Stores publish status and public provider identifiers only. Does not store LinkedIn secrets.

create table if not exists public.social_publish_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  content_history_id uuid,
  founder_approval_id uuid,
  platform text not null,
  content_text text,
  media_url text,
  status text not null default 'pending',
  linkedin_post_id text,
  linkedin_post_urn text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.social_publish_logs
  add column if not exists tenant_id uuid,
  add column if not exists content_history_id uuid,
  add column if not exists founder_approval_id uuid,
  add column if not exists platform text,
  add column if not exists content_text text,
  add column if not exists media_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists linkedin_post_id text,
  add column if not exists linkedin_post_urn text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists social_publish_logs_platform_created_idx
  on public.social_publish_logs(platform, created_at desc);

create index if not exists social_publish_logs_content_history_idx
  on public.social_publish_logs(content_history_id, created_at desc);

create index if not exists social_publish_logs_founder_approval_idx
  on public.social_publish_logs(founder_approval_id, created_at desc);

alter table public.platform_integrations
  add column if not exists tenant_id uuid,
  add column if not exists platform text,
  add column if not exists provider text,
  add column if not exists runtime text,
  add column if not exists connection_status text not null default 'not_configured',
  add column if not exists updated_at timestamptz not null default now();

insert into public.platform_integrations (
  tenant_id,
  platform,
  platform_key,
  platform_name,
  logo_key,
  provider,
  status,
  runtime,
  connection_status,
  metadata
)
values (
  '11111111-1111-1111-1111-111111111111',
  'LinkedIn Personal',
  'linkedin_personal',
  'LinkedIn Personal',
  'linkedin',
  'linkedin',
  'pending',
  'cmo_publishing',
  'not_configured',
  '{"required_scope":"w_member_social","required_env":["LINKEDIN_CLIENT_ID","LINKEDIN_CLIENT_SECRET","LINKEDIN_REDIRECT_URI","LINKEDIN_ACCESS_TOKEN"],"company_page_required":false}'::jsonb
)
on conflict (platform_key) do update
set
  platform = excluded.platform,
  platform_name = excluded.platform_name,
  provider = excluded.provider,
  runtime = excluded.runtime,
  metadata = coalesce(public.platform_integrations.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();
