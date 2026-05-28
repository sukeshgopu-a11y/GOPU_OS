export const ctoProviderEnvMap = {
  openai: {
    primary: 'CTO_PROVIDER_OPENAI_API_KEY',
    aliases: [
      'CTO_PROVIDER_OPENAI_API_KEY',
      'CTO_OPENAI_API_KEY',
      'GOPU_CTO_OPENAI_API_KEY',
      'OPENAI_API_KEY'
    ]
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
  instagram: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
  },
  facebook: {
    primary: 'META_ACCESS_TOKEN',
    aliases: ['META_ACCESS_TOKEN']
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
