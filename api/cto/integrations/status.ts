import { getCtoProviderSecret } from "../../../lib/ctoProviderVault.mjs";
import { getCanvaConnectionStatus } from "../../../lib/cmoCanvaWorkflow.mjs";

function hasEnv(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]));
}

function statusRow(service: string, status: string, message: string) {
  return {
    service,
    status,
    message,
    last_checked: new Date().toISOString()
  };
}

function isResolved(provider: string) {
  return getCtoProviderSecret(provider).ok;
}

function areResolved(...providers: string[]) {
  return providers.every((provider) => isResolved(provider));
}

function arePartiallyResolved(...providers: string[]) {
  const count = providers.filter((provider) => isResolved(provider)).length;
  return count > 0 && count < providers.length;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const supabaseProviders = ["supabase_url", "supabase_anon_key"];
  const slackProviders = ["slack_bot_token", "slack_channel_id", "slack_signing_secret"];
  const twilioProviders = ["twilio_account_sid", "twilio_auth_token"];
  const supabaseReady = areResolved(...supabaseProviders);
  const openAiReady = isResolved("openai");
  const slackReady = areResolved(...slackProviders);
  const slackPartial = arePartiallyResolved(...slackProviders);
  const resendReady = isResolved("resend");
  const twilioReady = areResolved(...twilioProviders);
  const twilioPartial = arePartiallyResolved(...twilioProviders);
  const vercelReady = isResolved("vercel") || hasEnv("VERCEL_URL") || hasEnv("VERCEL");
  const canvaStatus = await getCanvaConnectionStatus();

  const rows = [
    statusRow(
      "Supabase",
      supabaseReady ? "live" : "unconfigured",
      supabaseReady
        ? "Supabase URL and anon key configured"
        : "Missing Supabase URL or anon key"
    ),
    statusRow(
      "OpenAI",
      openAiReady ? "live" : "unconfigured",
      openAiReady ? "OpenAI key configured" : "Missing OpenAI API key"
    ),
    statusRow(
      "Slack",
      slackReady ? "live" : slackPartial ? "partial" : "unconfigured",
      slackReady ? "Slack bot, channel, and signing secret configured" : slackPartial ? "Slack config partially set" : "Missing Slack bot, channel, and signing secret"
    ),
    statusRow(
      "Resend",
      resendReady ? "live" : "unconfigured",
      resendReady ? "Resend API key configured" : "Missing RESEND_API_KEY"
    ),
    statusRow(
      "Twilio",
      twilioReady ? "live" : twilioPartial ? "partial" : "unconfigured",
      twilioReady ? "Twilio SID and auth token configured" : twilioPartial ? "Twilio config partially set" : "Missing Twilio SID or auth token"
    ),
    statusRow(
      "Vercel",
      vercelReady ? "live" : "unconfigured",
      vercelReady ? "Vercel runtime detected" : "Local development runtime"
    ),
    statusRow(
      "Canva",
      ["live", "configured"].includes(canvaStatus.status) ? "live" : canvaStatus.status === "partial" ? "partial" : "unconfigured",
      canvaStatus.error_message || "Canva Connect API configured for CMO template rendering"
    )
  ];

  return res.status(200).json({ ok: true, data: rows });
}
