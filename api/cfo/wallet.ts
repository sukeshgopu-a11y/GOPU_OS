// @ts-nocheck
/**
 * CFO Creative Wallet — marketing campaign budget tracker
 * GET  /api/cfo/wallet        → balance, threshold, recent transactions
 * POST /api/cfo/wallet/topup  → add funds (handled via same file with sub-path)
 */

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
  const client = getSupabase();

  if (req.method === "GET") {
    if (!client) {
      return res.status(200).json({
        ok: true,
        wallet: { balance: 0, threshold: 100, transactions: [], note: "no_supabase" },
      });
    }

    const { data: wallet } = await client
      .from("cfo_wallet")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .maybeSingle()
      .catch(() => ({ data: null }));

    const { data: txns } = await client
      .from("cfo_wallet_transactions")
      .select("id, amount, type, description, created_at")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(20)
      .catch(() => ({ data: [] }));

    return res.status(200).json({
      ok: true,
      wallet: {
        balance: wallet?.balance ?? 0,
        threshold: wallet?.auto_topup_threshold ?? 100,
        transactions: txns || [],
      },
    });
  }

  if (req.method === "POST") {
    const { amount, note } = req.body || {};
    const num = Number(amount);
    if (!num || num <= 0) return res.status(400).json({ ok: false, error: "valid amount required" });

    if (!client) return res.status(200).json({ ok: false, error: "no_supabase" });

    // Upsert wallet balance
    const { data: existing } = await client
      .from("cfo_wallet")
      .select("id, balance")
      .eq("tenant_id", TENANT_ID)
      .maybeSingle()
      .catch(() => ({ data: null }));

    const newBalance = (existing?.balance ?? 0) + num;

    if (existing?.id) {
      await client
        .from("cfo_wallet")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .catch(() => null);
    } else {
      await client
        .from("cfo_wallet")
        .insert({ tenant_id: TENANT_ID, balance: newBalance, auto_topup_threshold: 100 })
        .catch(() => null);
    }

    await client
      .from("cfo_wallet_transactions")
      .insert({
        tenant_id: TENANT_ID,
        amount: num,
        type: "topup",
        description: note || "Founder top-up",
        created_at: new Date().toISOString(),
      })
      .catch(() => null);

    await client.from("agent_decisions").insert({
      tenant_id: TENANT_ID,
      agent: "CFO",
      decision_type: "wallet_topup",
      decision_summary: `Creative wallet topped up by ₹${num}. New balance: ₹${newBalance}`,
      confidence: 1.0,
      requires_director: false,
      output_data: { amount: num, new_balance: newBalance },
    }).catch(() => null);

    return res.status(200).json({ ok: true, balance: newBalance, message: `Topped up ₹${num}` });
  }

  return res.status(405).json({ ok: false, error: "method not allowed" });
}
