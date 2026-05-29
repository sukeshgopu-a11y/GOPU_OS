-- AI auto-agent workflow logs for Slack lead routing.
-- AI agents prepare work; Director/Founder approval remains manual.

create extension if not exists pgcrypto;

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid,
  pricing_request_id uuid,
  approval_id uuid,
  task_id uuid,
  agent_name text not null,
  agent_role text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Processing', 'Completed', 'Needs Review', 'Failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_agent_runs
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists lead_id uuid,
  add column if not exists pricing_request_id uuid,
  add column if not exists approval_id uuid,
  add column if not exists task_id uuid,
  add column if not exists agent_name text,
  add column if not exists agent_role text,
  add column if not exists status text not null default 'Pending',
  add column if not exists input jsonb not null default '{}'::jsonb,
  add column if not exists output jsonb not null default '{}'::jsonb,
  add column if not exists error_message text,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.lead_intake
  add column if not exists source_channel text,
  add column if not exists source_thread_ts text;

alter table public.tasks
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists assigned_role text,
  add column if not exists linked_label text,
  add column if not exists linked_route text,
  alter column status set default 'Pending';

create index if not exists ai_agent_runs_lead_agent_idx
  on public.ai_agent_runs(tenant_id, lead_id, agent_name);

create index if not exists ai_agent_runs_status_idx
  on public.ai_agent_runs(tenant_id, status);

create index if not exists ai_agent_runs_task_idx
  on public.ai_agent_runs(task_id);

alter table public.ai_agent_runs enable row level security;

grant select, insert, update on public.ai_agent_runs to authenticated;
grant select, insert, update, delete on public.ai_agent_runs to service_role;

notify pgrst, 'reload schema';
