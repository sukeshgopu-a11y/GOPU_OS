const cacheStore = new Map();
const inFlightStore = new Map();

function now() {
  return Date.now();
}

export function readCache(key) {
  const entry = cacheStore.get(key);
  if (!entry || entry.expiresAt <= now()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

export function writeCache(key, value, ttlMs) {
  cacheStore.set(key, { value, expiresAt: now() + ttlMs });
  return value;
}

export function clearCache(prefix = '') {
  for (const key of cacheStore.keys()) {
    if (!prefix || key.startsWith(prefix)) cacheStore.delete(key);
  }
  for (const key of inFlightStore.keys()) {
    if (!prefix || key.startsWith(prefix)) inFlightStore.delete(key);
  }
}

export function cachedRead(key, ttlMs, loader) {
  const cached = readCache(key);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightStore.get(key);
  if (inFlight) return inFlight;

  const request = Promise.resolve()
    .then(loader)
    .then((value) => writeCache(key, value, ttlMs))
    .finally(() => inFlightStore.delete(key));

  inFlightStore.set(key, request);
  return request;
}
