-- GOPU OS RLS + security hardening pass.
-- Tightens existing operational tables only; no new product features.

create schema if not exists app_private;

create or replace function app_private.gopu_is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.tenant_id = target_tenant_id
      and p.auth_user_id = auth.uid()
      and p.status = 'active'
  )
  or exists (
    select 1
    from public.user_profiles up
    where up.tenant_id = target_tenant_id
      and up.auth_user_id = auth.uid()
      and up.status = 'active'
  )
$$;

create or replace function app_private.gopu_is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.tenant_id = target_tenant_id
      and p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role in ('founder','director')
  )
  or exists (
    select 1
    from public.user_profiles up
    where up.tenant_id = target_tenant_id
      and up.auth_user_id = auth.uid()
      and up.status = 'active'
      and up.role in ('founder','admin')
  )
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'shipments',
    'founder_approvals',
    'lead_intake',
    'buyer_enquiries',
    'pricing_requests',
    'quote_drafts',
    'approvals',
    'approval_requests',
    'payment_vault',
    'billing_methods',
    'payment_forecasts',
    'notifications',
    'renewals',
    'renewal_requests'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is not null
       and exists (
         select 1
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = target_table
           and c.column_name = 'tenant_id'
       ) then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('revoke all on table public.%I from anon', target_table);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', target_table);

      execute format('drop policy if exists tenant_select on public.%I', target_table);
      execute format('drop policy if exists tenant_insert on public.%I', target_table);
      execute format('drop policy if exists tenant_update on public.%I', target_table);
      execute format('drop policy if exists tenant_delete on public.%I', target_table);
      execute format('drop policy if exists gopu_secure_select on public.%I', target_table);
      execute format('drop policy if exists gopu_secure_insert on public.%I', target_table);
      execute format('drop policy if exists gopu_secure_update on public.%I', target_table);
      execute format('drop policy if exists gopu_secure_delete_admin on public.%I', target_table);

      execute format(
        'create policy gopu_secure_select on public.%I for select to authenticated using (app_private.gopu_is_tenant_member(tenant_id))',
        target_table
      );
      execute format(
        'create policy gopu_secure_insert on public.%I for insert to authenticated with check (app_private.gopu_is_tenant_member(tenant_id))',
        target_table
      );
      execute format(
        'create policy gopu_secure_update on public.%I for update to authenticated using (app_private.gopu_is_tenant_member(tenant_id)) with check (app_private.gopu_is_tenant_member(tenant_id))',
        target_table
      );
      execute format(
        'create policy gopu_secure_delete_admin on public.%I for delete to authenticated using (app_private.gopu_is_tenant_admin(tenant_id))',
        target_table
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.audit_logs') is not null
     and exists (
       select 1
       from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = 'audit_logs'
         and c.column_name = 'tenant_id'
     ) then
    alter table public.audit_logs enable row level security;
    revoke all on table public.audit_logs from anon;
    revoke update, delete on table public.audit_logs from authenticated;
    grant select, insert on table public.audit_logs to authenticated;

    drop policy if exists tenant_select on public.audit_logs;
    drop policy if exists tenant_insert on public.audit_logs;
    drop policy if exists tenant_update on public.audit_logs;
    drop policy if exists tenant_delete on public.audit_logs;
    drop policy if exists "Allow authenticated users to read audit logs" on public.audit_logs;
    drop policy if exists "Allow authenticated users to insert audit logs" on public.audit_logs;
    drop policy if exists gopu_audit_select on public.audit_logs;
    drop policy if exists gopu_audit_insert on public.audit_logs;

    create policy gopu_audit_select on public.audit_logs
      for select to authenticated
      using (app_private.gopu_is_tenant_member(tenant_id));

    create policy gopu_audit_insert on public.audit_logs
      for insert to authenticated
      with check (app_private.gopu_is_tenant_member(tenant_id));
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_receipts') is not null then
    alter table public.payment_receipts enable row level security;
    revoke all on table public.payment_receipts from anon;
    grant select, insert, update, delete on table public.payment_receipts to authenticated;

    drop policy if exists payment_receipts_select_member on public.payment_receipts;
    drop policy if exists payment_receipts_insert_member on public.payment_receipts;
    drop policy if exists payment_receipts_update_member on public.payment_receipts;
    drop policy if exists payment_receipts_delete_admin on public.payment_receipts;
    drop policy if exists gopu_payment_receipts_select on public.payment_receipts;
    drop policy if exists gopu_payment_receipts_insert on public.payment_receipts;
    drop policy if exists gopu_payment_receipts_update on public.payment_receipts;
    drop policy if exists gopu_payment_receipts_delete_admin on public.payment_receipts;

    create policy gopu_payment_receipts_select on public.payment_receipts
      for select to authenticated
      using (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_receipts.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ));

    create policy gopu_payment_receipts_insert on public.payment_receipts
      for insert to authenticated
      with check (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_receipts.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ));

    create policy gopu_payment_receipts_update on public.payment_receipts
      for update to authenticated
      using (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_receipts.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ))
      with check (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_receipts.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ));

    create policy gopu_payment_receipts_delete_admin on public.payment_receipts
      for delete to authenticated
      using (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_receipts.payment_id
          and app_private.gopu_is_tenant_admin(pv.tenant_id)
      ));
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_audit_log') is not null then
    alter table public.payment_audit_log enable row level security;
    revoke all on table public.payment_audit_log from anon;
    revoke update, delete on table public.payment_audit_log from authenticated;
    grant select, insert on table public.payment_audit_log to authenticated;

    drop policy if exists payment_audit_log_select_member on public.payment_audit_log;
    drop policy if exists payment_audit_log_insert_member on public.payment_audit_log;
    drop policy if exists payment_audit_log_update_member on public.payment_audit_log;
    drop policy if exists payment_audit_log_delete_admin on public.payment_audit_log;
    drop policy if exists gopu_payment_audit_select on public.payment_audit_log;
    drop policy if exists gopu_payment_audit_insert on public.payment_audit_log;

    create policy gopu_payment_audit_select on public.payment_audit_log
      for select to authenticated
      using (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_audit_log.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ));

    create policy gopu_payment_audit_insert on public.payment_audit_log
      for insert to authenticated
      with check (exists (
        select 1 from public.payment_vault pv
        where pv.id = payment_audit_log.payment_id
          and app_private.gopu_is_tenant_member(pv.tenant_id)
      ));
  end if;
end $$;
