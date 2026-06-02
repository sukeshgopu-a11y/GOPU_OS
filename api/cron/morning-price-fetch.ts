// @ts-nocheck
/**
 * Morning Price Fetch - runs daily at 8:00 AM IST (2:30 AM UTC)
 *
 * Flow:
 * 1. Fetch Agmarknet live rates for CFO catalog products where a live market mapping exists.
 * 2. Refresh every APEDA/Spice Board product row in commodity_prices.
 * 3. Send the CFO market-rate report to Slack.
 * 4. Morning briefing and pricing engine use these fresh CFO rates for quotes.
 */

import { createClient } from "@supabase/supabase-js";
import { cleanSlackText } from "../../lib/slackTextClean.js";
import { marketPriceProducts } from "../../lib/exportProductCatalog.mjs";
import { PRICE_SOURCE_TYPES } from "../../lib/pricingSourceUtils.mjs";
import { upsertCommodityPriceRows } from "../../lib/supabaseCommodityPrices.mjs";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

function env(k: string) { return process.env[k]?.trim() || ""; }

function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function todayIstParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { dd: byType.day, mm: byType.month, yyyy: byType.year };
}

function parsePriceRecord(record: any, divisor: number) {
  const modalPrice = parseFloat(record?.modal_price || record?.modal || "0");
  const minPrice = parseFloat(record?.min_price || record?.min || "0");
  const maxPrice = parseFloat(record?.max_price || record?.max || "0");
  const rawPrice = modalPrice || (minPrice && maxPrice ? (minPrice + maxPrice) / 2 : 0);
  if (!rawPrice || rawPrice <= 0) return null;
  return Math.round((rawPrice / (divisor || 100)) * 100) / 100;
}

async function queryAgmarknet({ apiKey, commodity, market, dateStr, limit = 10 }: any) {
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(limit),
  });
  params.set("filters[commodity]", commodity);
  if (market) params.set("filters[market]", market);
  if (dateStr) params.set("filters[arrival_date]", dateStr);

  const url = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.records) ? data.records : [];
}

