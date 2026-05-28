alter table public.platform_integrations
  add column if not exists provider text,
  add column if not exists runtime text,
  add column if not exists last_checked_at timestamptz;

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
set
  platform_name = excluded.platform_name,
  logo_key = excluded.logo_key,
  provider = excluded.provider,
  runtime = excluded.runtime,
  metadata = public.platform_integrations.metadata || excluded.metadata,
  updated_at = now();

create index if not exists idx_platform_integrations_runtime
on public.platform_integrations (runtime, status);
