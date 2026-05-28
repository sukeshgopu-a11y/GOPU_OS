create extension if not exists pgcrypto;

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id text not null,
  platform text not null default 'LinkedIn',
  content_type text not null default 'Post',
  topic text,
  caption text,
  generated_text text,
  final_text text,
  approval_status text not null default 'pending_approval',
  publish_status text not null default 'not_published',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_history
  add column if not exists run_id text,
  add column if not exists platform text not null default 'LinkedIn',
  add column if not exists content_type text not null default 'Post',
  add column if not exists topic text,
  add column if not exists caption text,
  add column if not exists generated_text text,
  add column if not exists final_text text,
  add column if not exists approval_status text not null default 'pending_approval',
  add column if not exists publish_status text not null default 'not_published',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid not null references public.content_history(id) on delete cascade,
  run_id text,
  version_number integer not null default 1,
  version_type text not null default 'generated',
  hashtags jsonb not null default '[]'::jsonb,
  draft_text text,
  final_text text,
  approval_status text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.content_versions
  add column if not exists run_id text,
  add column if not exists version_number integer not null default 1,
  add column if not exists version_type text not null default 'generated',
  add column if not exists hashtags jsonb not null default '[]'::jsonb,
  add column if not exists draft_text text,
  add column if not exists final_text text,
  add column if not exists approval_status text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.content_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid references public.content_history(id) on delete cascade,
  run_id text,
  model text not null default 'gpt-5.5',
  mode text not null default 'premium',
  improvement_type text not null default 'quality_review',
  reviewed_content text,
  improved_content text,
  premium_rewrite text,
  selected_final_version text not null default 'improved',
  ai_suggestions jsonb not null default '[]'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  founder_approval_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_content_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid references public.content_history(id) on delete cascade,
  review_id uuid references public.content_quality_reviews(id) on delete cascade,
  run_id text,
  score_name text not null,
  score_value integer not null check (score_value >= 0 and score_value <= 100),
  model text not null default 'gpt-5.5',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_rewrite_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid references public.content_history(id) on delete cascade,
  review_id uuid references public.content_quality_reviews(id) on delete set null,
  run_id text,
  rewrite_type text not null default 'quality_review',
  original_text text,
  rewritten_text text,
  premium_text text,
  selected_final boolean not null default false,
  model text not null default 'gpt-5.5',
  founder_approval_required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists content_quality_reviews_history_idx
on public.content_quality_reviews(content_history_id, created_at desc);

create index if not exists content_history_tenant_created_idx
on public.content_history(tenant_id, created_at desc);

create index if not exists content_versions_history_idx
on public.content_versions(content_history_id, created_at desc);

create index if not exists content_quality_reviews_tenant_idx
on public.content_quality_reviews(tenant_id, created_at desc);

create index if not exists ai_content_scores_review_idx
on public.ai_content_scores(review_id);

create index if not exists ai_content_scores_history_idx
on public.ai_content_scores(content_history_id);

create index if not exists ai_rewrite_history_review_idx
on public.ai_rewrite_history(review_id);

create index if not exists ai_rewrite_history_history_idx
on public.ai_rewrite_history(content_history_id);

alter table public.content_quality_reviews enable row level security;
alter table public.content_history enable row level security;
alter table public.content_versions enable row level security;
alter table public.ai_content_scores enable row level security;
alter table public.ai_rewrite_history enable row level security;

revoke all on table public.content_history from anon;
revoke all on table public.content_versions from anon;
revoke all on table public.content_quality_reviews from anon;
revoke all on table public.ai_content_scores from anon;
revoke all on table public.ai_rewrite_history from anon;

grant select, insert, update on table public.content_history to authenticated;
grant select, insert, update on table public.content_versions to authenticated;
grant select, insert, update on table public.content_quality_reviews to authenticated;
grant select, insert, update on table public.ai_content_scores to authenticated;
grant select, insert, update on table public.ai_rewrite_history to authenticated;

drop policy if exists content_history_select_member on public.content_history;
create policy content_history_select_member on public.content_history
for select to authenticated using (true);

drop policy if exists content_history_insert_member on public.content_history;
create policy content_history_insert_member on public.content_history
for insert to authenticated with check (true);

drop policy if exists content_history_update_member on public.content_history;
create policy content_history_update_member on public.content_history
for update to authenticated using (true) with check (true);

drop policy if exists content_versions_select_member on public.content_versions;
create policy content_versions_select_member on public.content_versions
for select to authenticated using (true);

drop policy if exists content_versions_insert_member on public.content_versions;
create policy content_versions_insert_member on public.content_versions
for insert to authenticated with check (true);

drop policy if exists content_quality_reviews_select_member on public.content_quality_reviews;
create policy content_quality_reviews_select_member on public.content_quality_reviews
for select to authenticated using (true);

drop policy if exists content_quality_reviews_insert_member on public.content_quality_reviews;
create policy content_quality_reviews_insert_member on public.content_quality_reviews
for insert to authenticated with check (true);

drop policy if exists content_quality_reviews_update_member on public.content_quality_reviews;
create policy content_quality_reviews_update_member on public.content_quality_reviews
for update to authenticated using (true) with check (true);

drop policy if exists ai_content_scores_select_member on public.ai_content_scores;
create policy ai_content_scores_select_member on public.ai_content_scores
for select to authenticated using (true);

drop policy if exists ai_content_scores_insert_member on public.ai_content_scores;
create policy ai_content_scores_insert_member on public.ai_content_scores
for insert to authenticated with check (true);

drop policy if exists ai_rewrite_history_select_member on public.ai_rewrite_history;
create policy ai_rewrite_history_select_member on public.ai_rewrite_history
for select to authenticated using (true);

drop policy if exists ai_rewrite_history_insert_member on public.ai_rewrite_history;
create policy ai_rewrite_history_insert_member on public.ai_rewrite_history
for insert to authenticated with check (true);
