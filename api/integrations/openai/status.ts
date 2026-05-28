import { getOpenAIStatus } from "../../../lib/openaiStatus.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({
      platform_key: "openai",
      platform_name: "OpenAI",
      status: "error",
      model: "gpt-4o",
      latency_ms: null,
      last_success_at: null,
      error_message: "API request failed",
      outputs: ["Instagram caption", "Facebook caption", "LinkedIn copy", "Hashtags", "Image prompt"]
    });
    return;
  }

  const status = await getOpenAIStatus();
  res.status(200).json(status);
}
