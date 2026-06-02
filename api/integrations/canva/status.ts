import { getCanvaConnectionStatus } from "../../../lib/cmoCanvaWorkflow.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({
      platform_key: "canva",
      platform_name: "Canva",
      status: "error",
      error_message: "GET required."
    });
  }

  const forceApiCheck = req.query?.live === "true" || req.query?.force === "true";
  const status = await getCanvaConnectionStatus({ forceApiCheck });
  return res.status(200).json(status);
}
