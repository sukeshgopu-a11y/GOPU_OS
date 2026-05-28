-- CTO live monitoring final check foundation.
-- Public anon access is read-only and limited to the demo tenant rows used by the CTO screen.

create extension if not exists pgcrypto;

insert into public.tenants (id, name, slug, status)
values ('11111111-1111-1111-1111-111111111111', 'GOPU Exports Demo', 'gopu-demo', 'active')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    status = excluded.status;

create table if not exists public.platform_health (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text,
  system_name text,
  status text not null default 'Monitoring',
  metric text,
  note text,
  last_checked text,
  last_checked_at timestamptz not null default now(),
  incident_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_services (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_name text not null,
  environment text,
  masked_key text,
  status text not null default 'Verification Pending',
  usage_percentage numeric not null default 0,
  quota_remaining text,
  last_verified text,
  health_status text,
  request_volume text,
  last_request text,
  estimated_exhaustion text,
  connection_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_services_no_raw_secret check (
    masked_key is null or masked_key like '%****%' or masked_key in ('Not configured', 'anon_****configured', 'anon_****pending', 'anon_****missing')
  )
);

create table if not exists public.integration_audit_logs (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id text references public.integration_services(id) on delete cascade,
  actor text,
  action text,
  environment text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_queue (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text not null,
  queue_status text not null default 'Monitoring',
  last_run text,
  last_execution timestamptz,
  failure_count integer not null default 0,
  retry_status text,
  retry_state text,
  owner text,
  status text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.technical_incidents (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  incident_title text,
  severity text not null default 'Medium',
  affected_module text,
  business_impact text,
  impact text,
  owner text,
  escalation_target text,
  next_action text,
  action text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_health enable row level security;
alter table public.integration_services enable row level security;
alter table public.integration_audit_logs enable row level security;
alter table public.automation_queue enable row level security;
alter table public.technical_incidents enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.platform_health, public.integration_services, public.integration_audit_logs, public.automation_queue, public.technical_incidents to anon, authenticated;
grant insert, update, delete on public.platform_health, public.integration_services, public.integration_audit_logs, public.automation_queue, public.technical_incidents to authenticated;

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
    execute format('drop policy if exists %I on public.%I', table_name || '_demo_anon_select', table_name);
    execute format(
      'create policy %I on public.%I for select to anon using (tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid)',
      table_name || '_demo_anon_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      table_name || '_authenticated_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      table_name || '_authenticated_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      table_name || '_authenticated_update',
      table_name
    );
  end loop;
end $$;

insert into public.platform_health (id, tenant_id, name, system_name, status, metric, note, last_checked, last_checked_at, incident_count)
values
  ('platform-health-website', '11111111-1111-1111-1111-111111111111', 'Website', 'Website', 'Online', 'Live route', 'Frontend route responding through Vite/build.', 'Now', now(), 0),
  ('platform-health-database', '11111111-1111-1111-1111-111111111111', 'Database', 'Database', 'Online', 'Supabase Data API', 'CTO final check uses this table for live verification.', 'Now', now(), 0),
  ('platform-health-api-layer', '11111111-1111-1111-1111-111111111111', 'API Layer', 'API Layer', 'Monitoring', 'Read-only demo tenant', 'Public anon reads are limited to demo CTO monitoring rows.', 'Now', now(), 0),
  ('platform-health-automation', '11111111-1111-1111-1111-111111111111', 'Automations', 'Automations', 'Attention', 'Queue review', 'Automation queue remains controlled until external runners are connected.', 'Now', now(), 1),
  ('platform-health-director', '11111111-1111-1111-1111-111111111111', 'Director Queue', 'Director Queue', 'Online', 'Operational queue', 'Director decisions route through the central command layer.', 'Now', now(), 0)
on conflict (id) do update
set status = excluded.status,
    metric = excluded.metric,
    note = excluded.note,
    last_checked = excluded.last_checked,
    last_checked_at = excluded.last_checked_at,
    incident_count = excluded.incident_count,
    updated_at = now();

insert into public.integration_services (id, tenant_id, service_name, environment, masked_key, status, usage_percentage, quota_remaining, last_verified, health_status, request_volume, last_request, estimated_exhaustion, connection_message)
values
  ('supabase', '11111111-1111-1111-1111-111111111111', 'Supabase', 'Project fqepkwnjdlmauskofafd', 'anon_****configured', 'Live Connected', 46, 'Live Data API responding', to_char(now(), 'YYYY-MM-DD HH24:MI'), 'Healthy', 'Live query verified', 'Just checked', 'Stable', 'CTO final check verified Supabase Data API.'),
  ('openai', '11111111-1111-1111-1111-111111111111', 'OpenAI', 'Production', 'sk-proj-****pending', 'Monitoring', 82, 'Credits require CTO/CFO watch', 'Pending live key verification', 'Attention', 'Usage monitored by CTO', 'Awaiting live billing feed', 'Review needed', 'Live OpenAI key is not stored in frontend.'),
  ('whatsapp', '11111111-1111-1111-1111-111111111111', 'WhatsApp', 'Operations Messaging', 'wa_****pending', 'Webhook Pending', 0, 'Daily briefings and updates use WhatsApp after webhook setup', 'Pending webhook setup', 'Monitoring', 'No live sends from frontend', 'Not connected', 'N/A', 'Prepared for daily briefing/update flow only.'),
  ('slack', '11111111-1111-1111-1111-111111111111', 'Slack', 'Internal Operations', 'xoxb_****pending', 'Setup Required', 0, 'Internal alerts and non-daily operational messages use Slack', 'Pending workspace setup', 'Monitoring', 'No internal alerts connected', 'Not connected', 'N/A', 'Prepared for internal workflow alerts.')
on conflict (id) do update
set status = excluded.status,
    quota_remaining = excluded.quota_remaining,
    last_verified = excluded.last_verified,
    health_status = excluded.health_status,
    request_volume = excluded.request_volume,
    last_request = excluded.last_request,
    estimated_exhaustion = excluded.estimated_exhaustion,
    connection_message = excluded.connection_message,
    updated_at = now();

insert into public.integration_audit_logs (id, tenant_id, integration_id, actor, action, environment, status, created_at)
values
  ('int-audit-supabase-live', '11111111-1111-1111-1111-111111111111', 'supabase', 'CTO Command', 'Supabase Data API final check', 'Project fqepkwnjdlmauskofafd', 'Live Connected', now()),
  ('int-audit-whatsapp-rule', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'CTO Command', 'Daily briefing/update channel rule prepared', 'Operations Messaging', 'Webhook Pending', now()),
  ('int-audit-slack-rule', '11111111-1111-1111-1111-111111111111', 'slack', 'CTO Command', 'Internal alert channel rule prepared', 'Internal Operations', 'Setup Required', now())
on conflict (id) do update
set status = excluded.status,
    created_at = excluded.created_at;

insert into public.automation_queue (id, tenant_id, workflow_name, queue_status, last_run, last_execution, failure_count, retry_status, retry_state, owner, status, note)
values
  ('automation-director-sync', '11111111-1111-1111-1111-111111111111', 'Director queue sync', 'Monitoring', 'Now', now(), 0, 'Ready', 'Monitoring', 'CTO Command', 'Monitoring', 'Supabase-backed CTO final check is active.'),
  ('automation-whatsapp-briefing', '11111111-1111-1111-1111-111111111111', 'WhatsApp daily briefing/update workflow', 'Webhook Pending', 'Pending setup', null, 0, 'Pending webhook', 'Setup Required', 'CTO + Director', 'Monitoring', 'Daily briefing and daily update will use WhatsApp after webhook connection.'),
  ('automation-slack-alerts', '11111111-1111-1111-1111-111111111111', 'Slack internal alert workflow', 'Setup Required', 'Pending setup', null, 0, 'Pending workspace token', 'Setup Required', 'CTO Command', 'Monitoring', 'All non-daily internal alerts route to Slack after connector setup.')
on conflict (id) do update
set queue_status = excluded.queue_status,
    retry_status = excluded.retry_status,
    retry_state = excluded.retry_state,
    note = excluded.note,
    updated_at = now();

insert into public.technical_incidents (id, tenant_id, title, incident_title, severity, affected_module, business_impact, impact, owner, escalation_target, next_action, action, status)
values
  ('incident-whatsapp-webhook', '11111111-1111-1111-1111-111111111111', 'WhatsApp webhook pending', 'WhatsApp webhook pending', 'High', 'Daily briefing/update channel', 'Daily briefings and updates cannot sync externally until webhook is configured.', 'Founder updates remain in-app until webhook setup.', 'CTO Command', 'Director if daily briefing is required live', 'Connect WhatsApp webhook and verify inbound action sync.', 'Connect webhook', 'Attention'),
  ('incident-slack-workspace', '11111111-1111-1111-1111-111111111111', 'Slack workspace setup pending', 'Slack workspace setup pending', 'Medium', 'Internal alert routing', 'Non-daily internal alerts remain in-app until Slack is connected.', 'Slack alerts not live yet.', 'CTO Command', 'Director if internal alert routing is required', 'Connect Slack workspace token and test internal alert routing.', 'Connect Slack', 'Monitoring')
on conflict (id) do update
set severity = excluded.severity,
    business_impact = excluded.business_impact,
    next_action = excluded.next_action,
    status = excluded.status,
    updated_at = now();
