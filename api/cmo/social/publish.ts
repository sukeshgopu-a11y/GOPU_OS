// @ts-nocheck
import { runCmoPublishingEngine } from "../../../lib/cmoPublishingEngine.mjs";

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

function normalizeBody(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  const body = normalizeBody(req);
  const contentHistoryId = String(body.content_history_id || body.contentHistoryId || "").trim();
  if (!contentHistoryId) {
    return res.status(200).json({
      ok: false,
      status: "blocked_missing_approval",
      message: "Social publishing is approval-gated. Create and approve a content_history row, then publish through Step 6."
    });
  }

  try {
    const dryRun = body.dry_run === true || env("DRY_RUN") === "true";
    const result = await runCmoPublishingEngine({ contentHistoryId, dryRun, limit: 1 });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      status: "publish_failed_safely",
      message: error?.message || "Approval-gated social publish failed safely."
    });
  }
}
