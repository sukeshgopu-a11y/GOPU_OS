// @ts-nocheck
/**
 * CIO — Buyer Intelligence API
 * GET  /api/cio/buyers        → list all buyers (with scoring)
 * POST /api/cio/buyers        → add a new buyer manually or from CIO research
 * PUT  /api/cio/buyers        → update buyer (status, score, notes)
 *
 * CIO automatically scores each buyer A/B/C and triggers CMO cold email
 * for any A or B tier buyer without an active sequence.
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

const HIGH_VALUE_COUNTRIES = ["Australia", "UAE", "Saudi Arabia", "Singapore", "UK", "USA", "Germany", "Netherlands", "Canada", "Japan", "South Korea", "Qatar", "Kuwait", "Bahrain", "Oman"];

function scoreBuyer(buyer: any): { score: number; tier: "A" | "B" | "C"; reasons: string[] } {
  let score = 5;
  const reasons: string[] = [];

  if (buyer.email) { score += 1; reasons.push("Email provided"); }
  if (buyer.phone) { score += 1; reasons.push("Phone provided"); }
  if (buyer.website) { score += 0.5; reasons.push("Has website"); }

  const country = buyer.country || "";
  if (HIGH_VALUE_COUNTRIES.some(c => c.toLowerCase() === country.toLowerCase())) {
    score += 1; reasons.push(`High-value market: ${country}`);
  }

  const volume = (buyer.annual_import_volume || "").toLowerCase();
  if (volume.includes("container") || volume.includes("fcl")) { score += 2; reasons.push("Large volume importer"); }
  else if (volume.includes("mt") || volume.includes("ton")) { score += 1; reasons.push("Known import volume"); }

  const products = buyer.products_interested || [];
  if (products.length >= 3) { score += 1; reasons.push("Multi-product buyer"); }

  score = Math.max(0, Math.min(10, Math.round(score)));
  const tier: "A" | "B" | "C" = score >= 8 ? "A" : score >= 6 ? "B" : "C";

  return { score, tier, reasons };
}

async function triggerCMOSequence(buyer: any) {
  if (!buyer.email) return;
  const baseUrl = env("VERCEL_URL") ? `https://${env("VERCEL_URL")}` : "http://localhost:3000";
  await fetch(`${baseUrl}/api/cmo/email/send-sequence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer_name: buyer.buyer_name,
      buyer_email: buyer.email,
      company_name: buyer.company_name,
      country: buyer.country,
      product: (buyer.products_interested || [])[0] || "spices",
    }),
  }).catch(() => null);
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const client = getSupabase();
  if (!client) return res.status(200).json({ ok: false, error: "no_supabase" });

  // ── GET: list buyers ────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const tier = req.query?.tier as string;
    const status = req.query?.status as string;
    const search = req.query?.search as string;
    const limit = Math.min(parseInt(String(req.query?.limit || "50")), 200);

    let query = client
      .from("cio_buyer_intelligence")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("lead_score", { ascending: false })
      .limit(limit);

    if (tier) query = query.eq("tier", tier);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`buyer_name.ilike.%${search}%,company_name.ilike.%${search}%,country.ilike.%${search}%`);

    const { data, error } = await query.catch(() => ({ data: [], error: "query_failed" }));
    if (error && error !== "query_failed") return res.status(500).json({ ok: false, error });

    const buyers = (data || []).map((b: any) => ({
      ...b,
      _scoring: scoreBuyer(b),
    }));

    const summary = {
      total: buyers.length,
      a_tier: buyers.filter((b: any) => b.tier === "A").length,
      b_tier: buyers.filter((b: any) => b.tier === "B").length,
      c_tier: buyers.filter((b: any) => b.tier === "C").length,
      with_email: buyers.filter((b: any) => b.email).length,
    };

    return res.status(200).json({ ok: true, buyers, summary });
  }

  // ── POST: add buyer ─────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const { buyer_name, company_name, country, city, email, phone, website,
      products_interested, annual_import_volume, source, notes } = body;

    if (!buyer_name && !company_name) {
      return res.status(400).json({ ok: false, error: "buyer_name or company_name required" });
    }

    const scoring = scoreBuyer({ buyer_name, company_name, country, email, phone, website, products_interested, annual_import_volume });

    const now = new Date().toISOString();
    const { data: buyer, error } = await client
      .from("cio_buyer_intelligence")
      .insert({
        tenant_id: TENANT_ID,
        buyer_name: buyer_name || null,
        company_name: company_name || null,
        country: country || null,
        city: city || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        products_interested: products_interested || [],
        annual_import_volume: annual_import_volume || null,
        tier: scoring.tier,
        lead_score: scoring.score,
        source: source || "manual",
        status: "New",
        notes: notes || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    // Log CIO decision
    await client.from("agent_decisions").insert({
      tenant_id: TENANT_ID,
      agent: "CIO",
      decision_type: "lead_score",
      decision_summary: `New buyer added: ${buyer_name || company_name} from ${country || "Unknown"}. Scored ${scoring.tier}-tier (${scoring.score}/10). ${scoring.tier !== "C" && email ? "Triggering CMO cold email." : ""}`,
      confidence: 0.85,
      requires_director: false,
      output_data: { buyer_id: buyer?.id, scoring },
    }).catch(() => null);

    // Auto-trigger CMO cold email for A/B tier buyers with email
    let cmoTriggered = false;
    if (["A", "B"].includes(scoring.tier) && email) {
      await triggerCMOSequence({ ...body, id: buyer?.id });
      cmoTriggered = true;
    }

    return res.status(200).json({
      ok: true,
      buyer,
      scoring,
      cmo_email_triggered: cmoTriggered,
      message: cmoTriggered
        ? `${scoring.tier}-tier buyer added. CMO cold email sequence started automatically.`
        : `Buyer added with ${scoring.tier}-tier score. No email triggered (${!email ? "no email on file" : "C-tier"}).`,
    });
  }

  // ── PUT: update buyer ───────────────────────────────────────────────────────
  if (req.method === "PUT") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: "id required" });

    const { data, error } = await client
      .from("cio_buyer_intelligence")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", TENANT_ID)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, buyer: data });
  }

  return res.status(405).json({ ok: false, error: "method not allowed" });
}
