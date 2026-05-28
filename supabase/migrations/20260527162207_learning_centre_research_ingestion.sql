-- Research ingestion schema for the UI module labeled "Learning Centre".
-- Internal names intentionally describe public-source research ingestion, not autonomous execution.

create extension if not exists vector;
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'executive_research_role') then
    create type public.executive_research_role as enum ('COO', 'CFO', 'CTO', 'CMO', 'CIO');
  end if;
  if not exists (select 1 from pg_type where typname = 'research_ingestion_status') then
    create type public.research_ingestion_status as enum ('idle', 'running', 'completed', 'stopped', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'research_audit_level') then
    create type public.research_audit_level as enum ('info', 'warn', 'error');
  end if;
end $$;

create table if not exists public.research_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  duration_hours integer not null default 12,
  status public.research_ingestion_status not null default 'idle',
  current_phase text,
  current_role public.executive_research_role,
  total_items_learned integer not null default 0,
  total_sources_scanned integer not null default 0,
  total_memory_saved integer not null default 0,
  total_errors integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists research_ingestion_single_active_idx
on public.research_ingestion_runs ((status))
where status = 'running';

create table if not exists public.executive_topics (
  id uuid primary key default gen_random_uuid(),
  role public.executive_research_role not null,
  topic text not null,
  priority integer not null default 1,
  last_researched_at timestamptz,
  times_researched integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role, topic)
);

create table if not exists public.research_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_ingestion_runs(id) on delete cascade,
  role public.executive_research_role not null,
  topic text not null,
  learning_summary text not null,
  key_insights jsonb not null default '[]'::jsonb,
  source_type text,
  source_url text not null,
  source_domain text,
  confidence_score numeric(5,4) not null default 0 check (confidence_score >= 0 and confidence_score <= 1),
  status text not null default 'stored',
  memory_saved boolean not null default false,
  tokens_processed integer not null default 0,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, source_url)
);

create index if not exists research_findings_run_role_created_idx
on public.research_findings(run_id, role, created_at desc);

create index if not exists research_findings_source_url_idx
on public.research_findings(source_url);

create index if not exists research_findings_embedding_hnsw_idx
on public.research_findings
using hnsw (embedding vector_cosine_ops)
where embedding is not null;

create table if not exists public.executive_knowledge (
  id uuid primary key default gen_random_uuid(),
  role public.executive_research_role not null,
  topic_cluster text not null,
  knowledge_key text not null,
  knowledge_value text not null,
  source_finding_ids jsonb not null default '[]'::jsonb,
  confidence_score numeric(5,4) not null default 0 check (confidence_score >= 0 and confidence_score <= 1),
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role, knowledge_key)
);

create index if not exists executive_knowledge_role_topic_idx
on public.executive_knowledge(role, topic_cluster);

create index if not exists executive_knowledge_embedding_hnsw_idx
on public.executive_knowledge
using hnsw (embedding vector_cosine_ops)
where embedding is not null;

create table if not exists public.executive_intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_ingestion_runs(id) on delete cascade,
  generated_at timestamptz not null default now(),
  report_markdown text not null,
  report_json jsonb not null default '{}'::jsonb
);

alter table public.audit_logs
  add column if not exists run_id uuid,
  add column if not exists step text,
  add column if not exists level public.research_audit_level,
  add column if not exists message text,
  add column if not exists payload_json jsonb not null default '{}'::jsonb;

create index if not exists audit_logs_learning_centre_run_idx
on public.audit_logs(run_id, created_at desc)
where module = 'Learning Centre';

create index if not exists audit_logs_learning_centre_level_idx
on public.audit_logs(run_id, level, created_at desc)
where module = 'Learning Centre';

insert into public.executive_topics (role, topic, priority)
values
  ('COO','logistics',5), ('COO','supply chain',5), ('COO','warehouse systems',4), ('COO','export operations',5),
  ('COO','SOPs',4), ('COO','operational scaling',4), ('COO','procurement systems',4), ('COO','workflow optimization',5),
  ('CFO','cash flow',5), ('CFO','scaling finance',4), ('CFO','margin optimization',5), ('CFO','export economics',5),
  ('CFO','budgeting',4), ('CFO','risk management',4), ('CFO','operational finance',4), ('CFO','business scaling',4),
  ('CTO','AI agents',5), ('CTO','SaaS scaling',4), ('CTO','automation systems',5), ('CTO','cloud architecture',4),
  ('CTO','security',5), ('CTO','infrastructure',4), ('CTO','orchestration',4), ('CTO','API systems',4),
  ('CMO','B2B marketing',5), ('CMO','export branding',5), ('CMO','LinkedIn growth',4), ('CMO','international trade marketing',5),
  ('CMO','content psychology',4), ('CMO','founder branding',4), ('CMO','conversion systems',5), ('CMO','social growth',4),
  ('CIO','analytics',5), ('CIO','business intelligence',5), ('CIO','dashboards',4), ('CIO','information systems',4),
  ('CIO','data organization',4), ('CIO','reporting systems',4), ('CIO','decision intelligence',5)
on conflict (role, topic) do nothing;

alter table public.research_ingestion_runs enable row level security;
alter table public.research_findings enable row level security;
alter table public.executive_knowledge enable row level security;
alter table public.executive_topics enable row level security;
alter table public.executive_intelligence_reports enable row level security;

revoke all on table public.research_ingestion_runs from anon;
revoke all on table public.research_findings from anon;
revoke all on table public.executive_knowledge from anon;
revoke all on table public.executive_topics from anon;
revoke all on table public.executive_intelligence_reports from anon;

grant select on table public.research_ingestion_runs to authenticated;
grant select on table public.research_findings to authenticated;
grant select on table public.executive_knowledge to authenticated;
grant select on table public.executive_topics to authenticated;
grant select on table public.executive_intelligence_reports to authenticated;

drop policy if exists research_ingestion_runs_select_authenticated on public.research_ingestion_runs;
create policy research_ingestion_runs_select_authenticated on public.research_ingestion_runs
  for select to authenticated using (true);

drop policy if exists research_findings_select_authenticated on public.research_findings;
create policy research_findings_select_authenticated on public.research_findings
  for select to authenticated using (true);

drop policy if exists executive_knowledge_select_authenticated on public.executive_knowledge;
create policy executive_knowledge_select_authenticated on public.executive_knowledge
  for select to authenticated using (true);

drop policy if exists executive_topics_select_authenticated on public.executive_topics;
create policy executive_topics_select_authenticated on public.executive_topics
  for select to authenticated using (true);

drop policy if exists executive_intelligence_reports_select_authenticated on public.executive_intelligence_reports;
create policy executive_intelligence_reports_select_authenticated on public.executive_intelligence_reports
  for select to authenticated using (true);
