import { sendSlackNotification } from "../../lib/slack.js";

type SlackAlertPayload = {
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
    `Reference: ${payload.reference || "GOPU-OS"}`,
    payload.buyer ? `Buyer: ${payload.buyer}` : "",
    `Status: ${payload.status || "Monitoring"}`,
    payload.eta ? `ETA / Due: ${payload.eta}` : "",
    payload.source ? `Source: ${payload.source}` : "",
    "",
    "Action Required:",
    payload.actionRequired || "Review in GOPU OS.",
  ].filter(Boolean).join("\n");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const payload: SlackAlertPayload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const result = await sendSlackNotification({
      title: "GOPU OS ALERT",
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
