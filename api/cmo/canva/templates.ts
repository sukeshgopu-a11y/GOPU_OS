import { CMO_BRAND, getChatGPTImageConnectionStatus } from "../../../lib/cmoChatGPTImageWorkflow.mjs";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET required." });
  }

  const forceApiCheck = req.query?.live === "true" || req.query?.force === "true";
  const status = await getChatGPTImageConnectionStatus({ forceApiCheck });
  return res.status(200).json({
    ok: true,
    status: "loaded",
    chatgpt_image: status,
    brand: CMO_BRAND,
    model: env("OPENAI_IMAGE_MODEL") || "gpt-image-1",
    image_size: env("CMO_IMAGE_SIZE") || "1024x1536",
    image_quality: env("CMO_IMAGE_QUALITY") || "high"
  });
}
