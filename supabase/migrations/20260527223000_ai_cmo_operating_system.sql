-- AI-first CMO operating system extensions.
-- These tables record AI recommendations and evidence without granting AI authority
-- to spend, publish, or bypass founder approval.

create extension if not exists pgcrypto;

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module text not null default 'CMO',
  recommendation_type text not null,
  title text,
  recommendation text not null,
  rationale text,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  priority text not null default 'Medium',
  status text not null default 'Queued for founder review',
  requires_founder_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_campaign_forecasts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id text,
  campaign_name text,
  platform text,
  forecast_summary text,
  estimated_reach numeric,
  estimated_leads numeric,
  estimated_cpl numeric,
  estimated_cpc numeric,
  roi_estimate text,
  recommended_action text,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_budget_analysis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id text,
  campaign_name text,
  budget_health_score numeric check (budget_health_score is null or (budget_health_score >= 0 and budget_health_score <= 100)),
  spend_efficiency_score numeric check (spend_efficiency_score is null or (spend_efficiency_score >= 0 and spend_efficiency_score <= 100)),
  roi_confidence_score numeric check (roi_confidence_score is null or (roi_confidence_score >= 0 and roi_confidence_score <= 100)),
  campaign_profitability_estimate text,
  spend_to_date numeric,
  forecast_burn_rate numeric,
  overspend_risk text,
  recommended_reallocation jsonb not null default '{}'::jsonb,
  recommendation text,
  requires_cfo_approval boolean not null default true,
  requires_founder_approval boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_content_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_history_id uuid references public.content_history(id) on delete set null,
  platform text,
  prompt text,
  generated_version text,
  approved_version text,
  rejected_version text,
  rejection_reason text,
  performance_summary text,
  budget_impact text,
  campaign_impact text,
  ai_reasoning text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_growth_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text,
  metric_name text,
  insight_type text,
  explanation text not null,
  country_response text,
  audience_segment text,
  content_pattern text,
  recommended_action text,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_lead_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id text,
  buyer_name text,
  company_name text,
  score numeric check (score is null or (score >= 0 and score <= 100)),
  quality_label text,
  spam_risk text,
  follow_up_priority text,
  reason text,
  recommended_next_action text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_schedule_optimizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text not null,
  timezone text not null default 'Asia/Kolkata',
  country text,
  recommended_day text,
  recommended_time time,
  recommended_frequency text,
  reason text,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now()
);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'ai_recommendations',
    'ai_campaign_forecasts',
    'ai_budget_analysis',
    'ai_content_memory',
    'ai_growth_insights',
    'ai_lead_scores',
    'ai_schedule_optimizations'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on table public.%I from anon', target_table);
    execute format('grant select, insert, update on table public.%I to authenticated', target_table);

    execute format('drop policy if exists %I on public.%I', target_table || '_select_member', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_insert_member', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_update_member', target_table);

    execute format('create policy %I on public.%I for select to authenticated using (app_private.gopu_is_tenant_member(tenant_id))', target_table || '_select_member', target_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.gopu_is_tenant_member(tenant_id))', target_table || '_insert_member', target_table);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.gopu_is_tenant_member(tenant_id)) with check (app_private.gopu_is_tenant_member(tenant_id))', target_table || '_update_member', target_table);
  end loop;
end $$;

create index if not exists ai_recommendations_tenant_status_idx on public.ai_recommendations(tenant_id, status, created_at desc);
create index if not exists ai_campaign_forecasts_tenant_campaign_idx on public.ai_campaign_forecasts(tenant_id, campaign_id, created_at desc);
create index if not exists ai_budget_analysis_tenant_campaign_idx on public.ai_budget_analysis(tenant_id, campaign_id, created_at desc);
create index if not exists ai_content_memory_tenant_history_idx on public.ai_content_memory(tenant_id, content_history_id, created_at desc);
create index if not exists ai_growth_insights_tenant_platform_idx on public.ai_growth_insights(tenant_id, platform, created_at desc);
create index if not exists ai_lead_scores_tenant_score_idx on public.ai_lead_scores(tenant_id, score desc, created_at desc);
create index if not exists ai_schedule_optimizations_tenant_platform_idx on public.ai_schedule_optimizations(tenant_id, platform, created_at desc);
