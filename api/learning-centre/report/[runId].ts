import { handleLearningCentreReport } from "../../../lib/learningCentreApiHandlers.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, status: "method_not_allowed" });
  return handleLearningCentreReport(req, (statusCode: number, payload: any) => res.status(statusCode).json(payload));
}
