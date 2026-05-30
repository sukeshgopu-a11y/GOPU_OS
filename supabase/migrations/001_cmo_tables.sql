create extension if not exists pgcrypto;

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id text,
  platform text,
  caption text,
  generated_text text,
  final_text text,
  final_approved_content text,
  image_url text,
  image_prompt text,
  approval_status text default 'pending_approval',
  publish_status text default 'not_published',
  live_post_url text,
  post_url text,
  published_at timestamptz,
  publish_attempt_count integer default 0,
  last_publish_attempt_at timestamptz,
  last_publish_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.content_history
  add column if not exists run_id text,
  add column if not exists platform text,
  add column if not exists caption text,
  add column if not exists generated_text text,
  add column if not exists final_text text,
  add column if not exists final_approved_content text,
  add column if not exists image_url text,
  add column if not exists image_prompt text,
  add column if not exists approval_status text default 'pending_approval',
  add column if not exists publish_status text default 'not_published',
  add column if not exists live_post_url text,
  add column if not exists post_url text,
  add column if not exists published_at timestamptz,
  add column if not exists publish_attempt_count integer default 0,
  add column if not exists last_publish_attempt_at timestamptz,
  add column if not exists last_publish_error text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id text,
  content_history_id uuid references public.content_history(id) on delete cascade,
  version_type text,
  platform text,
  content text,
  hashtags text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.content_versions
  add column if not exists run_id text,
  add column if not exists content_history_id uuid references public.content_history(id) on delete cascade,
  add column if not exists version_type text,
  add column if not exists platform text,
  add column if not exists content text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create table if not exists public.content_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id text,
  content_history_id uuid references public.content_history(id) on delete cascade,
  hook_quality integer,
  founder_authority integer,
  engagement_potential integer,
  trust_level integer,
  clarity integer,
  platform_optimization integer,
  overall_score integer,
  recommendation text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.content_quality_reviews
  add column if not exists run_id text,
  add column if not exists content_history_id uuid references public.content_history(id) on delete cascade,
  add column if not exists hook_quality integer,
  add column if not exists founder_authority integer,
  add column if not exists engagement_potential integer,
  add column if not exists trust_level integer,
  add column if not exists clarity integer,
  add column if not exists platform_optimization integer,
  add column if not exists overall_score integer,
  add column if not exists recommendation text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create table if not exists public.cmo_posting_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null,
  timezone text default 'Asia/Kolkata',
  local_post_time text default '09:00',
  schedule_mode text default 'every_day',
  schedule_days jsonb default '[]'::jsonb,
  trigger_window_minutes integer default 10,
  platform_integration_connected boolean default false,
  approval_required boolean default true,
  last_triggered_at_utc timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cmo_posting_settings
  add column if not exists platform text,
  add column if not exists timezone text default 'Asia/Kolkata',
  add column if not exists local_post_time text default '09:00',
  add column if not exists schedule_mode text default 'every_day',
  add column if not exists schedule_days jsonb default '[]'::jsonb,
  add column if not exists trigger_window_minutes integer default 10,
  add column if not exists platform_integration_connected boolean default false,
  add column if not exists approval_required boolean default true,
  add column if not exists last_triggered_at_utc timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists cmo_posting_settings_tenant_platform_unique
  on public.cmo_posting_settings(tenant_id, platform);

create table if not exists public.cmo_schedule_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  posting_setting_id uuid references public.cmo_posting_settings(id) on delete set null,
  platform text,
  timezone text,
  local_day text,
  local_time text,
  due_at_utc timestamptz,
  triggered_at_utc timestamptz,
  status text default 'queued',
  trigger_source text default 'vercel_cron',
  created_at timestamptz default now()
);

