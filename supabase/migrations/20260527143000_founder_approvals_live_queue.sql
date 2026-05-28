-- Live founder approval queue for sensitive GOPU OS actions.
-- This keeps the requested founder_approvals shape, with tenant ownership
-- and tenant-scoped RLS instead of broad authenticated access.

create table if not exists public.founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid unique,
  request_type text not null,
  title text,
  summary text,
  source_module text,
  related_table text,
  related_record_id uuid,
  related_record text,
  buyer_name text,
  amount text,
  requested_by text,
  risk_level text not null default 'Medium',
  reason text,
  status text not null default 'Pending Approval',
  approval_status text not null default 'Pending Approval',
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  whatsapp_status text not null default 'Pending' check (whatsapp_status in ('Pending', 'Sent', 'Delivered', 'Failed')),
  whatsapp_provider text not null default 'meta-cloud-api',
  provider_message_id text,
  retry_count integer not null default 0,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.founder_approvals
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists approval_request_id uuid unique,
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists source_module text,
  add column if not exists related_table text,
  add column if not exists related_record_id uuid,
  add column if not exists related_record text,
  add column if not exists buyer_name text,
  add column if not exists amount text,
  add column if not exists status text not null default 'Pending Approval',
  add column if not exists approval_status text not null default 'Pending Approval',
  add column if not exists decided_by text,
  add column if not exists whatsapp_status text not null default 'Pending',
  add column if not exists whatsapp_provider text not null default 'meta-cloud-api',
  add column if not exists provider_message_id text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

update public.founder_approvals
set
  status = coalesce(nullif(status, ''), nullif(approval_status, ''), 'Pending Approval'),
  approval_status = coalesce(nullif(approval_status, ''), nullif(status, ''), 'Pending Approval');

alter table public.founder_approvals enable row level security;

drop policy if exists "Allow authenticated users to read founder approvals" on public.founder_approvals;
drop policy if exists "Allow authenticated users to insert founder approvals" on public.founder_approvals;
drop policy if exists "Allow authenticated users to update founder approvals" on public.founder_approvals;
drop policy if exists founder_approvals_select_member on public.founder_approvals;
drop policy if exists founder_approvals_insert_member on public.founder_approvals;
drop policy if exists founder_approvals_update_member on public.founder_approvals;
drop policy if exists founder_approvals_delete_admin on public.founder_approvals;

create policy founder_approvals_select_member on public.founder_approvals
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.tenant_id = founder_approvals.tenant_id
        and p.status = 'active'
    )
  );

create policy founder_approvals_insert_member on public.founder_approvals
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.tenant_id = founder_approvals.tenant_id
        and p.status = 'active'
    )
  );

create policy founder_approvals_update_member on public.founder_approvals
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.tenant_id = founder_approvals.tenant_id
        and p.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.auth_user_id = (select auth.uid())
        and p.tenant_id = founder_approvals.tenant_id
        and p.status = 'active'
    )
  );

create index if not exists idx_founder_approvals_status
  on public.founder_approvals (status);

create index if not exists idx_founder_approvals_risk
  on public.founder_approvals (risk_level);

create index if not exists founder_approvals_tenant_status_idx
  on public.founder_approvals (tenant_id, status, approval_status, whatsapp_status);

create index if not exists founder_approvals_request_idx
  on public.founder_approvals (approval_request_id);

grant select, insert, update on public.founder_approvals to authenticated;
