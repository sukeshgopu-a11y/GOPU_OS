create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  module text not null,
  related_table text,
  related_record_id uuid,
  actor text,
  description text,
  old_value jsonb,
  new_value jsonb,
  risk_level text default 'Low',
  created_at timestamptz default now()
);

alter table public.audit_logs
  add column if not exists action_type text,
  add column if not exists related_table text,
  add column if not exists related_record_id uuid,
  add column if not exists actor text,
  add column if not exists description text,
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists risk_level text default 'Low',
  add column if not exists action text,
  add column if not exists actor_role text,
  add column if not exists record_type text,
  add column if not exists record_id text,
  add column if not exists notes text,
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.audit_logs
set
  action_type = coalesce(action_type, action, 'Action recorded'),
  action = coalesce(action, action_type, 'Action recorded'),
  actor = coalesce(actor, actor_role, 'GOPU OS'),
  description = coalesce(description, notes),
  related_table = coalesce(related_table, record_type),
  metadata = coalesce(metadata, '{}'::jsonb),
  risk_level = coalesce(risk_level, metadata->>'risk_level', 'Low')
where action_type is null
   or action is null
   or actor is null
   or description is null
   or related_table is null
   or metadata is null
   or risk_level is null;

alter table public.audit_logs
  alter column action_type set not null,
  alter column module set not null,
  alter column action set default 'Action recorded',
  alter column metadata set default '{}'::jsonb,
  alter column risk_level set default 'Low';

alter table public.audit_logs enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.audit_logs to authenticated;

drop policy if exists "Allow authenticated users to read audit logs" on public.audit_logs;
create policy "Allow authenticated users to read audit logs"
on public.audit_logs for select
to authenticated
using (true);

drop policy if exists "Allow authenticated users to insert audit logs" on public.audit_logs;
create policy "Allow authenticated users to insert audit logs"
on public.audit_logs for insert
to authenticated
with check (true);

create index if not exists idx_audit_logs_module
on public.audit_logs (module);

create index if not exists idx_audit_logs_action_type
on public.audit_logs (action_type);

create index if not exists idx_audit_logs_created_at
on public.audit_logs (created_at);
