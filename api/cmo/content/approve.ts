import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const id = String(payload.content_history_id || payload.id || "").trim();
    const action = String(payload.action || "").trim().toLowerCase();
    if (!id) return res.status(200).json({ ok: false, status: "missing_content_history_id", message: "content_history_id is required." });
    if (!["approve", "reject"].includes(action)) return res.status(200).json({ ok: false, status: "invalid_action", message: "action must be approve or reject." });

    const client = getClient();
    if (!client) return res.status(200).json({ ok: false, status: "not_configured", message: "Supabase server env is missing." });

    const patch = action === "approve"
      ? { approval_status: "approved", publish_status: "queued", updated_at: new Date().toISOString() }
      : { approval_status: "rejected", updated_at: new Date().toISOString() };

    const { data, error } = await client
      .from("content_history")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return res.status(200).json({ ok: false, status: "db_update_failed", message: error.message });
    if (!data?.id) return res.status(200).json({ ok: false, status: "not_found", message: "Content history row not found." });
    return res.status(200).json({ ok: true, status: action === "approve" ? "approved" : "rejected", content_history: data });
  } catch (error: any) {
    return res.status(200).json({ ok: false, status: "failed_safely", message: error?.message || "CMO content approval failed safely." });
  }
}
