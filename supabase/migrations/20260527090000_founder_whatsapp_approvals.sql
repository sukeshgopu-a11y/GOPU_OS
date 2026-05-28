create table if not exists public.founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid unique,
  request_type text not null,
  buyer_name text,
  amount text,
  risk_level text not null default 'Medium',
  requested_by text,
  reason text,
  approval_status text not null default 'Review Pending',
  decision_note text,
  decided_at timestamptz,
  whatsapp_status text not null default 'Pending' check (whatsapp_status in ('Pending', 'Sent', 'Delivered', 'Failed')),
  whatsapp_provider text not null default 'meta-cloud-api',
  provider_message_id text,
  retry_count integer not null default 0,
  last_error text,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists founder_approvals_tenant_status_idx on public.founder_approvals(tenant_id, approval_status, whatsapp_status);
create index if not exists founder_approvals_request_idx on public.founder_approvals(approval_request_id);

alter table public.founder_approvals enable row level security;

drop policy if exists founder_approvals_select_member on public.founder_approvals;
drop policy if exists founder_approvals_insert_member on public.founder_approvals;
drop policy if exists founder_approvals_update_member on public.founder_approvals;
drop policy if exists founder_approvals_delete_admin on public.founder_approvals;

create policy founder_approvals_select_member on public.founder_approvals
  for select to authenticated
  using (app_private.can_access_table(tenant_id, 'approval_requests', 'read'));

create policy founder_approvals_insert_member on public.founder_approvals
  for insert to authenticated
  with check (app_private.can_access_table(tenant_id, 'approval_requests', 'write'));

create policy founder_approvals_update_member on public.founder_approvals
  for update to authenticated
  using (app_private.can_access_table(tenant_id, 'approval_requests', 'write'))
  with check (app_private.can_access_table(tenant_id, 'approval_requests', 'write'));

create policy founder_approvals_delete_admin on public.founder_approvals
  for delete to authenticated
  using (app_private.is_tenant_admin(tenant_id));
