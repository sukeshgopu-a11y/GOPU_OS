const allowedPriorities = ["INFO", "WARNING", "URGENT"];

function getSlackWebhookUrl() {
  return process.env.SLACK_WEBHOOK_URL?.trim() || process.env.SLACK_APPROVAL_WEBHOOK_URL?.trim() || "";
}

function isValidSlackWebhook(url) {
  return /^https:\/\/hooks\.slack(?:-gov)?\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9_-]+$/i.test(url);
}

function normalizePriority(priority) {
  return priority && allowedPriorities.includes(priority) ? priority : "INFO";
}

function formatSlackMessage({ title, type, message, priority = "INFO" }) {
  const normalizedPriority = normalizePriority(priority);
  return [
    "--------------",
    title || "GOPU OS ALERT",
    "",
    `Type: ${type || "Operational Alert"}`,
    `Priority: ${normalizedPriority}`,
    "",
    message || "No message supplied.",
    "--------------",
  ].join("\n");
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
  if (!webhookUrl) {
    return {
      ok: false,
      status: "not_configured",
      message: "SLACK_WEBHOOK_URL is not configured.",
    };
  }

  if (!isValidSlackWebhook(webhookUrl)) {
    return {
      ok: false,
      status: "invalid_webhook",
      message: "SLACK_WEBHOOK_URL is not a valid Slack incoming webhook URL.",
    };
  }

  const text = formatSlackMessage({ title, type, message, priority });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    const responseText = await response.text().catch(() => "");

    if (!response.ok || responseText.trim() !== "ok") {
      safeErrorLog(new Error(responseText || `HTTP ${response.status}`), {
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
