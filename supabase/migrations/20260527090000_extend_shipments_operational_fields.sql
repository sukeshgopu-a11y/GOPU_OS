-- Extend live shipments for COO shipment workflow fields.
-- Keeps tenant-aware table design and existing RLS policies.

create extension if not exists pgcrypto;

alter table public.shipments
  add column if not exists shipment_reference text,
  add column if not exists buyer_company text,
  add column if not exists logistics_notes text,
  add column if not exists next_action text;

update public.shipments
set shipment_reference = coalesce(nullif(shipment_reference, ''), nullif(shipment_code, ''), 'SHP-' || left(id::text, 8))
where shipment_reference is null or shipment_reference = '';

update public.shipments
set buyer_company = coalesce(nullif(buyer_company, ''), payload->>'buyer_company', payload->>'buyer_name', 'Awaiting Sync')
where buyer_company is null or buyer_company = '';

update public.shipments
set product = coalesce(nullif(product, ''), payload->>'product_name', payload->>'product', 'Awaiting Sync')
where product is null or product = '';

update public.shipments
set quantity = coalesce(nullif(quantity, ''), payload->>'quantity', 'Awaiting Sync')
where quantity is null or quantity = '';

update public.shipments
set current_stage = coalesce(nullif(current_stage, ''), 'Order Confirmed')
where current_stage is null or current_stage = '';

update public.shipments
set status = coalesce(nullif(status, ''), 'Active')
where status is null or status = '';

alter table public.shipments
  alter column shipment_reference set not null,
  alter column buyer_company set not null,
  alter column product set not null,
  alter column quantity set not null,
  alter column current_stage set not null,
  alter column current_stage set default 'Order Confirmed',
  alter column status set default 'Active';

create unique index if not exists idx_shipments_reference on public.shipments (shipment_reference);
create index if not exists idx_shipments_status on public.shipments (status);
create index if not exists idx_shipments_stage on public.shipments (current_stage);

alter table public.shipments enable row level security;

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();
