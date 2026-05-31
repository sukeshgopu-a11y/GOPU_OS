-- Safe performance indexes for dashboard, C-suite, CMO, and Slack lead pipeline reads.
-- Data is not modified. Each index is created only when its table and columns exist.

create or replace function public.gopu_create_index_if_columns(
  index_name text,
  p_table_name text,
  column_names text[],
  index_sql text
) returns void
language plpgsql
as $$
declare
  existing_count integer;
begin
  if to_regclass('public.' || p_table_name) is null then
    return;
  end if;

  select count(*)
    into existing_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = p_table_name
    and column_name = any(column_names);

  if existing_count = array_length(column_names, 1) then
    execute index_sql;
  end if;
end;
$$;

select public.gopu_create_index_if_columns('idx_founder_approvals_tenant_created', 'founder_approvals', array['tenant_id','created_at'],
  'create index if not exists idx_founder_approvals_tenant_created on public.founder_approvals (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_founder_approvals_tenant_status_created', 'founder_approvals', array['tenant_id','status','created_at'],
  'create index if not exists idx_founder_approvals_tenant_status_created on public.founder_approvals (tenant_id, status, created_at desc)');
select public.gopu_create_index_if_columns('idx_founder_approvals_tenant_approval_status_created', 'founder_approvals', array['tenant_id','approval_status','created_at'],
  'create index if not exists idx_founder_approvals_tenant_approval_status_created on public.founder_approvals (tenant_id, approval_status, created_at desc)');

select public.gopu_create_index_if_columns('idx_tasks_tenant_created', 'tasks', array['tenant_id','created_at'],
  'create index if not exists idx_tasks_tenant_created on public.tasks (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_tasks_tenant_status_created', 'tasks', array['tenant_id','status','created_at'],
  'create index if not exists idx_tasks_tenant_status_created on public.tasks (tenant_id, status, created_at desc)');
select public.gopu_create_index_if_columns('idx_tasks_tenant_due_status', 'tasks', array['tenant_id','due_date','status'],
  'create index if not exists idx_tasks_tenant_due_status on public.tasks (tenant_id, due_date, status)');
select public.gopu_create_index_if_columns('idx_tasks_tenant_workflow_source', 'tasks', array['tenant_id','workflow_source'],
  'create index if not exists idx_tasks_tenant_workflow_source on public.tasks (tenant_id, workflow_source)');

select public.gopu_create_index_if_columns('idx_agent_messages_tenant_to_role_created', 'agent_messages', array['tenant_id','to_role','created_at'],
  'create index if not exists idx_agent_messages_tenant_to_role_created on public.agent_messages (tenant_id, to_role, created_at desc)');
select public.gopu_create_index_if_columns('idx_agent_messages_tenant_from_role_created', 'agent_messages', array['tenant_id','from_role','created_at'],
  'create index if not exists idx_agent_messages_tenant_from_role_created on public.agent_messages (tenant_id, from_role, created_at desc)');

select public.gopu_create_index_if_columns('idx_executive_knowledge_role_confidence', 'executive_knowledge', array['role','confidence_score'],
  'create index if not exists idx_executive_knowledge_role_confidence on public.executive_knowledge (role, confidence_score desc)');
select public.gopu_create_index_if_columns('idx_executive_knowledge_updated', 'executive_knowledge', array['updated_at'],
  'create index if not exists idx_executive_knowledge_updated on public.executive_knowledge (updated_at desc)');

select public.gopu_create_index_if_columns('idx_payments_tenant_paid_at', 'payments', array['tenant_id','paid_at'],
  'create index if not exists idx_payments_tenant_paid_at on public.payments (tenant_id, paid_at desc)');
select public.gopu_create_index_if_columns('idx_payments_tenant_created', 'payments', array['tenant_id','created_at'],
  'create index if not exists idx_payments_tenant_created on public.payments (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_payments_tenant_status_paid', 'payments', array['tenant_id','status','paid_at'],
  'create index if not exists idx_payments_tenant_status_paid on public.payments (tenant_id, status, paid_at desc)');
