export type Platform = 'instagram' | 'facebook' | 'linkedin';
export type WorkflowStatus = 'pending' | 'generating' | 'awaiting_approval' | 'approved' | 'rejected' | 'publishing' | 'published' | 'failed';
export type AuditLevel = 'info' | 'warning' | 'error';

export const platforms: Platform[] = ['instagram', 'facebook', 'linkedin'];

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

export function boolEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

export function publicConfigStatus() {
  return {
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    imageProvider: optionalEnv('IMAGE_PROVIDER', 'openai'),
    r2Configured: Boolean(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE_URL),
    slackConfigured: Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID && process.env.SLACK_SIGNING_SECRET),
    metaInstagramConfigured: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID),
    metaFacebookConfigured: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_FACEBOOK_PAGE_ID),
    linkedinEnabled: boolEnv('LINKEDIN_ENABLED', false),
    linkedinConfigured: boolEnv('LINKEDIN_ENABLED', false) && Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_OWNER_URN),
    dailyCronUtc: optionalEnv('DAILY_JOB_CRON_UTC', '30 2 * * *')
  };
}
