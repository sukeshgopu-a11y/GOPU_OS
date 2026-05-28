-- CMO content memory archive.
-- Stores generated drafts, approval timestamps, live post links, metrics, and AI generation logs.

create extension if not exists pgcrypto;

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null check (platform in ('LinkedIn','Facebook','Instagram','YouTube','X','Blog','Email')),
  content_type text not null default 'Post',
  campaign_name text,
  region_country text,
  topic text,
  status text not null default 'Draft' check (status in ('Draft','Approved','Published','Failed')),
  generated_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  generated_text text,
  final_text text,
  hashtags text,
  post_url text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  version_number integer not null default 1,
  version_type text not null default 'generated',
  draft_text text,
  final_text text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  platform text not null,
  label text,
  url text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  platform text,
  metric_name text not null,
  metric_value numeric,
  metric_unit text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Revision Requested')),
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid references public.content_history(id) on delete set null,
  model text,
  prompt_summary text,
  output_summary text,
  token_count integer,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists content_history_tenant_generated_idx on public.content_history(tenant_id, generated_at desc);
create index if not exists content_history_tenant_platform_idx on public.content_history(tenant_id, platform);
create index if not exists content_history_tenant_status_idx on public.content_history(tenant_id, status);
create index if not exists content_versions_history_idx on public.content_versions(content_history_id);
create index if not exists content_links_history_idx on public.content_links(content_history_id);
create index if not exists content_metrics_history_idx on public.content_metrics(content_history_id);
create index if not exists content_approvals_history_idx on public.content_approvals(content_history_id);
create index if not exists ai_generation_logs_history_idx on public.ai_generation_logs(content_history_id);

drop trigger if exists set_content_history_updated_at on public.content_history;
create trigger set_content_history_updated_at
before update on public.content_history
for each row execute function public.set_updated_at();

alter table public.content_history enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_links enable row level security;
alter table public.content_metrics enable row level security;
alter table public.content_approvals enable row level security;
alter table public.ai_generation_logs enable row level security;

revoke all on table public.content_history from anon;
revoke all on table public.content_versions from anon;
revoke all on table public.content_links from anon;
revoke all on table public.content_metrics from anon;
revoke all on table public.content_approvals from anon;
revoke all on table public.ai_generation_logs from anon;

grant select on table public.content_history to authenticated;
grant select on table public.content_versions to authenticated;
grant select on table public.content_links to authenticated;
grant select on table public.content_metrics to authenticated;
grant select on table public.content_approvals to authenticated;
grant select on table public.ai_generation_logs to authenticated;

drop policy if exists content_history_select_member on public.content_history;
create policy content_history_select_member on public.content_history
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_versions_select_member on public.content_versions;
create policy content_versions_select_member on public.content_versions
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_links_select_member on public.content_links;
create policy content_links_select_member on public.content_links
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_metrics_select_member on public.content_metrics;
create policy content_metrics_select_member on public.content_metrics
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists content_approvals_select_member on public.content_approvals;
create policy content_approvals_select_member on public.content_approvals
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));

drop policy if exists ai_generation_logs_select_member on public.ai_generation_logs;
create policy ai_generation_logs_select_member on public.ai_generation_logs
  for select to authenticated
  using (app_private.gopu_is_tenant_member(tenant_id));
