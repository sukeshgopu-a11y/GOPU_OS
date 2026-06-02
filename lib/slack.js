import { cleanSlackText, compactSlackValue } from "./slackTextClean.js";

const allowedPriorities = ["INFO", "WARNING", "URGENT"];

function getSlackWebhookUrl() {
  return process.env.SLACK_WEBHOOK_URL?.trim() || process.env.SLACK_APPROVAL_WEBHOOK_URL?.trim() || "";
}

function getSlackBotConfig() {
  return {
    token: process.env.SLACK_BOT_TOKEN?.trim() || "",
    channel: process.env.SLACK_CHANNEL_ID?.trim() || ""
  };
}

function isValidSlackWebhook(url) {
  return /^https:\/\/hooks\.slack(?:-gov)?\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9_-]+$/i.test(url);
}

function isValidSlackBotToken(token) {
  return /^xoxb-[A-Za-z0-9-]+$/i.test(token);
}

function isValidSlackChannelId(channelId) {
  return /^[CGD][A-Z0-9]+$/i.test(channelId);
}

function normalizePriority(priority) {
  return priority && allowedPriorities.includes(priority) ? priority : "INFO";
}

function priorityPrefix(priority) {
  if (priority === "URGENT") return ":rotating_light:";
  if (priority === "WARNING") return ":warning:";
  return ":information_source:";
}

function formatSlackMessage({ title, type, message, priority = "INFO" }) {
  const normalizedPriority = normalizePriority(priority);
  const cleanTitle = compactSlackValue(title, "GOPU OS Alert");
  const cleanType = compactSlackValue(type || "Operational Alert");
  const cleanMessage = cleanSlackText(message || "Review this item in GOPU OS.");
  return [
    `${priorityPrefix(normalizedPriority)} *${cleanTitle}*`,
    "",
    `*Priority:* ${normalizedPriority}`,
    `*Type:* ${cleanType}`,
    "",
    "*Details*",
    cleanMessage,
    "",
    "*Safety*",
    "GOPU OS will not release buyer-facing messages, payments, invoices, or public posts unless the required approval is recorded."
  ].join("\n");
}

function formatSlackBlocks({ title, type, message, priority = "INFO" }) {
  const normalizedPriority = normalizePriority(priority);
  const cleanTitle = compactSlackValue(title, "GOPU OS Alert").slice(0, 150);
  const cleanType = compactSlackValue(type || "Operational Alert");
  const cleanMessage = cleanSlackText(message || "Review this item in GOPU OS.").slice(0, 2800);
  return [
    {
      type: "header",
      text: { type: "plain_text", text: cleanTitle, emoji: true }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Priority*\n${priorityPrefix(normalizedPriority)} ${normalizedPriority}` },
        { type: "mrkdwn", text: `*Type*\n${cleanType}` }
      ]
    },
    { type: "section", text: { type: "mrkdwn", text: `*Details*\n${cleanMessage}` } },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: "Safety: GOPU OS keeps approvals, buyer messages, payments, invoices, and public posts blocked until the required approval is recorded." }]
    }
  ];
}

function safeErrorLog(error, context = {}) {
  const message = error instanceof Error ? error.message : "Unknown Slack notification error";
  console.error("[slack] notification failed safely", {
    ...context,
    message,
  });
}

export async function sendSlackNotification({
  title,
  type,
  message,
  priority = "INFO",
}) {
  if ("window" in globalThis) {
    return {
      ok: false,
      status: "server_only",
      message: "Slack webhook delivery is server-side only.",
    };
  }

  const webhookUrl = getSlackWebhookUrl();
  const botConfig = getSlackBotConfig();
  if (!webhookUrl) {
    if (!botConfig.token || !botConfig.channel) {
      return {
        ok: false,
        status: "not_configured",
        message: "Slack webhook or bot token/channel is not configured.",
      };
    }
  }

  if (webhookUrl && !isValidSlackWebhook(webhookUrl)) {
    return {
      ok: false,
      status: "invalid_webhook",
      message: "SLACK_WEBHOOK_URL is not a valid Slack incoming webhook URL.",
    };
  }

  if (!webhookUrl && (!isValidSlackBotToken(botConfig.token) || !isValidSlackChannelId(botConfig.channel))) {
    return {
      ok: false,
      status: "invalid_bot_config",
      message: "Slack bot token or channel id is not valid.",
    };
  }

  const text = formatSlackMessage({ title, type, message, priority });
  const blocks = formatSlackBlocks({ title, type, message, priority });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = webhookUrl ? await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
      signal: controller.signal,
    }) : await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botConfig.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: botConfig.channel, text, blocks }),
      signal: controller.signal,
    });
    const responseText = webhookUrl ? await response.text().catch(() => "") : "";
    const botBody = webhookUrl ? null : await response.json().catch(() => ({}));

    if (!response.ok || (webhookUrl ? responseText.trim() !== "ok" : botBody?.ok !== true)) {
      safeErrorLog(new Error(responseText || botBody?.error || `HTTP ${response.status}`), {
        type,
        priority,
        httpStatus: response.status,
      });
      return {
        ok: false,
        status: "failed",
        message: "Slack rejected the notification request.",
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      status: "sent",
      message: "Slack notification sent.",
      httpStatus: response.status,
      channel: botBody?.channel || botConfig.channel || undefined,
      ts: botBody?.ts || undefined,
    };
  } catch (error) {
    safeErrorLog(error, { type, priority });
    return {
      ok: false,
      status: "failed",
      message: "Slack notification failed safely.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
