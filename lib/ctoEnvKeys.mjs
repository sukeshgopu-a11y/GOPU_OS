export const ctoProviderEnvMap = {
  openai: {
    primary: 'VITE_OPENAI_API_KEY',
    aliases: [
      'VITE_OPENAI_API_KEY',
      'CTO_PROVIDER_OPENAI_API_KEY',
      'CTO_OPENAI_API_KEY',
      'GOPU_CTO_OPENAI_API_KEY',
      'OPENAI_API_KEY'
    ]
  },
  supabase_url: {
    primary: 'VITE_SUPABASE_URL',
    aliases: ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']
  },
  supabase_anon_key: {
    primary: 'VITE_SUPABASE_ANON_KEY',
    aliases: ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']
  },
  slack_bot_token: {
    primary: 'SLACK_BOT_TOKEN',
    aliases: ['SLACK_BOT_TOKEN']
  },
  slack_channel_id: {
    primary: 'SLACK_CHANNEL_ID',
    aliases: ['SLACK_CHANNEL_ID']
  },
  slack_signing_secret: {
    primary: 'SLACK_SIGNING_SECRET',
    aliases: ['SLACK_SIGNING_SECRET']
  },
  twilio_account_sid: {
    primary: 'TWILIO_ACCOUNT_SID',
    aliases: ['TWILIO_ACCOUNT_SID']
  },
  twilio_auth_token: {
    primary: 'TWILIO_AUTH_TOKEN',
    aliases: ['TWILIO_AUTH_TOKEN']
  },
  heygen: {
    primary: 'CTO_PROVIDER_HEYGEN_API_KEY',
    aliases: [
      'CTO_PROVIDER_HEYGEN_API_KEY',
      'CTO_HEYGEN_API_KEY',
      'GOPU_CTO_HEYGEN_API_KEY',
      'HEYGEN_API_KEY'
    ]
  },
  slack: {
    primary: 'SLACK_WEBHOOK_URL',
    aliases: ['SLACK_WEBHOOK_URL']
  },
  resend: {
    primary: 'RESEND_API_KEY',
    aliases: ['RESEND_API_KEY']
  },
  supabase: {
    primary: 'SUPABASE_SERVICE_ROLE_KEY',
    aliases: ['SUPABASE_SERVICE_ROLE_KEY']
  },
  whatsapp: {
    primary: 'WHATSAPP_API_TOKEN',
    aliases: ['WHATSAPP_API_TOKEN']
  },
  cloudflare: {
    primary: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    aliases: ['CLOUDFLARE_R2_SECRET_ACCESS_KEY']
  },
  vercel: {
    primary: 'VERCEL_TOKEN',
    aliases: ['VERCEL_TOKEN']
  },
  linkedin: {
    primary: 'LINKEDIN_ACCESS_TOKEN',
    aliases: ['LINKEDIN_ACCESS_TOKEN']
  },
  linkedin_client_id: {
    primary: 'LINKEDIN_CLIENT_ID',
    aliases: ['LINKEDIN_CLIENT_ID']
  },
  linkedin_client_secret: {
    primary: 'LINKEDIN_CLIENT_SECRET',
    aliases: ['LINKEDIN_CLIENT_SECRET']
  },
  linkedin_redirect_uri: {
    primary: 'LINKEDIN_REDIRECT_URI',
    aliases: ['LINKEDIN_REDIRECT_URI']
  },
  linkedin_author_urn: {
    primary: 'LINKEDIN_AUTHOR_URN',
    aliases: ['LINKEDIN_AUTHOR_URN']
  },
  linkedin_organization_id: {
    primary: 'LINKEDIN_ORGANIZATION_ID',
    aliases: ['LINKEDIN_ORGANIZATION_ID']
  },
  linkedin_person_urn: {
    primary: 'LINKEDIN_PERSON_URN',
    aliases: ['LINKEDIN_PERSON_URN']
  },
  meta: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
  },
  meta_access_token: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
  },
  instagram: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
  },
  instagram_business_account_id: {
    primary: 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    aliases: ['INSTAGRAM_BUSINESS_ACCOUNT_ID']
  },
  facebook: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
  },
  facebook_page_id: {
    primary: 'FACEBOOK_PAGE_ID',
    aliases: ['FACEBOOK_PAGE_ID']
  },
  youtube: {
    primary: 'YOUTUBE_API_KEY',
    aliases: ['YOUTUBE_API_KEY']
  },
  forex: {
    primary: 'FOREX_API_KEY',
    aliases: ['FOREX_API_KEY']
  },
  news: {
    primary: 'NEWS_API_KEY',
    aliases: ['NEWS_API_KEY']
  }
};

export function getCtoProviderEnvConfig(serviceId = '') {
  const key = String(serviceId || '').trim().toLowerCase();
  return ctoProviderEnvMap[key] || null;
}
