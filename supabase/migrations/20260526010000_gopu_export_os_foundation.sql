-- GOPU Export OS backend foundation
-- SaaS-ready, tenant-aware, approval-controlled schema.
-- Security note: raw API keys are never stored in integration_services.
-- Store raw secrets only in server-side secret infrastructure or Supabase Vault/Edge runtime secrets.

create extension if not exists pgcrypto;

create schema if not exists app_private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  plan text not null default 'demo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid,
  full_name text not null,
  email text not null,
  role text not null check (role in ('founder','admin','coo','cfo','cto','cmo','operations','finance','marketing','viewer')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_tenant_idx on public.user_profiles(tenant_id);
create index user_profiles_auth_idx on public.user_profiles(auth_user_id);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  module_name text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_approve boolean not null default false,
  can_delete boolean not null default false,
  can_configure boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  device text,
  browser text,
  ip_address text,
  status text not null default 'Monitoring',
  last_active timestamptz,
  created_at timestamptz not null default now()
);

create table public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  incident_type text,
  severity text,
  affected_module text,
  actor text,
  description text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor text,
  action text,
  module text,
  severity text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.payment_governance_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  currency text not null default 'INR',
  safe_auto_pay_limit_inr numeric not null default 1000,
  absolute_auto_pay_cap_inr numeric not null default 1500,
  allowed_category text not null default 'Trusted infrastructure renewals and credits only',
  emergency_payment_freeze boolean not null default false,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_governance_inr_only check (currency = 'INR'),
  constraint payment_governance_cap_check check (safe_auto_pay_limit_inr <= absolute_auto_pay_cap_inr and absolute_auto_pay_cap_inr <= 1500)
);

create table public.payment_vault (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_name text not null,
  category text,
  amount_inr numeric not null,
  payment_reason text,
  renewal_type text,
  payment_status text,
  approval_status text,
  cfo_confirmed boolean not null default false,
  coo_confirmed boolean not null default false,
  founder_approved boolean not null default false,
  receipt_status text,
  payment_date timestamptz,
  approval_path text,
  receipt_invoice_url text,
  payment_timestamp timestamptz,
  paid_by text,
  cto_confirmation text,
  coo_confirmation text,
  cfo_confirmation text,
  founder_approval text,
  founder_approval_reference text,
  otp_event_status text,
  audit_trail jsonb not null default '[]'::jsonb,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_vault_inr_nonnegative check (amount_inr >= 0)
);

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_vault(id) on delete cascade,
  document_type text,
  file_url text,
  uploaded_by text,
  reviewed_status text not null default 'Pending Review',
  created_at timestamptz not null default now()
);

create table public.vendor_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_name text not null,
  category text,
  trust_level text,
  monthly_limit numeric,
  auto_pay_allowed boolean not null default false,
  risk_level text,
  renewal_frequency text,
  created_at timestamptz not null default now()
);

create table public.payment_forecasts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_name text,
  expected_date date,
  projected_amount numeric,
  forecast_type text,
  created_at timestamptz not null default now()
);

create table public.payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_vault(id) on delete cascade,
  actor text,
  event text,
  status text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_name text,
  grade text,
  batch_number text,
  available_quantity numeric not null default 0,
  reserved_quantity numeric not null default 0,
  unit text,
  warehouse_location text,
  stock_status text not null default 'Monitoring',
  last_updated timestamptz not null default now(),
  constraint warehouse_inventory_quantity_check check (available_quantity >= 0 and reserved_quantity >= 0)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  movement_type text,
  product_name text,
  batch_number text,
  quantity numeric,
  linked_shipment_id text,
  owner text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.shipment_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shipment_id text,
  inventory_id uuid references public.warehouse_inventory(id) on delete set null,
  allocated_quantity numeric not null default 0,
  allocation_status text not null default 'Monitoring',
  created_at timestamptz not null default now(),
  constraint shipment_allocations_quantity_check check (allocated_quantity >= 0)
);

create table public.batch_tracking (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_number text,
  inward_date date,
  supplier_name text,
  quality_status text,
  warehouse_location text,
  stock_age text,
  review_status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.quality_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  inventory_id uuid references public.warehouse_inventory(id) on delete set null,
  issue_type text,
  severity text,
  description text,
  status text not null default 'Review Required',
  created_at timestamptz not null default now()
);

create table public.packing_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  material_name text,
  quantity numeric not null default 0,
  reorder_threshold numeric not null default 0,
  linked_shipment_demand text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now(),
  constraint packing_materials_quantity_check check (quantity >= 0 and reorder_threshold >= 0)
);

create table public.inventory_forecasts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_name text,
  forecast_type text,
  projected_issue text,
  severity text,
  expected_date date,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  supplier_name text not null,
  location text,
  contact_person text,
  phone text,
  email text,
  whatsapp text,
  products_supplied jsonb not null default '[]'::jsonb,
  reliability_score numeric,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now(),
  constraint suppliers_reliability_score_check check (reliability_score is null or (reliability_score >= 0 and reliability_score <= 100))
);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_name text,
  grade text,
  available_quantity numeric,
  unit text,
  expected_ready_date date,
  price_estimate numeric,
  confirmation_status text not null default 'Needs Confirmation',
  created_at timestamptz not null default now(),
  constraint supplier_products_quantity_check check (available_quantity is null or available_quantity >= 0)
);

create table public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product text,
  quantity_needed numeric,
  unit text,
  required_date date,
  linked_workflow_id text,
  suggested_supplier text,
  status text not null default 'Draft',
  owner text,
  priority text,
  created_at timestamptz not null default now()
);

create table public.supplier_followups (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product text,
  required_confirmation text,
  deadline timestamptz,
  owner text,
  escalation_level text,
  status text not null default 'Pending Confirmation',
  created_at timestamptz not null default now()
);

create table public.supplier_price_history (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product text,
  grade text,
  price numeric,
  currency text,
  quantity numeric,
  date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.supplier_quality_issues (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product text,
  batch_number text,
  issue text,
  severity text,
  supplier_response text,
  resolution_status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table public.supplier_memory (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  memory_type text,
  content text,
  source text,
  created_at timestamptz not null default now()
);

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_name text,
  company_name text,
  country text,
  email text,
  phone text,
  whatsapp text,
  product_interests jsonb not null default '[]'::jsonb,
  relationship_status text not null default 'New',
  risk_level text not null default 'Monitoring',
  strategic_owner text not null default 'CMO Command',
  operational_coordinator text not null default 'COO Command',
  commercial_risk_coordinator text not null default 'CFO Command',
  technical_automation_support text not null default 'CTO Command',
  created_at timestamptz not null default now()
);

create table public.buyer_enquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  product text,
  quantity text,
  destination text,
  source text,
  status text not null default 'Draft',
  linked_pricing_request_id uuid references public.pricing_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.buyer_quote_history (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  quote_id uuid references public.quote_drafts(id) on delete set null,
  product text,
  quantity text,
  quoted_price numeric,
  margin numeric,
  status text not null default 'Draft',
  approval_state text,
  expiry_date date,
  created_at timestamptz not null default now()
);

create table public.buyer_invoice_history (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  invoice_number text,
  invoice_type text,
  value numeric,
  status text not null default 'Draft',
  approval_state text,
  created_at timestamptz not null default now()
);

create table public.buyer_shipment_history (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  shipment_id text,
  product text,
  quantity text,
  destination text,
  status text not null default 'Monitoring',
  eta date,
  risk_state text,
  created_at timestamptz not null default now()
);

create table public.buyer_followups (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  reason text,
  due_date timestamptz,
  owner text,
  priority text,
  status text not null default 'Follow-up Due',
  next_action text,
  created_at timestamptz not null default now()
);

create table public.buyer_preferences (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  preferred_product text,
  preferred_packing text,
  preferred_incoterm text,
  preferred_payment_terms text,
  preferred_currency text,
  communication_channel text,
  document_requirements text,
  created_at timestamptz not null default now()
);

create table public.buyer_memory (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  memory_type text,
  content text,
  source text,
  approved_by_founder boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  snapshot_type text,
  summary_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.operational_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  metric_name text,
  metric_value text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.commercial_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product text,
  margin numeric,
  risk_level text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.shipment_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shipment_id text,
  current_stage text,
  delay_status text,
  created_at timestamptz not null default now()
);

create table public.buyer_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid references public.buyers(id) on delete set null,
  relationship_score numeric,
  quote_conversion numeric,
  risk_level text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.supplier_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  reliability_score numeric,
  delay_frequency numeric,
  quality_score numeric,
  created_at timestamptz not null default now()
);

create table public.technical_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  api_health text,
  automation_health text,
  incident_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_name text,
  content_status text,
  engagement_placeholder text,
  created_at timestamptz not null default now()
);

create table public.strategic_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recommendation_type text,
  summary text,
  severity text,
  created_at timestamptz not null default now()
);

