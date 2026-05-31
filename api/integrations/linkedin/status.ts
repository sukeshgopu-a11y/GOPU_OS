// @ts-nocheck
import { linkedinPersonalStatusPayload } from "../../_shared/linkedinPersonalPublish";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }
  return res.status(200).json(linkedinPersonalStatusPayload());
}
