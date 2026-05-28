-- Harden CTO monitoring RLS after live check setup.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'platform_health',
    'integration_services',
    'integration_audit_logs',
    'automation_queue',
    'technical_incidents'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_update', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid)',
      table_name || '_authenticated_select',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid)',
      table_name || '_authenticated_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid) with check (tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid)',
      table_name || '_authenticated_update',
      table_name
    );
  end loop;
end $$;
