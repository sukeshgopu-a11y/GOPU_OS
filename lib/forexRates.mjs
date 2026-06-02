export const FOREX_REFRESH_MS = 30 * 60 * 1000;

const FOREX_TIMEOUT_MS = 12000;

const FOREX_PAIRS = [
  { pair: "USD/INR", base: "usd" },
  { pair: "EUR/INR", base: "eur" },
  { pair: "AED/INR", base: "aed" },
  { pair: "AUD/INR", base: "aud" },
  { pair: "GBP/INR", base: "gbp" }
];

const FALLBACK_RATES = [
  { pair: "USD/INR", rate: 94.99, rawRate: 94.9877 },
  { pair: "EUR/INR", rate: 110.75, rawRate: 110.7526 },
  { pair: "AED/INR", rate: 25.86, rawRate: 25.8646 },
  { pair: "AUD/INR", rate: 68.24, rawRate: 68.2433 },
  { pair: "GBP/INR", rate: 127.83, rawRate: 127.8258 }
];

let cachedSnapshot = null;
let pendingRefresh = null;

function isoNow() {
  return new Date().toISOString();
}

function nextRefreshAt(checkedAt = Date.now()) {
  return new Date(checkedAt + FOREX_REFRESH_MS).toISOString();
}

function roundRate(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatChange(diff) {
  if (!Number.isFinite(diff)) return "0.00";
  if (Math.abs(diff) < 0.005) return "0.00";
  return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
}

function previousRateFor(previousRates = [], pair) {
  const previous = previousRates.find((item) => item.pair === pair);
  const value = Number(previous?.rawRate ?? previous?.rate);
  return Number.isFinite(value) ? value : null;
}

function normalizeRate({ pair, rate, previousRate, source, sourceDate, checkedAt }) {
  const rawRate = Number(rate);
  const diff = previousRate == null ? 0 : rawRate - previousRate;
  return {
    pair,
    rate: roundRate(rawRate).toFixed(2),
    rawRate,
    change: formatChange(diff),
    direction: diff < 0 ? "down" : diff > 0 ? "up" : "flat",
    updated_at: checkedAt,
    source,
    source_date: sourceDate || null
  };
}

function fallbackSnapshot(message = "Live forex unavailable; showing last reference rates.") {
  const checkedAt = isoNow();
  const previousRates = cachedSnapshot?.rates || [];
  return {
    ok: false,
    status: "fallback",
    message,
    refresh_interval_ms: FOREX_REFRESH_MS,
    checked_at: checkedAt,
    next_refresh_at: nextRefreshAt(Date.now()),
    rates: FALLBACK_RATES.map((item) => normalizeRate({
      ...item,
      previousRate: previousRateFor(previousRates, item.pair),
      source: "GOPU FX reference fallback",
      sourceDate: null,
      checkedAt
    }))
  };
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FOREX_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPairRate(item) {
  const endpoints = [
    {
      url: `https://latest.currency-api.pages.dev/v1/currencies/${item.base}.json`,
      source: "Currency API"
    },
    {
      url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${item.base}.json`,
      source: "Currency API CDN fallback"
    }
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJsonWithTimeout(endpoint.url);
      const rate = Number(payload?.[item.base]?.inr);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Missing INR rate for ${item.base}`);
      return {
        pair: item.pair,
        rate,
        source: endpoint.source,
        sourceDate: payload.date || null
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Unable to fetch ${item.pair}`);
}

async function refreshForexRates(previousRates = []) {
  const checkedAtMs = Date.now();
  const checkedAt = new Date(checkedAtMs).toISOString();
  const results = await Promise.all(FOREX_PAIRS.map((item) => fetchPairRate(item)));
  const rates = results.map((item) => normalizeRate({
    ...item,
    previousRate: previousRateFor(previousRates, item.pair),
    checkedAt
  }));
  return {
    ok: true,
    status: "live",
    message: "Live forex rates refreshed.",
    refresh_interval_ms: FOREX_REFRESH_MS,
    checked_at: checkedAt,
    next_refresh_at: nextRefreshAt(checkedAtMs),
    source: "Currency API",
    rates
  };
}

export async function getForexRates({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedSnapshot?.checked_at) {
    const ageMs = now - new Date(cachedSnapshot.checked_at).getTime();
    if (ageMs >= 0 && ageMs < FOREX_REFRESH_MS) {
      return {
        ...cachedSnapshot,
        cache_status: "fresh",
        age_ms: ageMs,
        next_refresh_at: nextRefreshAt(new Date(cachedSnapshot.checked_at).getTime())
      };
    }
  }

  if (!pendingRefresh) {
    const previousRates = cachedSnapshot?.rates || [];
    pendingRefresh = refreshForexRates(previousRates)
      .then((snapshot) => {
        cachedSnapshot = snapshot;
        return { ...snapshot, cache_status: "refreshed", age_ms: 0 };
      })
      .catch((error) => {
        if (cachedSnapshot?.rates?.length) {
          return {
            ...cachedSnapshot,
            ok: true,
            status: "stale",
            cache_status: "stale_fallback",
            message: `Using last successful FX snapshot. ${error?.message || "Refresh failed."}`,
            age_ms: now - new Date(cachedSnapshot.checked_at).getTime(),
            next_refresh_at: new Date(now + 5 * 60 * 1000).toISOString()
          };
        }
        return {
          ...fallbackSnapshot(error?.message || "Live forex refresh failed."),
          cache_status: "reference_fallback",
          age_ms: null
        };
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }

  return pendingRefresh;
}

export function getForexFallbackRates() {
  return fallbackSnapshot();
}