select public.gopu_create_index_if_columns('idx_payments_tenant_vendor_paid', 'payments', array['tenant_id','vendor','paid_at'],
  'create index if not exists idx_payments_tenant_vendor_paid on public.payments (tenant_id, vendor, paid_at desc)');

select public.gopu_create_index_if_columns('idx_lead_intake_tenant_created', 'lead_intake', array['tenant_id','created_at'],
  'create index if not exists idx_lead_intake_tenant_created on public.lead_intake (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_lead_intake_tenant_status_created', 'lead_intake', array['tenant_id','status','created_at'],
  'create index if not exists idx_lead_intake_tenant_status_created on public.lead_intake (tenant_id, status, created_at desc)');

select public.gopu_create_index_if_columns('idx_marketing_campaigns_tenant_created', 'marketing_campaigns', array['tenant_id','created_at'],
  'create index if not exists idx_marketing_campaigns_tenant_created on public.marketing_campaigns (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_campaign_budgets_tenant_created', 'campaign_budgets', array['tenant_id','created_at'],
  'create index if not exists idx_campaign_budgets_tenant_created on public.campaign_budgets (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_campaign_metrics_tenant_created', 'campaign_metrics', array['tenant_id','created_at'],
  'create index if not exists idx_campaign_metrics_tenant_created on public.campaign_metrics (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_campaign_leads_tenant_created', 'campaign_leads', array['tenant_id','created_at'],
  'create index if not exists idx_campaign_leads_tenant_created on public.campaign_leads (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_campaign_schedule_tenant_scheduled', 'campaign_schedule', array['tenant_id','scheduled_at'],
  'create index if not exists idx_campaign_schedule_tenant_scheduled on public.campaign_schedule (tenant_id, scheduled_at)');

select public.gopu_create_index_if_columns('idx_content_history_generated', 'content_history', array['generated_at_utc'],
  'create index if not exists idx_content_history_generated on public.content_history (generated_at_utc desc)');
select public.gopu_create_index_if_columns('idx_content_metrics_captured', 'content_metrics', array['captured_at'],
  'create index if not exists idx_content_metrics_captured on public.content_metrics (captured_at)');
select public.gopu_create_index_if_columns('idx_content_metrics_content_history', 'content_metrics', array['content_history_id','captured_at'],
  'create index if not exists idx_content_metrics_content_history on public.content_metrics (content_history_id, captured_at desc)');

select public.gopu_create_index_if_columns('idx_content_research_findings_tenant_created', 'content_research_findings', array['tenant_id','created_at'],
  'create index if not exists idx_content_research_findings_tenant_created on public.content_research_findings (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_content_pattern_library_tenant_platform', 'content_pattern_library', array['tenant_id','platform'],
  'create index if not exists idx_content_pattern_library_tenant_platform on public.content_pattern_library (tenant_id, platform)');
select public.gopu_create_index_if_columns('idx_cmo_strategy_memory_tenant_created', 'cmo_strategy_memory', array['tenant_id','created_at'],
  'create index if not exists idx_cmo_strategy_memory_tenant_created on public.cmo_strategy_memory (tenant_id, created_at desc)');

select public.gopu_create_index_if_columns('idx_slack_inbound_leads_tenant_created', 'slack_inbound_leads', array['tenant_id','created_at'],
  'create index if not exists idx_slack_inbound_leads_tenant_created on public.slack_inbound_leads (tenant_id, created_at desc)');
select public.gopu_create_index_if_columns('idx_slack_inbound_leads_tenant_status', 'slack_inbound_leads', array['tenant_id','status','created_at'],
  'create index if not exists idx_slack_inbound_leads_tenant_status on public.slack_inbound_leads (tenant_id, status, created_at desc)');

drop function public.gopu_create_index_if_columns(text, text, text[], text);
