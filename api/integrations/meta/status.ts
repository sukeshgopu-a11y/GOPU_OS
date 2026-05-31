// @ts-nocheck
import { verifyFacebookPage, verifyInstagramBusinessAccount } from "../../../lib/metaIntegration.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  try {
    const [facebook, instagram] = await Promise.all([
      verifyFacebookPage(),
      verifyInstagramBusinessAccount()
    ]);

    return res.status(200).json({
      ok: true,
      connected: Boolean(facebook.connected && instagram.connected),
      facebook,
      instagram
    });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      connected: false,
      status: "meta_status_failed",
      message: error?.message || "Meta status check failed safely."
    });
  }
}
