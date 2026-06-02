-- CMO Canva workflow configuration.
-- Template IDs are stored in platform_integrations.config and can be overridden by env vars.

insert into public.platform_integrations (
  tenant_id,
  platform,
  platform_key,
  platform_name,
  logo_key,
  provider,
  status,
  runtime,
  config,
  metadata,
  last_checked_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Canva',
  'canva',
  'Canva',
  'canva',
  'Canva Connect API',
  'configured',
  'server',
  jsonb_build_object(
    'required_for_cmo', true,
    'export_width', 1080,
    'export_height', 1350,
    'export_formats', jsonb_build_object(
      'LinkedIn', 'png',
      'LinkedIn Personal', 'png',
      'Facebook', 'jpg'
    ),
    'templates', jsonb_build_object(
      'knowledge_carousel', '',
      'shipment_announcement', '',
      'market_update', '',
      'product_spotlight', '',
      'buyer_education', ''
    ),
    'required_template_fields', jsonb_build_array(
      'headline',
      'slide_1_heading',
      'slide_1_body',
      'slide_2_heading',
      'slide_2_body',
      'slide_3_heading',
      'slide_3_body',
      'caption',
      'website',
      'linkedin_page_name',
      'logo'
    )
  ),
  jsonb_build_object(
    'brand', jsonb_build_object(
      'company_name', 'GOPU EXPORTS',
      'website', 'www.gopuexports.com',
      'linkedin_page_name', 'GOPU Exports',
      'colors', jsonb_build_object(
        'navy', '#0D2A4A',
        'gold', '#D4AF37',
        'white', '#FFFFFF'
      )
    ),
    'ai_generation_scope', jsonb_build_array('headline', 'slide_content', 'caption', 'hashtags'),
    'graphics_renderer', 'canva',
    'no_ai_image_text', true
  ),
  now()
)
on conflict (platform_key) do update
set platform_name = excluded.platform_name,
    provider = excluded.provider,
    runtime = excluded.runtime,
    status = coalesce(public.platform_integrations.status, excluded.status),
    config = public.platform_integrations.config || excluded.config,
    metadata = public.platform_integrations.metadata || excluded.metadata,
    last_checked_at = now();

notify pgrst, 'reload schema';
