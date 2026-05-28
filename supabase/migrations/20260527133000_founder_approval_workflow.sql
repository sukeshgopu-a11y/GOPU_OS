-- Founder approval workflow alignment for sensitive operating actions.
-- Uses existing tenant-scoped RLS tables; no service-role access is required by the client.

alter table public.approvals
  alter column status set default 'Pending Approval';

update public.approvals
set status = case
  when status in ('Pending', 'Review Pending', 'Founder Review Required', 'Attention Required', 'Waiting Founder Action') then 'Pending Approval'
  when status in ('Approved for Release') then 'Approved'
  when status in ('Revision Requested', 'Escalated') then 'Needs Review'
  else status
end
where status in ('Pending', 'Review Pending', 'Founder Review Required', 'Attention Required', 'Waiting Founder Action', 'Approved for Release', 'Revision Requested', 'Escalated');

alter table public.shipments
  add column if not exists approval_status text not null default 'Approved';

alter table public.pricing_requests
  add column if not exists approval_status text not null default 'Pending Approval';

alter table public.payment_vault
  alter column approval_status set default 'Pending Approval';

update public.payment_vault
set approval_status = 'Pending Approval'
where approval_status = 'Pending';

create index if not exists shipments_tenant_approval_status_idx on public.shipments(tenant_id, approval_status);
create index if not exists pricing_requests_tenant_approval_status_idx on public.pricing_requests(tenant_id, approval_status);
create index if not exists payment_vault_tenant_approval_status_idx on public.payment_vault(tenant_id, approval_status);