create table if not exists public.cmo_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text,
  goal_type text,
  target_value integer,
  current_value integer default 0,
  action text,
  status text default 'pending_budget',
  budget_requested numeric,
  budget_allocated numeric,
  budget_spent numeric default 0,
  slack_channel text,
  slack_thread_ts text,
  slack_user_id text,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid,
  from_agent text,
  to_agent text,
  message_type text,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  processed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.cfo_wallet (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  balance numeric default 1000.00,
  auto_topup_threshold numeric default 100.00,
  auto_topup_amount numeric default 500.00,
  transactions jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  action_type text,
  action text,
  module text,
  related_table text,
  related_record_id uuid,
  record_type text,
  record_id uuid,
  actor text,
  actor_role text,
  description text,
  notes text,
  risk_level text default 'Low',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs
  add column if not exists action_type text,
  add column if not exists action text,
  add column if not exists module text,
  add column if not exists related_table text,
  add column if not exists related_record_id uuid,
  add column if not exists record_type text,
  add column if not exists record_id uuid,
  add column if not exists actor text,
  add column if not exists actor_role text,
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists risk_level text default 'Low',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  platform text,
  platform_key text unique,
  platform_name text,
  logo_key text,
  provider text,
  status text,
  runtime text,
  error_message text,
  last_sync_at timestamptz,
  last_checked_at timestamptz,
  config jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.platform_integrations
  add column if not exists platform text,
  add column if not exists platform_key text,
  add column if not exists platform_name text,
  add column if not exists logo_key text,
  add column if not exists provider text,
  add column if not exists status text,
  add column if not exists runtime text,
  add column if not exists error_message text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists config jsonb default '{}'::jsonb,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create unique index if not exists platform_integrations_platform_key_unique
  on public.platform_integrations(platform_key);

create table if not exists public.founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text,
  amount text,
  status text default 'Pending Approval',
  created_at timestamptz default now()
);

alter table public.founder_approvals
  add column if not exists title text,
  add column if not exists amount text,
  add column if not exists status text default 'Pending Approval',
  add column if not exists created_at timestamptz default now();

create index if not exists content_history_publish_queue_idx
  on public.content_history(tenant_id, approval_status, publish_status, updated_at);
create index if not exists content_versions_history_platform_idx
  on public.content_versions(content_history_id, platform, created_at desc);
create index if not exists content_quality_reviews_history_idx
  on public.content_quality_reviews(content_history_id, created_at desc);
create index if not exists cmo_schedule_triggers_due_idx
  on public.cmo_schedule_triggers(tenant_id, status, due_at_utc);

alter table public.content_history enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_quality_reviews enable row level security;
alter table public.cmo_posting_settings enable row level security;
alter table public.cmo_schedule_triggers enable row level security;
alter table public.cmo_campaigns enable row level security;
alter table public.agent_messages enable row level security;
alter table public.cfo_wallet enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.founder_approvals enable row level security;

grant select, insert, update on public.content_history to authenticated, service_role;
grant select, insert, update on public.content_versions to authenticated, service_role;
grant select, insert, update on public.content_quality_reviews to authenticated, service_role;
grant select, insert, update on public.cmo_posting_settings to authenticated, service_role;
grant select, insert, update on public.cmo_schedule_triggers to authenticated, service_role;
grant select, insert, update on public.cmo_campaigns to authenticated, service_role;
grant select, insert, update on public.agent_messages to authenticated, service_role;
grant select, insert, update on public.cfo_wallet to authenticated, service_role;
grant select, insert, update on public.audit_logs to authenticated, service_role;
grant select, insert, update on public.platform_integrations to authenticated, service_role;
grant select, insert, update on public.founder_approvals to authenticated, service_role;

insert into public.cmo_posting_settings (
  tenant_id,
  platform,
  timezone,
  local_post_time,
  schedule_mode,
  platform_integration_connected
)
values
  ('11111111-1111-1111-1111-111111111111', 'LinkedIn', 'Asia/Kolkata', '09:00', 'every_day', false),
  ('11111111-1111-1111-1111-111111111111', 'Instagram', 'Asia/Kolkata', '09:00', 'every_day', false),
  ('11111111-1111-1111-1111-111111111111', 'Facebook', 'Asia/Kolkata', '09:00', 'every_day', false)
on conflict (tenant_id, platform) do update
set timezone = excluded.timezone,
    local_post_time = excluded.local_post_time,
    schedule_mode = excluded.schedule_mode,
    platform_integration_connected = coalesce(public.cmo_posting_settings.platform_integration_connected, excluded.platform_integration_connected),
    updated_at = now();

notify pgrst, 'reload schema';
