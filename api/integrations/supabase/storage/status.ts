import { getSupabaseStorageStatus } from "../../../../lib/supabaseStorageStatus.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({
      platform_key: "supabase-storage",
      platform_name: "Supabase Storage",
      status: "error",
      bucket: process.env.SUPABASE_STORAGE_BUCKET || "cmo-generated-assets",
      latency_ms: null,
      last_success_at: null,
      error_message: "API request failed",
      outputs: ["Poster asset public URL", "Generated image public URL"],
      health: {
        upload: false,
        public_url: false,
        signed_url: false
      },
      source: "supabase_storage_health_endpoint"
    });
    return;
  }

  const status = await getSupabaseStorageStatus();
  res.status(200).json(status);
}