create unique index roles_name_per_tenant on public.roles(tenant_id, role_name);
create index permissions_role_module_idx on public.permissions(role_id, module_name);
create index user_sessions_user_status_idx on public.user_sessions(user_id, status);
create index security_incidents_tenant_severity_idx on public.security_incidents(tenant_id, severity, status);
create index security_audit_log_tenant_module_idx on public.security_audit_log(tenant_id, module, created_at);
create unique index payment_governance_one_per_tenant on public.payment_governance_rules(tenant_id);
create index payment_vault_tenant_status_idx on public.payment_vault(tenant_id, status, amount_inr);
create index payment_receipts_payment_idx on public.payment_receipts(payment_id, reviewed_status);
create index vendor_registry_tenant_trust_idx on public.vendor_registry(tenant_id, trust_level, risk_level);
create index payment_forecasts_tenant_date_idx on public.payment_forecasts(tenant_id, expected_date);
create index payment_audit_log_payment_idx on public.payment_audit_log(payment_id, created_at);
create index warehouse_inventory_tenant_status_idx on public.warehouse_inventory(tenant_id, stock_status, batch_number);
create index stock_movements_tenant_created_idx on public.stock_movements(tenant_id, created_at, status);
create index shipment_allocations_tenant_status_idx on public.shipment_allocations(tenant_id, allocation_status);
create index batch_tracking_tenant_batch_idx on public.batch_tracking(tenant_id, batch_number, review_status);
create index quality_holds_tenant_severity_idx on public.quality_holds(tenant_id, severity, status);
create index packing_materials_tenant_status_idx on public.packing_materials(tenant_id, status);
create index inventory_forecasts_tenant_date_idx on public.inventory_forecasts(tenant_id, expected_date, severity);
create index suppliers_tenant_status_idx on public.suppliers(tenant_id, status, reliability_score);
create index supplier_products_supplier_status_idx on public.supplier_products(supplier_id, confirmation_status);
create index procurement_requests_tenant_status_idx on public.procurement_requests(tenant_id, status, priority);
create index supplier_followups_supplier_status_idx on public.supplier_followups(supplier_id, status, deadline);
create index supplier_price_history_supplier_date_idx on public.supplier_price_history(supplier_id, product, date);
create index supplier_quality_issues_supplier_status_idx on public.supplier_quality_issues(supplier_id, severity, resolution_status);
create index supplier_memory_supplier_type_idx on public.supplier_memory(supplier_id, memory_type);
create index buyers_tenant_status_idx on public.buyers(tenant_id, relationship_status, risk_level);
create index buyer_enquiries_buyer_status_idx on public.buyer_enquiries(buyer_id, status, created_at);
create index buyer_quote_history_buyer_status_idx on public.buyer_quote_history(buyer_id, status, approval_state);
create index buyer_invoice_history_buyer_status_idx on public.buyer_invoice_history(buyer_id, status, approval_state);
create index buyer_shipment_history_buyer_status_idx on public.buyer_shipment_history(buyer_id, status, eta);
create index buyer_followups_buyer_due_idx on public.buyer_followups(buyer_id, status, due_date);
create index buyer_preferences_buyer_idx on public.buyer_preferences(buyer_id);
create index buyer_memory_buyer_type_idx on public.buyer_memory(buyer_id, memory_type);
create index analytics_snapshots_tenant_type_idx on public.analytics_snapshots(tenant_id, snapshot_type, created_at);
create index operational_metrics_tenant_status_idx on public.operational_metrics(tenant_id, status, created_at);
create index commercial_metrics_tenant_risk_idx on public.commercial_metrics(tenant_id, product, risk_level);
create index shipment_metrics_tenant_delay_idx on public.shipment_metrics(tenant_id, delay_status, created_at);
create index buyer_analytics_tenant_risk_idx on public.buyer_analytics(tenant_id, risk_level, relationship_score);
create index supplier_analytics_tenant_score_idx on public.supplier_analytics(tenant_id, reliability_score, quality_score);
create index technical_metrics_tenant_created_idx on public.technical_metrics(tenant_id, created_at);
create index marketing_metrics_tenant_status_idx on public.marketing_metrics(tenant_id, content_status, created_at);
create index strategic_recommendations_tenant_severity_idx on public.strategic_recommendations(tenant_id, severity, created_at);

create or replace function app_private.current_user_role(target_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.tenant_id = target_tenant_id
    and up.auth_user_id = auth.uid()
    and up.status = 'active'
  limit 1
$$;

create or replace function app_private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.tenant_id = target_tenant_id
      and up.auth_user_id = auth.uid()
      and up.status = 'active'
  )
$$;

create or replace function app_private.is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app_private.current_user_role(target_tenant_id), '') in ('founder','admin')
$$;

create or replace function app_private.can_access_table(target_tenant_id uuid, target_table text, operation text default 'read')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  user_role := app_private.current_user_role(target_tenant_id);

  if user_role is null then
    return false;
  end if;

  if user_role in ('founder','admin') then
    return true;
  end if;

  if user_role = 'viewer' then
    return operation = 'read';
  end if;

  if target_table in ('tenants','user_profiles','company_profiles','company_registrations','company_documents','document_defaults','lut_details','executive_commands','executive_activity_timeline','system_audit_log') then
    return operation = 'read';
  end if;

  if user_role in ('coo','operations') and target_table in (
    'lead_intake','whatsapp_intake_commands','lead_workflow_events','document_workflows','document_drafts',
    'tasks','task_comments','task_status_history','task_escalations','approval_requests','approval_comments',
    'invoices','invoice_validation_logs','invoice_audit_log','whatsapp_commands','parsed_commands','command_workflow_routes','whatsapp_response_drafts',
    'warehouse_inventory','stock_movements','shipment_allocations','batch_tracking','quality_holds','packing_materials','inventory_forecasts'
    ,'suppliers','supplier_products','procurement_requests','supplier_followups','supplier_price_history','supplier_quality_issues','supplier_memory'
    ,'buyers','buyer_enquiries','buyer_quote_history','buyer_invoice_history','buyer_shipment_history','buyer_followups','buyer_preferences','buyer_memory'
    ,'analytics_snapshots','operational_metrics','commercial_metrics','shipment_metrics','buyer_analytics','supplier_analytics','technical_metrics','marketing_metrics','strategic_recommendations'
  ) then
    return true;
  end if;

  if user_role in ('cfo','finance') and target_table in (
    'pricing_requests','pricing_calculations','market_validation','quote_drafts','approval_requests','approval_comments','approval_actions',
    'invoices','invoice_company_snapshot','invoice_buyer_snapshot','invoice_line_items','invoice_export_details','invoice_validation_logs',
    'invoice_approval_events','invoice_audit_log','payment_governance_rules','payment_vault','vendor_registry','payment_forecasts','tasks','task_comments',
    'warehouse_inventory','stock_movements','shipment_allocations','batch_tracking','quality_holds','packing_materials','inventory_forecasts'
    ,'suppliers','supplier_products','procurement_requests','supplier_followups','supplier_price_history','supplier_quality_issues','supplier_memory'
    ,'buyers','buyer_enquiries','buyer_quote_history','buyer_invoice_history','buyer_shipment_history','buyer_followups','buyer_preferences','buyer_memory'
    ,'analytics_snapshots','operational_metrics','commercial_metrics','shipment_metrics','buyer_analytics','supplier_analytics','technical_metrics','marketing_metrics','strategic_recommendations'
  ) then
    return true;
  end if;

  if user_role = 'cto' and target_table in (
    'platform_health','integration_services','integration_audit_logs','automation_queue','workflow_automations','workflow_events',
    'automation_logs','automation_failures','automation_rules','workflow_memory','technical_incidents',
    'tasks','task_comments','whatsapp_commands','parsed_commands','command_workflow_routes'
  ) then
    return true;
  end if;

  if user_role in ('cmo','marketing') and target_table in (
    'content_items','content_calendar','marketing_campaigns','competitor_reviews','brand_approval_requests',
    'approval_requests','approval_comments','tasks','task_comments','whatsapp_commands','parsed_commands','command_workflow_routes',
    'buyers','buyer_enquiries','buyer_followups','buyer_preferences','buyer_memory'
    ,'analytics_snapshots','operational_metrics','buyer_analytics','marketing_metrics','strategic_recommendations'
  ) then
    return true;
  end if;

  return false;
end;
$$;

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_display_name text,
  legal_company_name text,
  business_type text,
  country text,
  state text,
  city text,
  registered_address text,
  operating_address text,
  phone text,
  email text,
  website text,
  authorized_person text,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_registrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  registration_type text not null,
  registration_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'Missing',
  document_url text,
  requires_founder_review boolean not null default true,
  approved_by_founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_type text not null,
  document_name text,
  file_url text,
  status text not null default 'Missing',
  expiry_date date,
  owner text,
  approved_by_founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_defaults (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_prefix text,
  quotation_prefix text,
  default_currency text,
  default_payment_terms text,
  default_incoterm text,
  default_port_loading text,
  default_bank_masked text,
  authorized_signatory text,
  email_footer text,
  buyer_document_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lut_details (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lut_arn text,
  financial_year text,
  filing_date date,
  valid_from date,
  valid_to date,
  status text not null default 'Draft',
  document_url text,
  founder_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_intake (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text,
  buyer_name text,
  company_name text,
  country text,
  email text,
  phone text,
  product text,
  quantity numeric,
  unit text,
  destination_port text,
  shipping_mode text,
  required_delivery_date date,
  incoterm text,
  payment_preference text,
  notes text,
  status text not null default 'Draft',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_intake_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  raw_message text not null,
  parsed_data jsonb not null default '{}'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  status text not null default 'Received',
  created_at timestamptz not null default now()
);

create table public.lead_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.lead_intake(id) on delete cascade,
  event_type text,
  owner_command text,
  status text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pricing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.lead_intake(id) on delete set null,
  buyer_name text,
  product text,
  quantity numeric,
  destination text,
  incoterm text,
  product_cost numeric,
  freight_cost numeric,
  margin_target numeric,
  currency text,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pricing_request_id uuid references public.pricing_requests(id) on delete cascade,
  total_cost numeric,
  margin numeric,
  suggested_price numeric,
  safe_price numeric,
  aggressive_price numeric,
  fob_price numeric,
  cif_price numeric,
  exw_price numeric,
  fx_exposure text,
  risk_level text,
  formula_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.market_validation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pricing_request_id uuid references public.pricing_requests(id) on delete cascade,
  internal_range jsonb not null default '{}'::jsonb,
  market_range jsonb not null default '{}'::jsonb,
  comparison_status text,
  risk_notes text,
  created_at timestamptz not null default now()
);

create table public.quote_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_name text,
  quote_number text,
  quote_data jsonb not null default '{}'::jsonb,
  approval_status text not null default 'Draft',
  founder_review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_type text,
  department text,
  executive_owner text,
  buyer_name text,
  related_workflow_id uuid,
  risk_level text,
  priority text,
  status text not null default 'Review Pending',
  summary text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid references public.approval_requests(id) on delete cascade,
  author text,
  comment text,
  comment_type text,
  created_at timestamptz not null default now()
);

