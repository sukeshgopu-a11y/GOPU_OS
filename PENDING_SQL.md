# PENDING SQL — Run in Supabase SQL Editor

URL: https://supabase.com/dashboard/project/ogrmmhlaxfxrtpdzzwti/sql/new

---

## STEP 1 — Create Missing Core Tables

These tables are referenced by the Slack lead handler but don't exist yet.
Without them: leads don't save, COO/Director show 0, agents show "not created".

```sql
create table if not exists public.lead_intake (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source text, buyer_name text, company_name text, country text,
  email text, phone text, product text, quantity numeric, unit text,
  destination_port text, shipping_mode text, incoterm text, notes text,
  status text default 'Draft', assigned_to text,
  source_channel text, source_thread_ts text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, lead_id uuid,
  buyer_name text, product text, quantity numeric, destination text,
  incoterm text, product_cost numeric, freight_cost numeric,
  margin_target numeric, currency text default 'USD',
  status text default 'Draft', payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, title text, description text,
  workflow_source text, linked_record_id text, linked_label text,
  linked_route text, department text, owner_command text,
  assigned_to text, assigned_role text,
  priority text default 'Medium', status text default 'Pending',
  due_date text, escalation_level text, blocking_reason text,
  next_action text, buyer text, product text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, lead_id uuid, pricing_request_id uuid,
  approval_id uuid, task_id uuid, agent_name text, agent_role text,
  status text default 'Pending',
  input jsonb default '{}'::jsonb, output jsonb default '{}'::jsonb,
  error_message text, started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.integration_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, platform_key text, platform_name text,
  logo_key text, provider text, channel_display text,
  status text, runtime text, error_message text,
  last_checked_at timestamptz, metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index if not exists integration_services_tenant_platform_key_idx
  on public.integration_services(tenant_id, platform_key);

create table if not exists public.slack_event_dedup (
  event_id text primary key,
  processed_at timestamptz default now()
);
```

---

## STEP 2 — Fix founder_approvals Table (Add Missing Columns)

The founder_approvals table exists but is missing columns the Slack handler writes to.

```sql
alter table public.founder_approvals add column if not exists approval_request_id uuid;
alter table public.founder_approvals add column if not exists request_type text;
alter table public.founder_approvals add column if not exists summary text;
alter table public.founder_approvals add column if not exists source_module text;
alter table public.founder_approvals add column if not exists related_table text;
alter table public.founder_approvals add column if not exists related_record_id uuid;
alter table public.founder_approvals add column if not exists related_record text;
alter table public.founder_approvals add column if not exists buyer_name text;
alter table public.founder_approvals add column if not exists amount text;
alter table public.founder_approvals add column if not exists requested_by text;
alter table public.founder_approvals add column if not exists risk_level text default 'Medium';
alter table public.founder_approvals add column if not exists reason text;
alter table public.founder_approvals add column if not exists approval_status text default 'Pending Approval';
alter table public.founder_approvals add column if not exists whatsapp_status text default 'Pending';
alter table public.founder_approvals add column if not exists whatsapp_provider text default 'slack';
alter table public.founder_approvals add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.founder_approvals add column if not exists audit_trail jsonb default '[]'::jsonb;
alter table public.founder_approvals add column if not exists updated_at timestamptz default now();
```

---

## STEP 3 — Fix Permissions (service_role must have access)

The previous migrations only granted to `authenticated`. The Slack serverless function uses `service_role` so it also needs explicit grants.

```sql
grant select, insert, update on public.lead_intake to authenticated, service_role;
grant select, insert, update on public.pricing_requests to authenticated, service_role;
grant select, insert, update on public.tasks to authenticated, service_role;
grant select, insert, update on public.ai_agent_runs to authenticated, service_role;
grant select, insert, update on public.founder_approvals to authenticated, service_role;
grant select, insert, update on public.integration_services to authenticated, service_role;
grant select, insert, update, delete on public.slack_event_dedup to service_role;

notify pgrst, 'reload schema';
```

---

## What This Fixes After Running

| Problem | Fixed by |
|---|---|
| Slack leads not recording in COO | Step 1 — creates lead_intake + tasks tables |
| COO shows 0 workflows | Step 1 — tasks table missing |
| Director shows 0 decisions | Step 1 — ai_agent_runs table missing |
| Duplicate Slack replies | Step 1 — slack_event_dedup table (code already deployed) |
| Agent shows "not created" | Steps 1 + 3 — tables + permissions |
| founder_approvals insert errors | Step 2 — adds missing columns |

---

## After Running SQL — Test With This Slack Message

Send in #exports-command-center:
```
New lead: 10 MT Red Chilli, buyer Ahmed Trading from Dubai, need FOB quote
```

Expected result:
- Bot replies with COO + CFO agent IDs and Director approval pending
- COO Command shows 1 active workflow
- Director Command shows 1 pending decision
- No duplicate replies
