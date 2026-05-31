function env(name) {
  return process.env[name]?.trim() || "";
}

function group(names) {
  const missing = names.filter((name) => !env(name));
  return { configured: missing.length === 0, missing };
}

export function checkCmoEnv() {
  return {
    supabase: group(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]),
    linkedin: group(["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI", "LINKEDIN_ACCESS_TOKEN"]),
    meta: group(["META_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID", "FACEBOOK_PAGE_ID"]),
    openai: group(["OPENAI_API_KEY"]),
    slack: group(["SLACK_WEBHOOK_URL", "SLACK_BOT_TOKEN"]),
    cron: group(["CRON_SECRET"])
  };
}
