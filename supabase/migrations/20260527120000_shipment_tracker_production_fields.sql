-- Shipment Tracker production field alignment.
-- Keeps existing shipment_code/product payload compatibility while adding explicit
-- operational columns used by the GOPU OS Shipment Tracker UI.

alter table public.shipments
  add column if not exists shipment_reference text,
  add column if not exists buyer_company text,
  add column if not exists product_name text,
  add column if not exists origin text,
  add column if not exists etd date,
  add column if not exists logistics_notes text,
  add column if not exists next_action text;

update public.shipments
set shipment_reference = coalesce(shipment_reference, shipment_code),
    product_name = coalesce(product_name, product),
    origin = coalesce(origin, payload->>'origin'),
    etd = coalesce(etd, nullif(payload->>'etd', '')::date),
    logistics_notes = coalesce(logistics_notes, payload->>'logistics_notes'),
    next_action = coalesce(next_action, payload->>'next_action')
where shipment_reference is null
   or product_name is null
   or origin is null
   or etd is null
   or logistics_notes is null
   or next_action is null;

create index if not exists shipments_tenant_reference_idx on public.shipments(tenant_id, shipment_reference);
create index if not exists shipments_tenant_stage_idx on public.shipments(tenant_id, current_stage);
