import { getCreativeEngineStatus } from "../../../lib/creativeStatus.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({
      platform_key: "creative_engine",
      platform_name: "Poster & Creative Engine",
      status: "error",
      providers: {
        openai_creative: {
          status: "pending",
          provider: "OpenAI Creative",
          latency_ms: null,
          error_message: null
        },
        sharp: {
          status: "pending",
          version: null,
          error_message: null
        }
      },
      last_success_at: null,
      render_pipeline: {
        poster_generation: false,
        logo_stamping: false,
        video_generation: false,
        video_generation_required_for_step_3: false
      },
      error_message: "API request failed"
    });
    return;
  }

  const status = await getCreativeEngineStatus();
  res.status(200).json(status);
}
