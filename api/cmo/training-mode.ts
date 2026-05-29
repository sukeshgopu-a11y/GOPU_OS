import { createClient } from "@supabase/supabase-js";
const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
function env(name: string): string { return (process.env[name] || "").trim(); }
function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server env is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export default async function handler(req: any, res: any) {
  const tenantId = DEMO_TENANT_ID;
  if (req.method === "GET") {
    try {
      const client = getClient();
      const { data, error } = await client.from("cmo_posting_settings").select("training_mode_until,training_mode_enabled_at").eq("tenant_id", tenantId).limit(1).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      const until = data?.training_mode_until ? new Date(data.training_mode_until) : null;
      const active = until ? until > new Date() : false;
      return res.status(200).json({ ok: true, training_mode_active: active, training_mode_until: data?.training_mode_until || null, message: active ? `Training mode active until ${until!.toISOString()}.` : "Training mode inactive." });
    } catch (error: any) { return res.status(500).json({ ok: false, message: error.message }); }
  }
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const hours = Math.min(72, Math.max(1, Number(body.hours || 24)));
      const disable = body.disable === true;
      const client = getClient();
      const now = new Date();
      const until = disable ? null : new Date(now.getTime() + hours * 60 * 60 * 1000);
      const { error } = await client.from("cmo_posting_settings").update({ training_mode_until: until ? until.toISOString() : null, training_mode_enabled_at: disable ? null : now.toISOString(), training_mode_enabled_by: "founder", updated_at: now.toISOString() }).eq("tenant_id", tenantId);
      if (error) throw error;
      await client.from("audit_logs").insert({ tenant_id: tenantId, action_type: disable ? "training_mode_disabled" : "training_mode_enabled", module: "AI CMO", actor: "Founder", description: disable ? "CMO training mode disabled." : `CMO training mode enabled for ${hours} hours until ${until!.toISOString()}.`, risk_level: "Medium", metadata: { hours, training_mode_until: until?.toISOString() || null } });
      return res.status(200).json({ ok: true, training_mode_active: !disable, training_mode_until: until?.toISOString() || null, message: disable ? "Training mode disabled. Publishing re-enabled." : `Training mode enabled for ${hours} hours. Publishing blocked until ${until!.toISOString()}.` });
    } catch (error: any) { return res.status(500).json({ ok: false, message: error.message }); }
  }
  return res.status(405).json({ ok: false, status: "method_not_allowed" });
}
