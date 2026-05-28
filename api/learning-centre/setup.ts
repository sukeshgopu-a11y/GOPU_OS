import { getLearningCentreSetupStatus, loadLocalEnv } from "../../lib/learningCentreDb.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, status: "method_not_allowed" });
  loadLocalEnv();
  try {
    return res.status(200).json({ ok: true, ...(await getLearningCentreSetupStatus()) });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || "Learning Centre setup check failed." });
  }
}
