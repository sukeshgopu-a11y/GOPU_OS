// @ts-nocheck
/**
 * Morning Price Fetch — runs daily at 9:00 AM IST (3:30 AM UTC)
 *
 * Flow:
 * 1. Fetch live commodity prices from data.gov.in Agmarknet API + MCX
 * 2. Update commodity_prices table in Supabase
 * 3. Send formatted price report to Slack
 * 4. Morning briefing then uses these fresh prices for all quotes
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

// Commodity config — maps our product keys to data source identifiers
const COMMODITY_CONFIG = [
  { key: "chilli",    label: "Red Chilli",       agmarknet: "Chilli",     unit: "Quintal", mandi: "Guntur",       divisor: 100 },
  { key: "turmeric",  label: "Turmeric",          agmarknet: "Turmeric",   unit: "Quintal", mandi: "Nizamabad",    divisor: 100 },
  { key: "pepper",    label: "Black Pepper",      agmarknet: "Pepper",     unit: "Quintal", mandi: "Kochi",        divisor: 100 },
  { key: "cumin",     label: "Cumin Seeds",       agmarknet: "Cumin",      unit: "Quintal", mandi: "Unjha",        divisor: 100 },
  { key: "coriander", label: "Coriander",         agmarknet: "Coriander",  unit: "Quintal", mandi: "Kota",         divisor: 100 },
  { key: "cardamom",  label: "Cardamom",          agmarknet: "Cardamom",   unit: "Kg",      mandi: "Kumily",       divisor: 1   },
  { key: "fenugreek", label: "Fenugreek",         agmarknet: "Fenugreek",  unit: "Quintal", mandi: "Rajkot",       divisor: 100 },
  { key: "mustard",   label: "Mustard",           agmarknet: "Mustard",    unit: "Quintal", mandi: "Alwar",        divisor: 100 },
  { key: "cinnamon",  label: "Cinnamon",          agmarknet: null,         unit: "Kg",      mandi: "Kochi",        divisor: 1   },
  { key: "clove",     label: "Clove",             agmarknet: null,         unit: "Kg",      mandi: "Kochi",        divisor: 1   },
  { key: "rice",      label: "Rice",              agmarknet: "Rice",       unit: "Quintal", mandi: "Nizamabad",    divisor: 100 },
  { key: "onion",     label: "Onion",             agmarknet: "Onion",      unit: "Quintal", mandi: "Lasalgaon",    divisor: 100 },
  { key: "garlic",    label: "Garlic",            agmarknet: "Garlic",     unit: "Quintal", mandi: "Indore",       divisor: 100 },
];

// Reference prices (INR/kg) — used when live fetch fails
const REFERENCE_PRICES: Record<string, number> = {
  chilli: 120, turmeric: 148, pepper: 680, cumin: 250, coriander: 90,
  cardamom: 2200, fenugreek: 75, mustard: 65, cinnamon: 320, clove: 820,
  rice: 68, onion: 20, garlic: 32,
};

async function fetchAgmarknetPrice(commodity: any): Promise<{ price: number; source: string } | null> {
  const apiKey = env("DATA_GOV_API_KEY");
  if (!apiKey || !commodity.agmarknet) return null;

  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[commodity]=${encodeURIComponent(commodity.agmarknet)}&filters[market]=${encodeURIComponent(commodity.mandi)}&filters[arrival_date]=${encodeURIComponent(dateStr)}&limit=5`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    const records = data?.records || [];
    if (!records.length) return null;

    // Use modal price if available, else average of min/max
    const r = records[0];
    const modalPrice = parseFloat(r.modal_price || r.modal || "0");
    const minPrice = parseFloat(r.min_price || r.min || "0");
    const maxPrice = parseFloat(r.max_price || r.max || "0");
    const rawPrice = modalPrice || ((minPrice + maxPrice) / 2);
    if (!rawPrice || rawPrice <= 0) return null;

    const pricePerKg = rawPrice / commodity.divisor;
    return {
      price: Math.round(pricePerKg * 100) / 100,
      source: `Agmarknet — ${commodity.mandi} Mandi (${dd}/${mm}/${yyyy})`,
    };
  } catch {
    return null;
  }
}

async function fetchAllPrices(): Promise<Array<{ key: string; label: string; price: number; source: string; live: boolean }>> {
  const results = await Promise.allSettled(
    COMMODITY_CONFIG.map(async (commodity) => {
      const live = await fetchAgmarknetPrice(commodity);
      if (live) {
        return { key: commodity.key, label: commodity.label, price: live.price, source: live.source, live: true };
      }
      // Fall back to reference price
      const ref = REFERENCE_PRICES[commodity.key] || 100;
      return { key: commodity.key, label: commodity.label, price: ref, source: `Reference — update manually in CFO → Market Prices`, live: false };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map(r => r.value);
}

async function updateSupabasePrices(client: any, prices: any[]) {
  const livePrices = prices.filter(p => p.live);
  if (!livePrices.length) return { updated: 0 };

  const upserts = livePrices.map(p => ({
    tenant_id: TENANT_ID,
    product_key: p.key,
    product_label: p.label,
    price_inr_per_kg: p.price,
    source: p.source,
    note: "Auto-updated by morning price fetch cron",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from("commodity_prices")
    .upsert(upserts, { onConflict: "tenant_id,product_key" });

  return { updated: error ? 0 : livePrices.length, error: error?.message };
}

function buildSlackPriceReport(prices: any[], updatedCount: number): string {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const lines = [
    `🌅 *Good Morning — GOPU OS Daily Price Report*`,
    `📅 ${today} | 9:00 AM IST`,
    ``,
    `📊 *Commodity Prices (₹/kg) — ${updatedCount > 0 ? `${updatedCount} live from Agmarknet` : "Reference prices — set DATA_GOV_API_KEY for live fetch"}*`,
    ``,
  ];

  for (const p of prices) {
    const icon = p.live ? "🟢" : "🟡";
    const sourceShort = p.live
      ? p.source.replace("Agmarknet — ", "").split("(")[0].trim()
      : "Reference";
    lines.push(`${icon} *${p.label}*: ₹${p.price}/kg  _${sourceShort}_`);
  }

  lines.push(``);
  lines.push(updatedCount > 0
    ? `✅ Pricing engine updated with today's live prices. All quotes for today use these rates.`
    : `⚠️ Live prices unavailable today. Set *DATA_GOV_API_KEY* in Vercel env vars to enable Agmarknet live fetch. Reference prices used for quotes.`
  );
  lines.push(`💡 To override any price: *CFO → Market Prices tab → Update Price*`);

  return lines.join("\n");
}

async function sendSlack(text: string) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false, reason: "not_configured" };

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.ok === true, ts: body.ts };
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  // Allow GET for manual trigger from browser/test
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "GET or POST only" });
  }

  // Security: verify cron secret on POST (Vercel cron sends no auth by default in free tier)
  if (req.method === "POST") {
    const secret = env("CRON_SECRET");
    const authHeader = String(req.headers.authorization || "");
    if (secret && authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
  }

  const client = getSupabase();
  const startAt = Date.now();

  // 1. Fetch prices (live from Agmarknet if API key set, else reference)
  const prices = await fetchAllPrices();
  const liveCount = prices.filter(p => p.live).length;

  // 2. Update Supabase commodity_prices table
  let dbResult = { updated: 0 };
  if (client) {
    dbResult = await updateSupabasePrices(client, prices);
  }

  // 3. Build and send Slack message
  const slackText = buildSlackPriceReport(prices, liveCount);
  const slackResult = await sendSlack(slackText);

  // 4. Log to audit
  if (client) {
    await client.from("audit_logs").insert({
      tenant_id: TENANT_ID,
      action_type: "morning_price_fetch",
      module: "CFO Pricing Engine",
      actor: "System Cron",
      description: `Morning price fetch: ${liveCount} live prices, ${dbResult.updated} updated in DB, Slack ${slackResult.ok ? "sent" : "failed"}`,
      metadata: { prices, liveCount, dbResult, slackResult, duration_ms: Date.now() - startAt },
      created_at: new Date().toISOString(),
    }).catch(() => null);
  }

  return res.status(200).json({
    ok: true,
    prices,
    live_prices_fetched: liveCount,
    db_updated: dbResult.updated,
    slack_sent: slackResult.ok,
    duration_ms: Date.now() - startAt,
    note: liveCount === 0
      ? "No live prices fetched. Add DATA_GOV_API_KEY to Vercel env vars to enable Agmarknet live fetch."
      : `${liveCount} live prices fetched and updated.`,
  });
}
