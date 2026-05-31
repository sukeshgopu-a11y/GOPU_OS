-- GOPU OS / CMO social platform connection tracking.
-- Safe to run more than once. Does not store access-token secret values.

alter table public.platform_integrations
  add column if not exists tenant_id uuid,
  add column if not exists access_token_present boolean not null default false,
  add column if not exists account_id text,
  add column if not exists organization_id text,
  add column if not exists author_urn text,
  add column if not exists facebook_page_id text,
  add column if not exists instagram_business_account_id text,
  add column if not exists connection_status text not null default 'not_configured',
  add column if not exists configured_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists platform_integrations_tenant_platform_idx
  on public.platform_integrations(tenant_id, platform_key);

create index if not exists platform_integrations_connection_status_idx
  on public.platform_integrations(connection_status, updated_at desc);

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
values
  (
    '11111111-1111-1111-1111-111111111111',
    'LinkedIn',
    'linkedin',
    'LinkedIn',
    'linkedin',
    'linkedin',
    'pending',
    'cmo_publishing',
    'not_configured',
    '{"required_env":["LINKEDIN_ACCESS_TOKEN","LINKEDIN_ORGANIZATION_ID or LINKEDIN_AUTHOR_URN"]}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Meta',
    'meta',
    'Meta',
    'meta',
    'meta',
    'pending',
    'cmo_publishing',
    'not_configured',
    '{"required_env":["META_ACCESS_TOKEN","FACEBOOK_PAGE_ID","INSTAGRAM_BUSINESS_ACCOUNT_ID"]}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Facebook',
    'facebook',
    'Facebook',
    'facebook',
    'meta',
    'pending',
    'cmo_publishing',
    'not_configured',
    '{"required_env":["META_ACCESS_TOKEN","FACEBOOK_PAGE_ID"]}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Instagram',
    'instagram',
    'Instagram',
    'instagram',
    'meta',
    'pending',
    'cmo_publishing',
    'not_configured',
    '{"required_env":["META_ACCESS_TOKEN","INSTAGRAM_BUSINESS_ACCOUNT_ID"]}'::jsonb
  )
on conflict (platform_key) do update
set
  tenant_id = coalesce(public.platform_integrations.tenant_id, excluded.tenant_id),
  platform = coalesce(public.platform_integrations.platform, excluded.platform),
  platform_name = coalesce(public.platform_integrations.platform_name, excluded.platform_name),
  logo_key = coalesce(public.platform_integrations.logo_key, excluded.logo_key),
  provider = coalesce(public.platform_integrations.provider, excluded.provider),
  runtime = coalesce(public.platform_integrations.runtime, excluded.runtime),
  metadata = coalesce(public.platform_integrations.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();

