// @ts-nocheck
import { normalizeBody, publishApprovedLinkedInPersonal } from "../../_shared/linkedinPersonalPublish";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const result = await publishApprovedLinkedInPersonal(normalizeBody(req));
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(200).json({ ok: false, status: "failed_safely", message: error?.message || "LinkedIn personal publish failed safely." });
  }
}
