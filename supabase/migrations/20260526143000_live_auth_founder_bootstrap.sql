-- GOPU Export OS live auth bootstrap.
-- Creates the production tenant and maps the founder/director account after Supabase Auth signup.
-- No service role key, card data, CVV, OTP, banking password, or raw integration secret is stored here.

create extension if not exists pgcrypto;

create schema if not exists app_private;

insert into public.tenants (id, name, slug, status)
values ('11111111-1111-1111-1111-111111111111'::uuid, 'gopu-exports', 'gopu-exports', 'active')
on conflict (id) do update
set name = excluded.name,
    status = excluded.status,
    updated_at = now();

create or replace function app_private.ensure_gopu_founder_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, app_private
as $$
begin
  if lower(new.email) = 'sukeshreddy4.g@gmail.com' then
    insert into public.tenants (id, name, slug, status)
    values ('11111111-1111-1111-1111-111111111111'::uuid, 'gopu-exports', 'gopu-exports', 'active')
    on conflict (id) do update
    set name = excluded.name,
        status = excluded.status,
        updated_at = now();

    insert into public.users (auth_user_id, email, full_name, status)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'GOPU Director'), 'active')
    on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        status = 'active',
        updated_at = now();

    insert into public.profiles (tenant_id, auth_user_id, email, full_name, role, status)
    values (
      '11111111-1111-1111-1111-111111111111'::uuid,
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', 'GOPU Director'),
      'director',
      'active'
    )
    on conflict (tenant_id, auth_user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = 'director',
        status = 'active',
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_gopu_founder_profile on auth.users;
create trigger on_auth_user_gopu_founder_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function app_private.ensure_gopu_founder_profile();

insert into public.users (auth_user_id, email, full_name, status)
select id, email, coalesce(raw_user_meta_data->>'full_name', 'GOPU Director'), 'active'
from auth.users
where lower(email) = 'sukeshreddy4.g@gmail.com'
on conflict (auth_user_id) do update
set email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    status = 'active',
    updated_at = now();

insert into public.profiles (tenant_id, auth_user_id, email, full_name, role, status)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', 'GOPU Director'),
  'director',
  'active'
from auth.users
where lower(email) = 'sukeshreddy4.g@gmail.com'
on conflict (tenant_id, auth_user_id) do update
set email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = 'director',
    status = 'active',
    updated_at = now();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','users','director_queue','tasks','workflows','approvals','pricing_requests',
    'invoices','buyers','suppliers','shipments','notifications','payment_vault',
    'billing_methods','audit_logs','content_projects','campaign_budgets','importer_records'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;
