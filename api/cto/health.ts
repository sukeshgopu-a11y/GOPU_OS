// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
function env(k: string) { return process.env[k]?.trim() || ""; }
function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const config = { api: { bodyParser: true } };
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const supabase = getSupabase();

  let services: any[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("integration_services")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .catch(() => ({ data: [], error: null }));
    services = data || [];
  }

  const summary = {
    total: services.length,
    live: services.filter((s) => s.status === "live").length,
    error: services.filter((s) => s.status === "error").length,
    warning: services.filter((s) => s.status === "warning").length,
  };

  const configured_env_vars = {
    openai: !!env("OPENAI_API_KEY"),
    resend: !!env("RESEND_API_KEY"),
    slack: !!env("SLACK_BOT_TOKEN"),
    meta: !!env("META_ACCESS_TOKEN"),
    linkedin: !!env("LINKEDIN_ACCESS_TOKEN"),
    twilio: !!env("TWILIO_ACCOUNT_SID"),
    data_gov: !!env("DATA_GOV_API_KEY"),
  };

  return res.status(200).json({ ok: true, services, summary, configured_env_vars });
}
