// @ts-nocheck
import { verifyInstagramBusinessAccount } from "../../../lib/metaIntegration.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  try {
    const instagram = await verifyInstagramBusinessAccount();
    return res.status(200).json({ ok: true, ...instagram });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      connected: false,
      status: "instagram_status_failed",
      message: error?.message || "Instagram status check failed safely."
    });
  }
}