create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid references public.approval_requests(id) on delete cascade,
  action_type text,
  actor text,
  action_reason text,
  created_at timestamptz not null default now()
);

create table public.approval_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid references public.approval_requests(id) on delete cascade,
  event text,
  actor text,
  status text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_type text,
  invoice_number text,
  financial_year text,
  status text not null default 'Draft',
  approval_status text not null default 'Founder Review Required',
  buyer_id uuid,
  lead_id uuid references public.lead_intake(id) on delete set null,
  quote_id uuid references public.quote_drafts(id) on delete set null,
  export_mode text not null default 'LUT/Bond Without IGST',
  currency text,
  subtotal numeric,
  tax_total numeric not null default 0,
  grand_total numeric,
  amount_in_words text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_company_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  legal_company_name text,
  registered_address text,
  gstin text,
  iec text,
  pan text,
  authorized_signatory text,
  bank_details_masked text,
  lut_arn text,
  lut_financial_year text,
  lut_valid_from date,
  lut_valid_to date,
  lut_status text,
  created_at timestamptz not null default now()
);

create table public.invoice_buyer_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  buyer_name text,
  buyer_company text,
  buyer_address text,
  buyer_country text,
  delivery_address text,
  destination_country text,
  buyer_email text,
  created_at timestamptz not null default now()
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  item_number integer,
  product_description text,
  hsn_code text,
  packing_type text,
  quantity numeric,
  unit text,
  unit_price numeric,
  discount numeric default 0,
  taxable_value numeric,
  tax_rate numeric default 0,
  tax_amount numeric default 0,
  total_value numeric,
  created_at timestamptz not null default now()
);

create table public.invoice_export_details (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  incoterm text,
  port_of_loading text,
  port_of_discharge text,
  final_destination text,
  shipping_mode text,
  country_of_origin text,
  export_mode text not null default 'LUT/Bond Without IGST',
  export_endorsement text,
  lut_arn text,
  lut_financial_year text,
  hsn_review_required boolean not null default true,
  origin_review_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.invoice_validation_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  validation_key text,
  status text,
  severity text,
  message text,
  owner text,
  created_at timestamptz not null default now()
);

create table public.invoice_approval_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  approval_stage text,
  status text,
  actor text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.invoice_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  action text,
  actor text,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.document_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_type text,
  buyer_name text,
  product text,
  status text not null default 'Draft',
  approval_state text not null default 'Founder Review Required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_id uuid references public.document_workflows(id) on delete cascade,
  document_type text,
  draft_data jsonb not null default '{}'::jsonb,
  validation_status text not null default 'Draft',
  founder_review_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text,
  description text,
  workflow_source text,
  linked_record_id uuid,
  department text,
  owner_command text,
  assigned_to text,
  priority text,
  status text not null default 'New',
  due_date date,
  escalation_level text,
  blocking_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  author text,
  comment text,
  comment_type text,
  created_at timestamptz not null default now()
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  previous_status text,
  new_status text,
  actor text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.task_escalations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  escalation_level text,
  escalation_reason text,
  escalated_to text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.executive_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text,
  title text,
  role text,
  status text not null default 'Monitoring',
  current_focus text,
  key_modules jsonb not null default '[]'::jsonb,
  route text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.executive_activity_timeline (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  command_id uuid references public.executive_commands(id) on delete cascade,
  event text,
  status text,
  created_at timestamptz not null default now()
);

create table public.platform_health (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  system_name text,
  status text,
  latency numeric,
  failure_count integer not null default 0,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.integration_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_name text,
  environment text,
  masked_key text,
  status text,
  usage_percentage numeric,
  quota_remaining numeric,
  last_verified timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_services_no_raw_secret check (
    masked_key is null or masked_key like '%****%' or masked_key = 'Not configured'
  )
);

create table public.integration_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid references public.integration_services(id) on delete cascade,
  actor text,
  action text,
  status text,
  created_at timestamptz not null default now()
);

create table public.automation_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text,
  queue_status text,
  failure_count integer not null default 0,
  retry_state text,
  last_execution timestamptz,
  created_at timestamptz not null default now()
);

create table public.workflow_automations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text,
  status text,
  trigger_type text,
  last_execution timestamptz,
  success_rate numeric,
  failure_count integer not null default 0,
  retry_state text,
  created_at timestamptz not null default now()
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text,
  source_module text,
  target_module text,
  workflow_id uuid,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text,
  execution_time timestamptz,
  status text,
  retry_count integer not null default 0,
  failure_reason text,
  affected_module text,
  created_at timestamptz not null default now()
);

create table public.automation_failures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_name text,
  severity text,
  failure_reason text,
  escalation_target text,
  retry_state text,
  created_at timestamptz not null default now()
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_name text,
  trigger_condition text,
  target_action text,
  escalation_path text,
  active_status text,
  created_at timestamptz not null default now()
);

create table public.workflow_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  memory_type text,
  content text,
  recurring_pattern text,
  created_at timestamptz not null default now()
);

create table public.technical_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  incident_title text,
  severity text,
  affected_module text,
  business_impact text,
  owner text,
  escalation_target text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  platform text,
  title text,
  content_type text,
  hook text,
  body text,
  status text not null default 'Draft',
  approval_required boolean not null default true,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete cascade,
  platform text,
  scheduled_date timestamptz,
  status text not null default 'Planned',
  created_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_name text,
  target_market text,
  product_focus text,
  stage text,
  owner text,
  next_action text,
  status text not null default 'Monitoring',
  created_at timestamptz not null default now()
);

create table public.competitor_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  competitor_name text,
  platform text,
  observation text,
  opportunity text,
  recommended_action text,
  created_at timestamptz not null default now()
);

create table public.brand_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  claim text,
  risk_level text,
  reason text,
  status text not null default 'Founder Approval Required',
  created_at timestamptz not null default now()
);

create table public.founder_briefings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  briefing_date date not null default current_date,
  briefing_status text not null default 'Ready',
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.briefing_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  briefing_id uuid references public.founder_briefings(id) on delete cascade,
  section_type text,
  title text,
  summary text,
  risk_level text,
  created_at timestamptz not null default now()
);

create table public.briefing_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  briefing_id uuid references public.founder_briefings(id) on delete cascade,
  alert_type text,
  severity text,
  message text,
  department text,
  created_at timestamptz not null default now()
);

create table public.founder_action_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  briefing_id uuid references public.founder_briefings(id) on delete cascade,
  action_title text,
  department text,
  risk_level text,
  deadline date,
  next_action text,
  created_at timestamptz not null default now()
);

create table public.whatsapp_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sender text,
  raw_message text,
  command_type text,
  parse_status text,
  workflow_status text,
  created_at timestamptz not null default now()
);

create table public.parsed_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  command_id uuid references public.whatsapp_commands(id) on delete cascade,
  buyer_name text,
  product text,
  quantity text,
  destination text,
  deadline text,
  shipping_mode text,
  incoterm text,
  missing_fields jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  created_at timestamptz not null default now()
);

create table public.command_workflow_routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  command_id uuid references public.whatsapp_commands(id) on delete cascade,
  target_module text,
  owner_command text,
  status text,
  created_at timestamptz not null default now()
);

create table public.whatsapp_response_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  command_id uuid references public.whatsapp_commands(id) on delete cascade,
  response_text text,
  status text not null default 'Draft Response Ready',
  created_at timestamptz not null default now()
);

create table public.system_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor text,
  module text,
  action text,
  record_type text,
  record_id uuid,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz not null default now()
);

