function hasEnv(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]));
}

function partialEnv(...names: string[]) {
  const count = names.filter((name) => Boolean(process.env[name])).length;
  return count > 0 && count < names.length;
}

function statusRow(service: string, status: string, message: string) {
  return {
    service,
    status,
    message,
    last_checked: new Date().toISOString()
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const slackNames = ["SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID", "SLACK_SIGNING_SECRET"];
  const twilioNames = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"];

  const rows = [
    statusRow(
      "Supabase",
      hasEnv("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY") || hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "live" : "unconfigured",
      hasEnv("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY") || hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
        ? "Supabase URL and anon key configured"
        : "Missing Supabase URL or anon key"
    ),
    statusRow(
      "OpenAI",
      hasEnv("VITE_OPENAI_API_KEY") || hasEnv("OPENAI_API_KEY") || hasEnv("CTO_PROVIDER_OPENAI_API_KEY") ? "live" : "unconfigured",
      hasEnv("VITE_OPENAI_API_KEY") || hasEnv("OPENAI_API_KEY") || hasEnv("CTO_PROVIDER_OPENAI_API_KEY") ? "OpenAI key configured" : "Missing OpenAI API key"
    ),
    statusRow(
      "Slack",
      hasEnv(...slackNames) ? "live" : partialEnv(...slackNames) ? "partial" : "unconfigured",
      hasEnv(...slackNames) ? "Slack bot, channel, and signing secret configured" : partialEnv(...slackNames) ? "Slack config partially set" : "Missing Slack bot, channel, and signing secret"
    ),
    statusRow(
      "Resend",
      hasEnv("RESEND_API_KEY") ? "live" : "unconfigured",
      hasEnv("RESEND_API_KEY") ? "Resend API key configured" : "Missing RESEND_API_KEY"
    ),
    statusRow(
      "Twilio",
      hasEnv(...twilioNames) ? "live" : partialEnv(...twilioNames) ? "partial" : "unconfigured",
      hasEnv(...twilioNames) ? "Twilio SID and auth token configured" : partialEnv(...twilioNames) ? "Twilio config partially set" : "Missing Twilio SID or auth token"
    ),
    statusRow(
      "Vercel",
      hasEnv("VERCEL_URL") || hasEnv("VERCEL") ? "live" : "unconfigured",
      hasEnv("VERCEL_URL") || hasEnv("VERCEL") ? "Vercel runtime detected" : "Local development runtime"
    )
  ];

  return res.status(200).json({ ok: true, data: rows });
}
