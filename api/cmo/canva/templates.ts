import { createClient } from "@supabase/supabase-js";
import { CMO_CANVA_BRAND, CMO_CANVA_TEMPLATE_TYPES, getCanvaConnectionStatus } from "../../../lib/cmoCanvaWorkflow.mjs";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeBody(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

function normalizeTemplates(input: any = {}) {
  const source = input.templates || input.canva_templates || input;
  const templates: Record<string, string> = {};
  for (const [key, config] of Object.entries(CMO_CANVA_TEMPLATE_TYPES)) {
    const value = String(source[key] || source[(config as any).env] || "").trim();
    if (value) templates[key] = value;
  }
  return templates;
}

export default async function handler(req: any, res: any) {
  const client = getClient();
  if (!client) {
    return res.status(200).json({ ok: false, status: "not_configured", message: "Supabase server env is missing." });
  }

  if (req.method === "GET") {
    const status = await getCanvaConnectionStatus({ client });
    return res.status(200).json({ ok: true, status: "loaded", canva: status });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "GET or POST required." });
  }

  const body = normalizeBody(req);
  const tenantId = body.tenant_id || DEMO_TENANT_ID;
  const templates = normalizeTemplates(body);
  if (!Object.keys(templates).length) {
    return res.status(200).json({ ok: false, status: "missing_templates", message: "At least one Canva template ID is required." });
  }

  const payload = {
    tenant_id: tenantId,
    platform: "Canva",
    platform_key: "canva",
    platform_name: "Canva",
    logo_key: "canva",
    provider: "Canva Connect API",
    status: "configured",
    runtime: "server",
    config: {
      required_for_cmo: true,
      export_width: 1080,
      export_height: 1350,
      templates
    },
    metadata: {
      brand: CMO_CANVA_BRAND,
      graphics_renderer: "canva",
      no_ai_image_text: true,
      updated_by: "api/cmo/canva/templates",
      updated_at: new Date().toISOString()
    },
    last_checked_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("platform_integrations")
    .upsert(payload, { onConflict: "platform_key" })
    .select("*")
    .maybeSingle();

  if (error) return res.status(200).json({ ok: false, status: "save_failed", message: error.message });
  const status = await getCanvaConnectionStatus({ client });
  return res.status(200).json({ ok: true, status: "saved", integration: data, canva: status });
}
