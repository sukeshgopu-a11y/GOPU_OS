// @ts-nocheck
import { verifyFacebookPage } from "../../../lib/metaIntegration.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  try {
    const facebook = await verifyFacebookPage();
    return res.status(200).json({ ok: true, ...facebook });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      connected: false,
      status: "facebook_status_failed",
      message: error?.message || "Facebook status check failed safely."
    });
  }
}