create index on public.company_profiles(tenant_id);
create unique index company_profiles_one_per_tenant on public.company_profiles(tenant_id);
create unique index document_defaults_one_per_tenant on public.document_defaults(tenant_id);
create unique index lut_details_one_per_tenant on public.lut_details(tenant_id);
create unique index company_registrations_type_per_tenant on public.company_registrations(tenant_id, registration_type);
create unique index company_documents_type_per_tenant on public.company_documents(tenant_id, document_type);
create index on public.lead_intake(tenant_id, status);
create index on public.pricing_requests(tenant_id, status);
create index on public.approval_requests(tenant_id, status, priority);
create index on public.invoices(tenant_id, status, approval_status);
create index on public.tasks(tenant_id, status, priority);
create index on public.executive_commands(tenant_id, route);
create index on public.integration_services(tenant_id, service_name, environment);
create index on public.workflow_automations(tenant_id, status);
create index on public.workflow_events(tenant_id, event_type, status);
create index on public.automation_logs(tenant_id, workflow_name, status);
create index on public.automation_failures(tenant_id, severity, retry_state);
create index on public.automation_rules(tenant_id, active_status);
create index on public.workflow_memory(tenant_id, memory_type);
create index on public.content_items(tenant_id, status, platform);
create index on public.founder_briefings(tenant_id, briefing_date);
create index on public.whatsapp_commands(tenant_id, command_type, workflow_status);
create index on public.system_audit_log(tenant_id, module, created_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tenants','user_profiles','roles','permissions','user_sessions','security_incidents','security_audit_log','payment_governance_rules','payment_vault','payment_receipts','vendor_registry','payment_forecasts','payment_audit_log','company_profiles','company_registrations','company_documents','document_defaults','lut_details',
    'lead_intake','whatsapp_intake_commands','lead_workflow_events','pricing_requests','pricing_calculations','market_validation','quote_drafts',
    'approval_requests','approval_comments','approval_actions','approval_audit_log','invoices','invoice_company_snapshot','invoice_buyer_snapshot',
    'invoice_line_items','invoice_export_details','invoice_validation_logs','invoice_approval_events','invoice_audit_log','document_workflows','document_drafts',
    'warehouse_inventory','stock_movements','shipment_allocations','batch_tracking','quality_holds','packing_materials','inventory_forecasts',
    'suppliers','supplier_products','procurement_requests','supplier_followups','supplier_price_history','supplier_quality_issues','supplier_memory',
    'buyers','buyer_enquiries','buyer_quote_history','buyer_invoice_history','buyer_shipment_history','buyer_followups','buyer_preferences','buyer_memory',
    'analytics_snapshots','operational_metrics','commercial_metrics','shipment_metrics','buyer_analytics','supplier_analytics','technical_metrics','marketing_metrics','strategic_recommendations',
    'tasks','task_comments','task_status_history','task_escalations','executive_commands','executive_activity_timeline','platform_health','integration_services',
    'integration_audit_logs','automation_queue','technical_incidents','content_items','content_calendar','marketing_campaigns','competitor_reviews',
    'workflow_automations','workflow_events','automation_logs','automation_failures','automation_rules','workflow_memory',
    'brand_approval_requests','founder_briefings','briefing_sections','briefing_alerts','founder_action_items','whatsapp_commands','parsed_commands',
    'command_workflow_routes','whatsapp_response_drafts','system_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy tenants_select_member on public.tenants
  for select to authenticated
  using (app_private.is_tenant_member(id));

create policy tenants_admin_write on public.tenants
  for all to authenticated
  using (app_private.is_tenant_admin(id))
  with check (app_private.is_tenant_admin(id));

create policy user_profiles_select_tenant on public.user_profiles
  for select to authenticated
  using (app_private.is_tenant_member(tenant_id));

create policy user_profiles_admin_write on public.user_profiles
  for all to authenticated
  using (app_private.is_tenant_admin(tenant_id))
  with check (app_private.is_tenant_admin(tenant_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles','security_incidents','security_audit_log','payment_governance_rules','payment_vault','vendor_registry','payment_forecasts','company_profiles','company_registrations','company_documents','document_defaults','lut_details',
    'lead_intake','whatsapp_intake_commands','lead_workflow_events','pricing_requests','pricing_calculations','market_validation','quote_drafts',
    'approval_requests','approval_comments','approval_actions','approval_audit_log','invoices','invoice_company_snapshot','invoice_buyer_snapshot',
    'invoice_line_items','invoice_export_details','invoice_validation_logs','invoice_approval_events','invoice_audit_log','document_workflows','document_drafts',
    'warehouse_inventory','stock_movements','shipment_allocations','batch_tracking','quality_holds','packing_materials','inventory_forecasts',
    'suppliers','procurement_requests',
    'buyers',
    'analytics_snapshots','operational_metrics','commercial_metrics','shipment_metrics','buyer_analytics','supplier_analytics','technical_metrics','marketing_metrics','strategic_recommendations',
    'tasks','task_comments','task_status_history','task_escalations','executive_commands','executive_activity_timeline','platform_health','integration_services',
    'integration_audit_logs','automation_queue','technical_incidents','content_items','content_calendar','marketing_campaigns','competitor_reviews',
    'workflow_automations','workflow_events','automation_logs','automation_failures','automation_rules','workflow_memory',
    'brand_approval_requests','founder_briefings','briefing_sections','briefing_alerts','founder_action_items','whatsapp_commands','parsed_commands',
    'command_workflow_routes','whatsapp_response_drafts','system_audit_log'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (app_private.can_access_table(tenant_id, %L, ''read''))', table_name || '_select_member', table_name, table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can_access_table(tenant_id, %L, ''write''))', table_name || '_insert_member', table_name, table_name);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.can_access_table(tenant_id, %L, ''write'')) with check (app_private.can_access_table(tenant_id, %L, ''write''))', table_name || '_update_member', table_name, table_name, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (app_private.is_tenant_admin(tenant_id))', table_name || '_delete_admin', table_name);
  end loop;
end $$;

create policy permissions_select_member on public.permissions
  for select to authenticated
  using (
    exists (
      select 1
      from public.roles r
      where r.id = permissions.role_id
        and app_private.can_access_table(r.tenant_id, 'roles', 'read')
    )
  );

create policy permissions_insert_member on public.permissions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.roles r
      where r.id = permissions.role_id
        and app_private.can_access_table(r.tenant_id, 'roles', 'write')
    )
  );

create policy permissions_update_member on public.permissions
  for update to authenticated
  using (
    exists (
      select 1
      from public.roles r
      where r.id = permissions.role_id
        and app_private.can_access_table(r.tenant_id, 'roles', 'write')
    )
  )
  with check (
    exists (
      select 1
      from public.roles r
      where r.id = permissions.role_id
        and app_private.can_access_table(r.tenant_id, 'roles', 'write')
    )
  );

create policy permissions_delete_admin on public.permissions
  for delete to authenticated
  using (
    exists (
      select 1
      from public.roles r
      where r.id = permissions.role_id
        and app_private.is_tenant_admin(r.tenant_id)
    )
  );

create policy user_sessions_select_member on public.user_sessions
  for select to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = user_sessions.user_id
        and app_private.can_access_table(up.tenant_id, 'user_profiles', 'read')
    )
  );

create policy user_sessions_insert_member on public.user_sessions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = user_sessions.user_id
        and app_private.can_access_table(up.tenant_id, 'user_profiles', 'write')
    )
  );

create policy user_sessions_update_member on public.user_sessions
  for update to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = user_sessions.user_id
        and app_private.can_access_table(up.tenant_id, 'user_profiles', 'write')
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = user_sessions.user_id
        and app_private.can_access_table(up.tenant_id, 'user_profiles', 'write')
    )
  );

create policy user_sessions_delete_admin on public.user_sessions
  for delete to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = user_sessions.user_id
        and app_private.is_tenant_admin(up.tenant_id)
    )
  );

create policy payment_receipts_select_member on public.payment_receipts
  for select to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_receipts.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'read')));

create policy payment_receipts_insert_member on public.payment_receipts
  for insert to authenticated
  with check (exists (select 1 from public.payment_vault pv where pv.id = payment_receipts.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')));

create policy payment_receipts_update_member on public.payment_receipts
  for update to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_receipts.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')))
  with check (exists (select 1 from public.payment_vault pv where pv.id = payment_receipts.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')));

create policy payment_receipts_delete_admin on public.payment_receipts
  for delete to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_receipts.payment_id and app_private.is_tenant_admin(pv.tenant_id)));

create policy payment_audit_log_select_member on public.payment_audit_log
  for select to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_audit_log.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'read')));

create policy payment_audit_log_insert_member on public.payment_audit_log
  for insert to authenticated
  with check (exists (select 1 from public.payment_vault pv where pv.id = payment_audit_log.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')));

create policy payment_audit_log_update_member on public.payment_audit_log
  for update to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_audit_log.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')))
  with check (exists (select 1 from public.payment_vault pv where pv.id = payment_audit_log.payment_id and app_private.can_access_table(pv.tenant_id, 'payment_vault', 'write')));

create policy payment_audit_log_delete_admin on public.payment_audit_log
  for delete to authenticated
  using (exists (select 1 from public.payment_vault pv where pv.id = payment_audit_log.payment_id and app_private.is_tenant_admin(pv.tenant_id)));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'supplier_products','supplier_followups','supplier_price_history','supplier_quality_issues','supplier_memory'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.suppliers s where s.id = supplier_id and app_private.can_access_table(s.tenant_id, ''suppliers'', ''read'')))', table_name || '_select_member', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.suppliers s where s.id = supplier_id and app_private.can_access_table(s.tenant_id, ''suppliers'', ''write'')))', table_name || '_insert_member', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.suppliers s where s.id = supplier_id and app_private.can_access_table(s.tenant_id, ''suppliers'', ''write''))) with check (exists (select 1 from public.suppliers s where s.id = supplier_id and app_private.can_access_table(s.tenant_id, ''suppliers'', ''write'')))', table_name || '_update_member', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.suppliers s where s.id = supplier_id and app_private.is_tenant_admin(s.tenant_id)))', table_name || '_delete_admin', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'buyer_enquiries','buyer_quote_history','buyer_invoice_history','buyer_shipment_history','buyer_followups','buyer_preferences','buyer_memory'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.buyers b where b.id = buyer_id and app_private.can_access_table(b.tenant_id, ''buyers'', ''read'')))', table_name || '_select_member', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.buyers b where b.id = buyer_id and app_private.can_access_table(b.tenant_id, ''buyers'', ''write'')))', table_name || '_insert_member', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.buyers b where b.id = buyer_id and app_private.can_access_table(b.tenant_id, ''buyers'', ''write''))) with check (exists (select 1 from public.buyers b where b.id = buyer_id and app_private.can_access_table(b.tenant_id, ''buyers'', ''write'')))', table_name || '_update_member', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.buyers b where b.id = buyer_id and app_private.is_tenant_admin(b.tenant_id)))', table_name || '_delete_admin', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tenants','user_profiles','company_profiles','company_registrations','company_documents','document_defaults','lut_details',
    'lead_intake','pricing_requests','quote_drafts','approval_requests','invoices','document_workflows','tasks','executive_commands',
    'integration_services','workflow_automations','payment_governance_rules','payment_vault','content_items'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

