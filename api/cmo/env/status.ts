import { checkCmoEnv } from "../../../lib/cmoEnvCheck.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  try {
    return res.status(200).json({ ok: true, status: "checked", env: checkCmoEnv() });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      status: "failed_safely",
      message: error?.message || "CMO environment check failed safely.",
      env: {}
    });
  }
}
