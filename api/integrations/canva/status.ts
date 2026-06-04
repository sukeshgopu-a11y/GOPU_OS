import { getChatGPTImageConnectionStatus } from "../../../lib/cmoChatGPTImageWorkflow.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(200).json({
      platform_key: "chatgpt_image",
      platform_name: "ChatGPT Image Generation",
      status: "error",
      error_message: "GET required."
    });
  }

  const forceApiCheck = req.query?.live === "true" || req.query?.force === "true";
  const status = await getChatGPTImageConnectionStatus({ forceApiCheck });
  return res.status(200).json(status);
}
