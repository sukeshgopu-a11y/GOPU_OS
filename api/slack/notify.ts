import { sendSlackNotification } from "../../lib/slack.js";

type SlackAlertPayload = {
  title?: string;
  type?: string;
  priority?: "INFO" | "WARNING" | "URGENT";
  reference?: string;
  buyer?: string;
  status?: string;
  eta?: string;
  actionRequired?: string;
  source?: string;
};

function buildOperationalMessage(payload: SlackAlertPayload) {
  return [
    "*Summary*",
    `Status: ${payload.status || "Monitoring"}`,
    payload.buyer ? `Buyer / Vendor: ${payload.buyer}` : "",
    `Reference: ${payload.reference || "GOPU-OS"}`,
    payload.source ? `Source: ${payload.source}` : "Source: GOPU OS",
    payload.eta ? `Due / ETA: ${payload.eta}` : "",
    "",
    "*Action needed*",
    payload.actionRequired || "Review in GOPU OS.",
  ].filter(Boolean).join("\n");
}

function buildAlertTitle(payload: SlackAlertPayload) {
  if (payload.title) return payload.title;
  const type = payload.type || "Operational Alert";
  if (type === "Founder Approval Required") return "GOPU OS - Approval needed";
  if (type === "Task Blocked") return "GOPU OS - Task blocked";
  if (type === "Task Escalated") return "GOPU OS - Task escalated";
  if (type === "Payment Received") return "GOPU OS - Payment update";
  return `GOPU OS - ${type}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const payload: SlackAlertPayload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const result = await sendSlackNotification({
      title: buildAlertTitle(payload),
      type: payload.type || "Operational Alert",
      priority: payload.priority || "INFO",
      message: buildOperationalMessage(payload),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[slack] notify route failed safely", {
      message: error instanceof Error ? error.message : "Unknown route error",
    });
    return res.status(200).json({
      ok: false,
      status: "failed",
      message: "Slack notification route failed safely.",
    });
  }
}
