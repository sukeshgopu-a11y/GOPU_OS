alter table public.shipments
  add column if not exists product_name text,
  add column if not exists origin text,
  add column if not exists etd date;

update public.shipments
set product_name = coalesce(
  nullif(product_name, ''),
  nullif(product, ''),
  nullif(payload->>'product_name', ''),
  nullif(payload->>'product', ''),
  'Awaiting Sync'
)
where product_name is null or product_name = '';

update public.shipments
set origin = coalesce(nullif(origin, ''), nullif(payload->>'origin', ''))
where origin is null or origin = '';

update public.shipments
set etd = coalesce(etd, nullif(payload->>'etd', '')::date)
where etd is null
  and nullif(payload->>'etd', '') is not null
  and (payload->>'etd') ~ '^\d{4}-\d{2}-\d{2}$';

alter table public.shipments
  alter column product_name set not null;
