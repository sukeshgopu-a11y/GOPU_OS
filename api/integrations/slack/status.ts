function env(name: string) {
  return process.env[name]?.trim() || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({
      platform_key: "slack",
      platform_name: "Slack Approval",
      provider: "slack",
      status: "error",
      runtime: "slack_block_kit",
      error_message: "Method not allowed"
    });
    return;
  }

  const botTokenConfigured = Boolean(env("SLACK_BOT_TOKEN"));
  const channelConfigured = Boolean(env("SLACK_CHANNEL_ID"));
  const channelDisplay = env("SLACK_CHANNEL_NAME_FOR_DISPLAY") || "#all-gopu-os";
  const signingSecretConfigured = Boolean(env("SLACK_SIGNING_SECRET"));
  const approvalWebhookConfigured = Boolean(env("SLACK_APPROVAL_WEBHOOK_URL") || env("SLACK_WEBHOOK_URL"));
  const live = botTokenConfigured && channelConfigured && signingSecretConfigured && approvalWebhookConfigured;

  res.status(200).json({
    platform_key: "slack",
    platform_name: "Slack Approval",
    provider: "slack",
    channel_display: channelDisplay,
    status: live ? "live" : "error",
    runtime: "slack_block_kit",
    error_message: live ? null : "Missing Slack approval config.",
    last_success_at: live ? new Date().toISOString() : null,
    required_config: {
      bot_token_configured: botTokenConfigured,
      channel_configured: channelConfigured,
      signing_secret_configured: signingSecretConfigured,
      approval_webhook_configured: approvalWebhookConfigured
    },
    source: "slack_status_endpoint"
  });
}
