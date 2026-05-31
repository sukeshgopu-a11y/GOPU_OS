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
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const client = getSupabase();
  if (!client) return res.status(200).json({ ok: false, error: "no_supabase" });
  const { amount, note } = req.body || {};
  const num = Number(amount);
  if (!num || num <= 0) return res.status(400).json({ ok: false, error: "valid amount required" });
  let existing = null;
  try {
    const result = await client.from("cfo_wallet").select("id, balance").eq("tenant_id", TENANT_ID).maybeSingle();
    existing = result.data || null;
  } catch {
    existing = null;
  }
  const newBalance = (existing?.balance ?? 0) + num;
  try {
    if (existing?.id) {
      await client.from("cfo_wallet").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await client.from("cfo_wallet").insert({ tenant_id: TENANT_ID, balance: newBalance, auto_topup_threshold: 100 });
    }
  } catch {}
  try {
    await client.from("cfo_wallet_transactions").insert({ tenant_id: TENANT_ID, amount: num, type: "topup", description: note || "Founder top-up", created_at: new Date().toISOString() });
  } catch {}
  return res.status(200).json({ ok: true, balance: newBalance });
}