insert into public.tenants (id, name, slug, status, plan)
values ('11111111-1111-1111-1111-111111111111', 'GOPU Exports', 'gopu-exports', 'demo', 'founder-demo');

insert into public.user_profiles (id, tenant_id, auth_user_id, full_name, email, role, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', null, 'Sukesh Reddy', 'founder.demo@gopu.local', 'founder', 'demo');

insert into public.roles (id, tenant_id, role_name, description)
values
('71000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Founder', 'Full access, final approval authority, integration management, invoice release, pricing override, and workflow escalation.'),
('71000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Admin', 'Administrative access under founder governance.'),
('71000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'COO', 'Operations, tasks, workflows, logistics, follow-up, and routing without final release authority.'),
('71000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'CFO', 'Pricing, margins, quote validation, financial review, and commercial risk recommendations.'),
('71000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'CTO', 'Integrations, monitoring, deployments, API systems, and automation controls.'),
('71000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'CMO', 'Content, campaigns, outreach, brand recommendations, and marketing approval routing.'),
('71000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Viewer', 'Read-only dashboard visibility.');

insert into public.permissions (role_id, module_name, can_view, can_create, can_edit, can_approve, can_delete, can_configure)
values
('71000000-0000-0000-0000-000000000001', 'Pricing Engine', true, true, true, true, true, true),
('71000000-0000-0000-0000-000000000001', 'Invoice System', true, true, true, true, true, true),
('71000000-0000-0000-0000-000000000003', 'Task Engine', true, true, true, false, false, false),
('71000000-0000-0000-0000-000000000004', 'Pricing Engine', true, true, true, false, false, false),
('71000000-0000-0000-0000-000000000005', 'Integrations Vault', true, true, true, false, false, true),
('71000000-0000-0000-0000-000000000006', 'Content Engine', true, true, true, false, false, false),
('71000000-0000-0000-0000-000000000007', 'Morning Briefings', true, false, false, false, false, false);

insert into public.user_sessions (user_id, device, browser, ip_address, status, last_active)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Founder workstation', 'Codex in-app browser', 'Demo location', 'Active', now());

insert into public.security_incidents (tenant_id, incident_type, severity, affected_module, actor, description, status)
values
('11111111-1111-1111-1111-111111111111', 'Permission escalation attempt', 'High', 'Roles', 'Demo Admin', 'Role change requires founder review before activation.', 'Review Required'),
('11111111-1111-1111-1111-111111111111', 'Approval bypass attempt', 'Critical', 'Approval Wall', 'System Guard', 'Invoice release remains blocked until founder approval.', 'Review Required');

insert into public.security_audit_log (tenant_id, actor, action, module, severity, notes)
values
('11111111-1111-1111-1111-111111111111', 'Founder', 'Founder session verified', 'Security', 'Low', 'Demo session marker only.'),
('11111111-1111-1111-1111-111111111111', 'System', 'Workflow freeze control prepared', 'Automation Center', 'Medium', 'Demo control available; no external workflow disabled.');

insert into public.payment_governance_rules (tenant_id, currency, safe_auto_pay_limit_inr, absolute_auto_pay_cap_inr, allowed_category, emergency_payment_freeze, status)
values ('11111111-1111-1111-1111-111111111111', 'INR', 1000, 1500, 'Trusted infrastructure renewals and credits only', false, 'Active');

insert into public.payment_vault (tenant_id, vendor_name, amount_inr, payment_reason, category, approval_path, receipt_invoice_url, payment_timestamp, paid_by, cto_confirmation, coo_confirmation, cfo_confirmation, founder_approval, founder_approval_reference, otp_event_status, audit_trail, status)
values
('11111111-1111-1111-1111-111111111111', 'OpenAI credits', 950, 'AI workflow credit top-up', 'Trusted Infrastructure', 'CTO requirement -> COO necessity -> CFO validation/execution', null, null, 'CFO Command', 'Requirement raised', 'Confirmed', 'Ready to initiate', 'Not required', null, 'Not requested', '[{"event":"payment request created"},{"event":"COO operational confirmation"},{"event":"CFO validation completed"}]', 'Draft'),
('11111111-1111-1111-1111-111111111111', 'Supabase', 1250, 'Database platform renewal buffer', 'Trusted Infrastructure', 'CTO requirement -> COO + CFO confirmation', null, null, 'CFO Command', 'Requirement raised', 'Pending', 'Review', 'Not required', null, 'Not requested', '[{"event":"controlled auto-pay requires CFO + COO confirmation","status":"review"}]', 'Review Required'),
('11111111-1111-1111-1111-111111111111', 'Freight vendor invoice', 1200, 'Manual shipment invoice', 'Freight', 'Blocked -> Founder Review', null, null, 'Not paid', 'Blocked', 'Blocked', 'Blocked', 'Required', 'demo-founder-review-required', 'Blocked', '[{"event":"non-infrastructure category blocked","status":"blocked"}]', 'Blocked');

insert into public.vendor_registry (tenant_id, vendor_name, category, trust_level, monthly_limit, auto_pay_allowed, risk_level, renewal_frequency)
values
('11111111-1111-1111-1111-111111111111', 'OpenAI', 'Trusted Infrastructure', 'Trusted', 1000, true, 'Low', 'Usage-based'),
('11111111-1111-1111-1111-111111111111', 'Supabase', 'Trusted Infrastructure', 'Trusted', 1500, true, 'Medium', 'Monthly'),
('11111111-1111-1111-1111-111111111111', 'Cloudflare', 'Domain / SSL renewal', 'Review Required', 1500, false, 'High', 'Annual');

insert into public.payment_forecasts (tenant_id, vendor_name, expected_date, projected_amount, forecast_type)
values
('11111111-1111-1111-1111-111111111111', 'OpenAI', current_date + interval '5 days', 950, 'Credit top-up'),
('11111111-1111-1111-1111-111111111111', 'Supabase', current_date + interval '9 days', 1250, 'Monthly renewal'),
('11111111-1111-1111-1111-111111111111', 'Cloudflare', current_date + interval '23 days', 1680, 'Annual renewal');

insert into public.payment_receipts (payment_id, document_type, file_url, uploaded_by, reviewed_status)
select id, 'Provider invoice', null, 'CTO Command', 'Receipt Pending'
from public.payment_vault
where tenant_id = '11111111-1111-1111-1111-111111111111' and vendor_name = 'OpenAI credits';

insert into public.payment_audit_log (payment_id, actor, event, status, notes)
select id, 'CFO Command', 'CFO validation completed', 'Validated', 'OTP value is not stored or logged.'
from public.payment_vault
where tenant_id = '11111111-1111-1111-1111-111111111111' and vendor_name = 'OpenAI credits';

insert into public.warehouse_inventory (id, tenant_id, product_name, grade, batch_number, available_quantity, reserved_quantity, unit, warehouse_location, stock_status, last_updated)
values
('88000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Black Pepper', 'Grade A', 'BP2401', 1200, 400, 'KG', 'Warehouse A / Rack 03', 'Healthy', now()),
('88000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Turmeric Finger', 'Premium', 'TF2408', 850, 600, 'KG', 'Warehouse A / Rack 08', 'Reserved', now()),
('88000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Red Chilli', 'Export Grade', 'RC2410', 180, 0, 'KG', 'Warehouse B / Bin 11', 'Low Stock', now()),
('88000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Cumin Seeds', 'Sortex', 'CS2404', 0, 300, 'KG', 'Quality Hold Area', 'Quality Hold', now()),
('88000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Coriander Powder', 'Retail Pack', 'CP2402', 640, 0, 'KG', 'Warehouse C / Pack Zone', 'Dispatch Ready', now());

insert into public.stock_movements (tenant_id, movement_type, product_name, batch_number, quantity, linked_shipment_id, owner, status)
values
('11111111-1111-1111-1111-111111111111', 'Inward Stock', 'Black Pepper', 'BP2401', 1200, 'Pending allocation', 'Warehouse Manager', 'Monitoring'),
('11111111-1111-1111-1111-111111111111', 'Dispatch Allocation', 'Turmeric Finger', 'TF2408', 600, 'UAE-SHP-001', 'COO Command', 'Reserved'),
('11111111-1111-1111-1111-111111111111', 'Quality Hold', 'Cumin Seeds', 'CS2404', 300, 'Shipment blocked', 'Quality Control', 'Blocked'),
('11111111-1111-1111-1111-111111111111', 'Packing Material Issue', 'Export Bags', 'BAG-EXP-01', 500, 'UAE-SHP-001', 'Warehouse Staff', 'Attention');

insert into public.shipment_allocations (tenant_id, shipment_id, inventory_id, allocated_quantity, allocation_status)
values
('11111111-1111-1111-1111-111111111111', 'UAE-SHP-001', '88000000-0000-0000-0000-000000000001', 400, 'Attention'),
('11111111-1111-1111-1111-111111111111', 'OMN-SHP-002', '88000000-0000-0000-0000-000000000002', 600, 'Review Required'),
('11111111-1111-1111-1111-111111111111', 'VNM-SHP-003', '88000000-0000-0000-0000-000000000005', 240, 'Dispatch Ready');

insert into public.batch_tracking (tenant_id, batch_number, inward_date, supplier_name, quality_status, warehouse_location, stock_age, review_status)
values
('11111111-1111-1111-1111-111111111111', 'BP2401', current_date - 6, 'Malabar Spice Supplier', 'Passed', 'Warehouse A / Rack 03', '6 days', 'Active'),
('11111111-1111-1111-1111-111111111111', 'TF2408', current_date - 8, 'Nizam Agro', 'Passed', 'Warehouse A / Rack 08', '8 days', 'Reserved'),
('11111111-1111-1111-1111-111111111111', 'CS2404', current_date - 11, 'Gujarat Seeds Co', 'Hold', 'Quality Hold Area', '11 days', 'Quality Hold'),
('11111111-1111-1111-1111-111111111111', 'CD2405', current_date - 34, 'Kerala Cardamom House', 'Review', 'Secure Store', '34 days', 'Review Required');

insert into public.quality_holds (tenant_id, inventory_id, issue_type, severity, description, status)
values
('11111111-1111-1111-1111-111111111111', '88000000-0000-0000-0000-000000000004', 'Quality review', 'High', 'Cumin Seeds batch CS2404 on quality hold before allocation.', 'Blocked'),
('11111111-1111-1111-1111-111111111111', null, 'Packaging issue', 'Medium', 'Export bags below reorder threshold for UAE shipment cycle.', 'Attention'),
('11111111-1111-1111-1111-111111111111', '88000000-0000-0000-0000-000000000002', 'Batch mismatch', 'Low', 'Label check required before packing list finalization.', 'Monitoring');

insert into public.packing_materials (tenant_id, material_name, quantity, reorder_threshold, linked_shipment_demand, status)
values
('11111111-1111-1111-1111-111111111111', 'Export bags', 850, 1000, '1200 pcs for UAE cycle', 'Low Stock'),
('11111111-1111-1111-1111-111111111111', 'Cartons', 1900, 700, '400 pcs for retail packs', 'Healthy'),
('11111111-1111-1111-1111-111111111111', 'Labels', 4200, 1500, '800 pcs for current dispatch', 'Healthy'),
('11111111-1111-1111-1111-111111111111', 'Wrapping material', 12, 20, '8 rolls for dispatch queue', 'Attention');

insert into public.inventory_forecasts (tenant_id, product_name, forecast_type, projected_issue, severity, expected_date)
values
('11111111-1111-1111-1111-111111111111', 'Black Pepper', 'Projected shortage', 'Stock may fall below safe threshold in 5 days if UAE allocation expands.', 'Medium', current_date + 5),
('11111111-1111-1111-1111-111111111111', 'Export bags', 'Procurement alert', 'Packing bags require reorder before UAE shipment cycle.', 'High', current_date + 2),
('11111111-1111-1111-1111-111111111111', 'Cumin Seeds', 'Dispatch impact', 'Quality hold could block shipment allocation.', 'High', current_date);

insert into public.suppliers (id, tenant_id, supplier_name, location, contact_person, phone, email, whatsapp, products_supplied, reliability_score, status)
values
('99000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Malabar Spice Supplier', 'Kochi, Kerala', 'Anil Varma', '+91-90000-11001', 'procurement-demo@malabar.local', '+91-90000-11001', '["Black Pepper","Cardamom"]', 91, 'Active'),
('99000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Nizam Agro', 'Nizamabad, Telangana', 'Farooq Khan', '+91-90000-22002', 'sales-demo@nizamagro.local', '+91-90000-22002', '["Turmeric Finger","Turmeric Powder"]', 78, 'Pending Confirmation'),
('99000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Gujarat Seeds Co', 'Unjha, Gujarat', 'Mehul Patel', '+91-90000-33003', 'exports-demo@gujaratseeds.local', '+91-90000-33003', '["Cumin Seeds","Fennel Seeds"]', 64, 'Quality Issue');

insert into public.supplier_products (supplier_id, product_name, grade, available_quantity, unit, expected_ready_date, price_estimate, confirmation_status)
values
('99000000-0000-0000-0000-000000000001', 'Black Pepper', 'Grade A', 1800, 'KG', current_date + 3, 612, 'Available'),
('99000000-0000-0000-0000-000000000002', 'Turmeric Finger', 'Premium', 1200, 'KG', current_date + 4, null, 'Price Pending'),
('99000000-0000-0000-0000-000000000003', 'Cumin Seeds', 'Sortex', 600, 'KG', current_date + 5, 248, 'Quality Review');

insert into public.procurement_requests (tenant_id, product, quantity_needed, unit, required_date, linked_workflow_id, suggested_supplier, status, owner, priority)
values
('11111111-1111-1111-1111-111111111111', 'Black Pepper', 900, 'KG', current_date + 4, 'UAE-SHP-001', 'Malabar Spice Supplier', 'Quote Requested', 'COO Command', 'High'),
('11111111-1111-1111-1111-111111111111', 'Export Bags', 1200, 'pcs', current_date + 2, 'Warehouse Shortage', 'Packaging Vendor Demo', 'Supplier Contact Needed', 'Operations', 'Critical'),
('11111111-1111-1111-1111-111111111111', 'Turmeric Finger', 500, 'KG', current_date + 5, 'OMN-SHP-002', 'Nizam Agro', 'Confirmation Pending', 'COO Command', 'High');

insert into public.supplier_followups (supplier_id, product, required_confirmation, deadline, owner, escalation_level, status)
values
('99000000-0000-0000-0000-000000000002', 'Turmeric Finger', 'Confirm current price and ready date', now() + interval '6 hours', 'COO Command', 'Level 1', 'Pending Confirmation'),
('99000000-0000-0000-0000-000000000003', 'Cumin Seeds', 'Confirm quality grade correction', now() + interval '1 day', 'COO Command', 'Founder if unresolved', 'Quality Issue'),
('99000000-0000-0000-0000-000000000001', 'Black Pepper', 'Confirm dispatch-ready quantity', now() + interval '8 hours', 'COO Command', 'Level 1', 'Monitoring');

insert into public.supplier_price_history (supplier_id, product, grade, price, currency, quantity, date, notes)
values
('99000000-0000-0000-0000-000000000001', 'Black Pepper', 'Grade A', 612, 'INR', 900, current_date - 1, 'Stable supplier rate'),
('99000000-0000-0000-0000-000000000002', 'Turmeric Finger', 'Premium', 146, 'INR', 500, current_date - 4, 'Price revision expected'),
('99000000-0000-0000-0000-000000000003', 'Cumin Seeds', 'Sortex', 248, 'INR', 300, current_date - 6, 'Quality hold affected quote confidence');

insert into public.supplier_quality_issues (supplier_id, product, batch_number, issue, severity, supplier_response, resolution_status)
values
('99000000-0000-0000-0000-000000000003', 'Cumin Seeds', 'CS2404', 'Moisture variance in sample lot', 'High', 'Replacement sample requested', 'Under Review'),
('99000000-0000-0000-0000-000000000001', 'Cardamom', 'CD2405', 'Age review before high-value shipment', 'Medium', 'Supplier certificate pending', 'Escalated');

insert into public.supplier_memory (supplier_id, memory_type, content, source)
values
('99000000-0000-0000-0000-000000000001', 'preferred_supplier', 'Reliable black pepper source with stable response time.', 'Demo Memory'),
('99000000-0000-0000-0000-000000000003', 'quality_pattern', 'Cumin lots need stronger quality confirmation before allocation.', 'Demo Memory');

insert into public.buyers (id, tenant_id, buyer_name, company_name, country, email, phone, whatsapp, product_interests, relationship_status, risk_level, strategic_owner, operational_coordinator, commercial_risk_coordinator, technical_automation_support)
values
('aa000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ahmed Al Noor', 'Al Noor Trading', 'UAE', 'buyer-demo@alnoor.local', '+971-50-000-1101', '+971-50-000-1101', '["Black Pepper","Turmeric Finger"]', 'Quote Pending', 'Medium', 'CMO Command', 'COO Command', 'CFO Command', 'CTO Command'),
('aa000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Fatima Al Harthy', 'Oman Gulf Wholesale', 'Oman', 'procurement-demo@omangulf.local', '+968-9000-2202', '+968-9000-2202', '["Turmeric Finger","Cumin Seeds"]', 'Follow-up Due', 'Low', 'CMO Command', 'COO Command', 'CFO Command', 'CTO Command'),
('aa000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Linh Tran', 'Vietnam Spice Distribution', 'Vietnam', 'imports-demo@vnspice.local', '+84-900-3303', '+84-900-3303', '["Coriander Powder","Red Chilli"]', 'Monitoring', 'Medium', 'CMO Command', 'COO Command', 'CFO Command', 'CTO Command'),
('aa000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Oliver Grant', 'Southern Organics Pty', 'Australia', 'sourcing-demo@southernorganics.local', '+61-400-000-404', '+61-400-000-404', '["Cardamom","Organic Claims"]', 'Risk Review', 'High', 'CMO Command', 'COO Command', 'CFO Command', 'CTO Command');

insert into public.buyer_enquiries (buyer_id, product, quantity, destination, source, status, linked_pricing_request_id)
values
('aa000000-0000-0000-0000-000000000001', 'Black Pepper', '2 tons', 'UAE', 'WhatsApp Demo', 'Pricing Review', '33333333-3333-3333-3333-333333333333'),
('aa000000-0000-0000-0000-000000000002', 'Turmeric Finger', '5 tons', 'Oman', 'Website Form', 'Draft', null),
('aa000000-0000-0000-0000-000000000003', 'Coriander Powder', '1.5 tons', 'Vietnam', 'Trade Directory', 'Monitoring', null);

insert into public.buyer_quote_history (buyer_id, quote_id, product, quantity, quoted_price, margin, status, approval_state, expiry_date)
values
('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Black Pepper', '2 tons', 18400, 12, 'CFO Review', 'Founder Approval', current_date + 5),
('aa000000-0000-0000-0000-000000000002', null, 'Turmeric Finger', '5 tons', 9250, 10, 'Draft', 'CFO Review', current_date + 7),
('aa000000-0000-0000-0000-000000000003', null, 'Coriander Powder', '1.5 tons', 6800, 14, 'Revised', 'Monitoring', current_date - 1);

insert into public.buyer_invoice_history (buyer_id, invoice_id, invoice_number, invoice_type, value, status, approval_state)
values
('aa000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'GOPU-INV-DRAFT-001', 'Export Tax Invoice under LUT', 18400, 'Draft', 'Founder Review Required'),
('aa000000-0000-0000-0000-000000000002', null, 'GOPU-PI-DEMO-002', 'Proforma Invoice', 9250, 'Draft', 'CFO Review'),
('aa000000-0000-0000-0000-000000000003', null, 'GOPU-CI-DEMO-003', 'Commercial Invoice', 6800, 'Validation Failed', 'Revision Required');

insert into public.buyer_shipment_history (buyer_id, shipment_id, product, quantity, destination, status, eta, risk_state)
values
('aa000000-0000-0000-0000-000000000001', 'UAE-SHP-001', 'Black Pepper', '2 tons', 'UAE', 'Planning', current_date + 13, 'Attention'),
('aa000000-0000-0000-0000-000000000002', 'OMN-SHP-002', 'Turmeric Finger', '5 tons', 'Oman', 'Documentation', current_date + 17, 'Monitoring'),
('aa000000-0000-0000-0000-000000000003', 'VNM-SHP-003', 'Coriander Powder', '1.5 tons', 'Vietnam', 'Dispatch Ready', current_date + 20, 'Low');

insert into public.buyer_followups (buyer_id, reason, due_date, owner, priority, status, next_action)
values
('aa000000-0000-0000-0000-000000000001', 'Quote follow-up', now() + interval '6 hours', 'COO Command', 'High', 'Follow-up Due', 'Confirm destination port and payment terms'),
('aa000000-0000-0000-0000-000000000002', 'Payment term clarification', now() + interval '1 day', 'CFO Command', 'Medium', 'Monitoring', 'Clarify advance payment preference'),
('aa000000-0000-0000-0000-000000000004', 'Origin claim review', now() + interval '4 hours', 'CMO + Founder', 'Critical', 'Risk Review', 'Route organic/origin claim to Approval Wall');

insert into public.buyer_preferences (buyer_id, preferred_product, preferred_packing, preferred_incoterm, preferred_payment_terms, preferred_currency, communication_channel, document_requirements)
values
('aa000000-0000-0000-0000-000000000001', 'Black Pepper / Turmeric Finger', '25 KG export bags', 'CIF', 'Advance preferred / clarify per quote', 'USD', 'WhatsApp + email draft', 'Invoice, Packing List, COO draft, LUT details snapshot'),
('aa000000-0000-0000-0000-000000000002', 'Turmeric Finger', '50 KG bags', 'CIF', 'Advance payment recommended', 'USD', 'Email', 'Proforma invoice and packing details'),
('aa000000-0000-0000-0000-000000000004', 'Cardamom', 'Retail-ready cartons', 'FOB', 'Founder review required', 'AUD', 'Email', 'Origin/legal claim review before documents');

insert into public.buyer_memory (buyer_id, memory_type, content, source, approved_by_founder)
values
('aa000000-0000-0000-0000-000000000001', 'pricing_sensitivity', 'Buyer responds well to quote assumptions separated from freight assumptions.', 'Demo Memory', false),
('aa000000-0000-0000-0000-000000000002', 'payment_preference', 'Clarify advance payment terms before final quotation.', 'Demo Memory', false),
('aa000000-0000-0000-0000-000000000004', 'risk_pattern', 'Organic/origin claims require founder review before marketing or document use.', 'Demo Memory', false);

insert into public.analytics_snapshots (tenant_id, snapshot_type, summary_data)
values
('11111111-1111-1111-1111-111111111111', 'founder_intelligence_demo', '{"active_workflows":34,"pending_approvals":9,"revenue_pipeline_placeholder":"USD 56.4K","high_risk_alerts":4}');

insert into public.operational_metrics (tenant_id, metric_name, metric_value, status)
values
('11111111-1111-1111-1111-111111111111', 'Workflow completion', '72%', 'Monitoring'),
('11111111-1111-1111-1111-111111111111', 'Blocked workflows', '6', 'Attention'),
('11111111-1111-1111-1111-111111111111', 'Overdue tasks', '4', 'High Risk');

insert into public.commercial_metrics (tenant_id, product, margin, risk_level)
values
('11111111-1111-1111-1111-111111111111', 'Black Pepper', 12.4, 'Monitoring'),
('11111111-1111-1111-1111-111111111111', 'Turmeric Finger', 10.0, 'Attention'),
('11111111-1111-1111-1111-111111111111', 'Cumin Seeds', 8.2, 'High Risk');

insert into public.shipment_metrics (tenant_id, shipment_id, current_stage, delay_status)
values
('11111111-1111-1111-1111-111111111111', 'UAE-SHP-001', 'Planning', 'Attention'),
('11111111-1111-1111-1111-111111111111', 'OMN-SHP-002', 'Documentation', 'Monitoring');

insert into public.buyer_analytics (tenant_id, buyer_id, relationship_score, quote_conversion, risk_level)
values
('11111111-1111-1111-1111-111111111111', 'aa000000-0000-0000-0000-000000000001', 84, 31, 'Medium'),
('11111111-1111-1111-1111-111111111111', 'aa000000-0000-0000-0000-000000000004', 77, 18, 'High');

insert into public.supplier_analytics (tenant_id, supplier_id, reliability_score, delay_frequency, quality_score)
values
('11111111-1111-1111-1111-111111111111', '99000000-0000-0000-0000-000000000001', 91, 1, 88),
('11111111-1111-1111-1111-111111111111', '99000000-0000-0000-0000-000000000003', 64, 3, 58);

insert into public.technical_metrics (tenant_id, api_health, automation_health, incident_count)
values ('11111111-1111-1111-1111-111111111111', 'Monitoring', 'Attention', 3);

insert into public.marketing_metrics (tenant_id, campaign_name, content_status, engagement_placeholder)
values
('11111111-1111-1111-1111-111111111111', 'UAE spice importer outreach', 'Draft', 'Placeholder only'),
('11111111-1111-1111-1111-111111111111', 'LinkedIn export content', 'Founder Approval Required', 'Placeholder only');

insert into public.strategic_recommendations (tenant_id, recommendation_type, summary, severity)
values
('11111111-1111-1111-1111-111111111111', 'Commercial', 'Increase black pepper margin threshold for UAE shipments until freight stabilizes.', 'High'),
('11111111-1111-1111-1111-111111111111', 'Operations', 'Improve document readiness before shipment planning starts.', 'Medium'),
('11111111-1111-1111-1111-111111111111', 'Technology', 'Review API credit usage trend before automation volume increases.', 'Medium');

insert into public.executive_commands (tenant_id, name, title, role, status, current_focus, key_modules, route, last_checked_at)
values
('11111111-1111-1111-1111-111111111111', 'COO Command', 'Chief Operating Officer', 'Operations execution and workflow discipline', 'Monitoring', 'Shipment execution, document accuracy, supplier follow-up.', '["Orders","Documentation","Logistics","SOP Improvement"]', '/export-os/executives/coo', now()),
('11111111-1111-1111-1111-111111111111', 'CTO Command', 'Chief Technology Officer', 'Systems, integrations, automations, and platform reliability', 'Monitoring', 'Integration health, API usage, automation safety.', '["Integrations","Monitoring","Automation","Security"]', '/export-os/executives/cto', now()),
('11111111-1111-1111-1111-111111111111', 'CFO Command', 'Chief Financial Officer', 'Pricing, margins, risk, and commercial discipline', 'Review Active', 'Quote margins, cash safety, FX exposure.', '["Pricing","Margins","Cash","Risk"]', '/export-os/executives/cfo', now()),
('11111111-1111-1111-1111-111111111111', 'CMO Command', 'Chief Marketing Officer', 'Growth, content, campaigns, and brand approvals', 'Draft Prepared', 'Buyer outreach, content runbook, brand claim review.', '["Content","Campaigns","Buyer Outreach","Brand Approval"]', '/export-os/executives/cmo', now());

insert into public.company_profiles (tenant_id, company_display_name, legal_company_name, business_type, country, state, city, registered_address, operating_address, phone, email, website, authorized_person, status)
values ('11111111-1111-1111-1111-111111111111', 'GOPU Exports', 'GOPU Exports Private Limited Demo', 'Exporter', 'India', 'Demo State', 'Demo City', 'Demo registered address', 'Demo operating address', '+91-00000-00000', 'demo@gopu.local', 'https://example.local', 'Sukesh Reddy', 'Draft');

insert into public.lut_details (tenant_id, lut_arn, financial_year, status, founder_verified)
values ('11111111-1111-1111-1111-111111111111', null, '2026-2027', 'Draft', false);

insert into public.document_defaults (tenant_id, invoice_prefix, quotation_prefix, default_currency, default_payment_terms, default_incoterm, default_port_loading, default_bank_masked, authorized_signatory, email_footer, buyer_document_note)
values ('11111111-1111-1111-1111-111111111111', 'GOPU-INV', 'GOPU-QTN', 'USD', 'Advance / founder review required', 'CIF', 'Demo Port', 'XXXX-XXXX-4321', 'Sukesh Reddy', 'Demo footer only', 'Draft document until founder approval.');

insert into public.lead_intake (id, tenant_id, source, buyer_name, company_name, country, product, quantity, unit, destination_port, shipping_mode, incoterm, status, assigned_to)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'WhatsApp Demo', 'Al Noor Trading', 'Al Noor Trading', 'UAE', 'Black Pepper', 2, 'tons', null, 'Sea', null, 'Draft', 'COO Command');

insert into public.pricing_requests (id, tenant_id, lead_id, buyer_name, product, quantity, destination, incoterm, product_cost, freight_cost, margin_target, currency, status)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Al Noor Trading', 'Black Pepper', 2, 'UAE', 'CIF', 0, 0, 12, 'USD', 'CFO Review');

insert into public.quote_drafts (id, tenant_id, buyer_name, quote_number, quote_data, approval_status, founder_review_required)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Al Noor Trading', 'GOPU-QTN-DEMO-001', '{"mode":"demo","product":"Black Pepper"}', 'Founder Approval Required', true);

insert into public.invoices (id, tenant_id, invoice_type, invoice_number, financial_year, status, approval_status, lead_id, quote_id, export_mode, currency, subtotal, tax_total, grand_total, amount_in_words)
values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Export Tax Invoice under LUT', 'GOPU-INV-DRAFT-001', '2026-2027', 'Draft', 'Founder Review Required', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'LUT/Bond Without IGST', 'USD', 0, 0, 0, 'Zero only demo draft');

insert into public.approval_requests (tenant_id, request_type, department, executive_owner, buyer_name, related_workflow_id, risk_level, priority, status, summary, details)
values ('11111111-1111-1111-1111-111111111111', 'Invoice Approval', 'Documents', 'CFO Command', 'Al Noor Trading', '55555555-5555-5555-5555-555555555555', 'High', 'Critical', 'Review Pending', 'LUT invoice release blocked by incomplete LUT details.', '{"reason":"LUT incomplete","mode":"demo"}');

insert into public.tasks (tenant_id, title, description, workflow_source, linked_record_id, department, owner_command, assigned_to, priority, status, due_date, escalation_level, blocking_reason)
values
('11111111-1111-1111-1111-111111111111', 'Complete LUT data before invoice release', 'Invoice can remain draft only until LUT data is complete.', 'Invoice System', '55555555-5555-5555-5555-555555555555', 'Finance', 'CFO Command', 'Founder / Finance', 'Critical', 'Blocked', current_date, 'Founder Review Required', 'LUT ARN/document/founder verification missing'),
('11111111-1111-1111-1111-111111111111', 'Review pricing margin for black pepper quote', 'CFO review needed before quote release.', 'Pricing Engine', '33333333-3333-3333-3333-333333333333', 'Finance', 'CFO Command', 'CFO Command', 'High', 'Waiting Review', current_date, 'Founder if margin threshold breach remains', null);

insert into public.platform_health (tenant_id, system_name, status, latency, failure_count, last_checked_at)
values
('11111111-1111-1111-1111-111111111111', 'Forex Feed', 'Monitoring', 220, 1, now()),
('11111111-1111-1111-1111-111111111111', 'OpenAI', 'Credits Low', 180, 0, now());

insert into public.integration_services (tenant_id, service_name, environment, masked_key, status, usage_percentage, quota_remaining, last_verified)
values
('11111111-1111-1111-1111-111111111111', 'OpenAI', 'Production', 'sk-proj-****A92X', 'Credits Low', 82, 18, now()),
('11111111-1111-1111-1111-111111111111', 'Supabase', 'Production', 'sb-pub-****7KQ2', 'Monitoring', 46, 54, now());

insert into public.workflow_automations (tenant_id, workflow_name, status, trigger_type, last_execution, success_rate, failure_count, retry_state)
values
('11111111-1111-1111-1111-111111111111', 'Lead Intake Automation', 'Active', 'Lead Created', now(), 94, 1, 'Monitoring'),
('11111111-1111-1111-1111-111111111111', 'Pricing Approval Automation', 'Monitoring', 'Margin Risk Detected', now(), 91, 0, 'Waiting Approval'),
('11111111-1111-1111-1111-111111111111', 'Invoice Validation Automation', 'Attention', 'Invoice Draft Created', now(), 88, 2, 'Retry Pending'),
('11111111-1111-1111-1111-111111111111', 'WhatsApp Command Parser', 'Demo Mode', 'Inbound Founder Message', now(), 90, 0, 'Monitoring');

insert into public.workflow_events (tenant_id, event_type, source_module, target_module, workflow_id, status, payload)
values
('11111111-1111-1111-1111-111111111111', 'Lead Created', 'Lead Intake', 'COO Command', null, 'Monitoring', '{"product":"Black Pepper","destination":"UAE"}'),
('11111111-1111-1111-1111-111111111111', 'Invoice Validation Failed', 'Invoice System', 'Task Engine', null, 'Attention', '{"reason":"LUT details incomplete"}'),
('11111111-1111-1111-1111-111111111111', 'Founder Approval Requested', 'Pricing Engine', 'Approval Wall', null, 'Waiting Approval', '{"reason":"Margin threshold review"}');

insert into public.automation_logs (tenant_id, workflow_name, execution_time, status, retry_count, failure_reason, affected_module)
values
('11111111-1111-1111-1111-111111111111', 'Pricing Approval Automation', now(), 'Waiting Approval', 0, null, 'Pricing Engine'),
('11111111-1111-1111-1111-111111111111', 'Invoice Validation Automation', now(), 'Blocked', 1, 'LUT validation blocked release.', 'Invoice System');

insert into public.automation_failures (tenant_id, workflow_name, severity, failure_reason, escalation_target, retry_state)
values
('11111111-1111-1111-1111-111111111111', 'API Monitoring Alerts', 'High', 'Forex feed timeout detected in demo monitor.', 'CTO Command', 'Retry Pending'),
('11111111-1111-1111-1111-111111111111', 'Invoice Validation Automation', 'Critical', 'LUT data incomplete for draft invoice release.', 'CFO Command + Founder', 'Blocked');

insert into public.automation_rules (tenant_id, rule_name, trigger_condition, target_action, escalation_path, active_status)
values
('11111111-1111-1111-1111-111111111111', 'Overdue task owner notification', 'Task overdue by 1 day', 'Notify owner', 'Owner', 'Active'),
('11111111-1111-1111-1111-111111111111', 'Invoice blocked escalation', 'Invoice release validation blocked', 'Create task and founder attention flag', 'CFO Command + Founder', 'Active'),
('11111111-1111-1111-1111-111111111111', 'Risky marketing claim approval', 'Public claim requires approval', 'Create approval request', 'CMO Command + Founder', 'Active');

insert into public.workflow_memory (tenant_id, memory_type, content, recurring_pattern)
values
('11111111-1111-1111-1111-111111111111', 'Retry Pattern', 'Forex checks and invoice validation are recurring automation attention points in demo mode.', 'Weekly'),
('11111111-1111-1111-1111-111111111111', 'Approval Bottleneck', 'Pricing and LUT invoice releases frequently require founder review before buyer-facing output.', 'Daily');

insert into public.content_items (tenant_id, platform, title, content_type, hook, body, status, approval_required, scheduled_at)
values ('11111111-1111-1111-1111-111111111111', 'LinkedIn', 'Export documentation discipline', 'Post', 'Clean documents protect buyer trust.', 'Demo draft only.', 'Ready for Review', true, now() + interval '1 day');

insert into public.founder_briefings (id, tenant_id, briefing_date, briefing_status, generated_at)
values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', current_date, 'Attention', now());

insert into public.briefing_alerts (tenant_id, briefing_id, alert_type, severity, message, department)
values ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Compliance', 'High Risk', 'LUT invoice release blocked by incomplete LUT details.', 'Documents');

insert into public.whatsapp_commands (tenant_id, sender, raw_message, command_type, parse_status, workflow_status)
values ('11111111-1111-1111-1111-111111111111', 'Founder', 'Buyer: Al Noor Trading, Product: Black Pepper, Quantity: 2 tons, Destination: UAE, Deadline: Friday, Shipping: Sea.', 'New Buyer Lead', 'Parsed', 'Routing Prepared');

insert into public.system_audit_log (tenant_id, actor, module, action, record_type, record_id, previous_status, new_status, notes)
values ('11111111-1111-1111-1111-111111111111', 'System Seed', 'Backend Foundation', 'seed_created', 'tenant', '11111111-1111-1111-1111-111111111111', null, 'Demo Mode', 'Safe demo data only. No raw secrets or real bank data.');