async function fetchAgmarknetPrice(product: any): Promise<{ price: number; source: string; reference: string; market: string; fetchedAt: string } | null> {
  const apiKey = env("DATA_GOV_API_KEY");
  if (!apiKey || !product.agmarknet) return null;

  try {
    const { dd, mm, yyyy } = todayIstParts();
    const dateStr = `${dd}/${mm}/${yyyy}`;
    const exactRecords = await queryAgmarknet({ apiKey, commodity: product.agmarknet, market: product.mandi, dateStr, limit: 5 });
    const fallbackRecords = exactRecords.length
      ? exactRecords
      : await queryAgmarknet({ apiKey, commodity: product.agmarknet, dateStr, limit: 10 });
    const record = fallbackRecords.find((item: any) => parsePriceRecord(item, product.divisor));
    if (!record) return null;

    const price = parsePriceRecord(record, product.divisor);
    if (!price) return null;

    const market = record.market || product.mandi || "Agmarknet";
    const arrivalDate = record.arrival_date || dateStr;
    return {
      price,
      source: `Agmarknet - ${market} (${arrivalDate})`,
      reference: `data.gov.in Agmarknet ${product.agmarknet}/${market}`,
      market,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function fallbackPrice(product: any) {
  return {
    key: product.key,
    label: product.label,
    price: product.reference || 115,
    source: product.source || `${product.source_group || "Catalog"} reference`,
    reference: product.source_reference || "GOPU CFO product catalog",
    note: `${product.note || "Reference price only."} CFO must verify before final quote.`,
    live: false,
    product,
  };
}

async function fetchProductPrice(product: any) {
  const live = await fetchAgmarknetPrice(product);
  if (live) {
    return {
      key: product.key,
      label: product.label,
      price: live.price,
      source: live.source,
      reference: live.reference,
      note: `Auto-updated at 8 AM IST from Agmarknet for ${product.label}.`,
      live: true,
      fetchedAt: live.fetchedAt,
      market: live.market,
      product,
    };
  }
  return fallbackPrice(product);
}

async function fetchAllPrices() {
  const results: any[] = [];
  const chunkSize = 8;
  for (let i = 0; i < marketPriceProducts.length; i += chunkSize) {
    const chunk = marketPriceProducts.slice(i, i + chunkSize);
    const settled = await Promise.allSettled(chunk.map(fetchProductPrice));
    for (const item of settled) {
      if (item.status === "fulfilled") results.push(item.value);
    }
  }
  return results;
}

async function updateSupabasePrices(client: any, prices: any[]) {
  if (!prices.length) return { updated: 0, liveUpdated: 0, referenceUpdated: 0 };

  const now = new Date().toISOString();
  const upserts = prices.map((p) => ({
    tenant_id: TENANT_ID,
    product_key: p.key,
    product_label: p.label,
    price_inr_per_kg: p.price,
    source: p.source,
    price_source_type: p.live ? PRICE_SOURCE_TYPES.LIVE : PRICE_SOURCE_TYPES.FALLBACK,
    price_source_name: p.live ? "data.gov.in Agmarknet" : p.source,
    price_source_reference: p.reference,
    product_grade: p.product?.product_grade || "Commercial export grade",
    market_location: p.market || p.product?.market_location || p.source,
    unit: p.product?.unit || "kg",
    currency: "INR",
    note: p.note,
    fetched_at: p.fetchedAt || now,
    updated_at: now,
  }));

  const { error, removedColumns } = await upsertCommodityPriceRows(client, upserts);

  return {
    updated: error ? 0 : upserts.length,
    liveUpdated: error ? 0 : prices.filter((p) => p.live).length,
    referenceUpdated: error ? 0 : prices.filter((p) => !p.live).length,
    schemaFallbackColumns: removedColumns || [],
    error: error?.message,
  };
}

function buildSlackPriceReport(prices: any[], dbResult: any): string {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const liveCount = prices.filter((p) => p.live).length;
  const referenceCount = prices.length - liveCount;

  const lines = [
    "*Good Morning - GOPU OS Daily CFO Price Update*",
    `${today} | 8:00 AM IST`,
    "",
    `Catalog refreshed: ${prices.length} APEDA/Spice Board products`,
    `Live Agmarknet: ${liveCount} | Reference/manual-required: ${referenceCount} | DB rows updated: ${dbResult.updated || 0}`,
    "",
    "*Rates (INR/kg)*",
  ];

  for (const p of prices) {
    const status = p.live ? "LIVE" : "REF";
    const sourceShort = p.live ? p.source.replace("Agmarknet - ", "") : "reference";
    lines.push(`${status} - ${p.label}: INR ${p.price}/kg (${sourceShort})`);
  }

  lines.push("");
  if (liveCount > 0) {
    lines.push("CFO pricing engine now has today's refreshed market table. Reference rows still need CFO verification before final quotes.");
  } else {
    lines.push("No live Agmarknet rows were fetched today. Check DATA_GOV_API_KEY and market availability; reference rows were still refreshed for CFO review.");
  }
  lines.push("To override: CFO -> Market Prices tab -> Update Price.");

  return lines.join("\n");
}

async function sendSlack(text: string) {
  const token = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  if (!token || !channel) return { ok: false, reason: "not_configured" };

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text: cleanSlackText(text) }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.ok === true, ts: body.ts, error: body.error };
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "GET or POST only" });
  }

  if (req.method === "POST") {
    const secret = env("CRON_SECRET");
    const authHeader = String(req.headers.authorization || "");
    if (secret && authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
  }

  const client = getSupabase();
  const startAt = Date.now();
  const prices = await fetchAllPrices();

  let dbResult = { updated: 0, liveUpdated: 0, referenceUpdated: 0 };
  if (client) {
    dbResult = await updateSupabasePrices(client, prices);
  }

  const slackText = buildSlackPriceReport(prices, dbResult);
  const slackResult = await sendSlack(slackText);
  const liveCount = prices.filter((p) => p.live).length;

  if (client) {
    try {
      await client.from("audit_logs").insert({
        tenant_id: TENANT_ID,
        action_type: "morning_price_fetch",
        module: "CFO Pricing Engine",
        actor: "System Cron",
        description: `8 AM CFO price fetch: ${liveCount} live prices, ${dbResult.updated} rows refreshed, Slack ${slackResult.ok ? "sent" : "failed"}`,
        metadata: { catalog_count: prices.length, liveCount, dbResult, slackResult, duration_ms: Date.now() - startAt },
        created_at: new Date().toISOString(),
      });
    } catch {
      // Audit logging must not block the price update response.
    }
  }

  return res.status(200).json({
    ok: true,
    catalog_count: prices.length,
    live_prices_fetched: liveCount,
    reference_prices_refreshed: prices.length - liveCount,
    db_updated: dbResult.updated,
    slack_sent: slackResult.ok,
    db_schema_fallback_columns: dbResult.schemaFallbackColumns || [],
    db_error: dbResult.error || null,
    duration_ms: Date.now() - startAt,
    note: liveCount === 0
      ? "No live prices fetched. Add/check DATA_GOV_API_KEY and Agmarknet availability. CFO reference rows were refreshed."
      : `${liveCount} live prices fetched and ${dbResult.updated} CFO market rows refreshed.`,
  });
}
