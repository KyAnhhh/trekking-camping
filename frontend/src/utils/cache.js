/**
 * Client-side Caching & Request Deduplication Store for Trekking & Camping.
 * 
 * Features:
 * - High-speed in-memory store for instantaneous 0ms client-side navigations.
 * - Public-only SessionStorage persistence for instant F5 reload without spinner flicker.
 * - In-flight request deduplication to prevent duplicate concurrent network calls.
 * - Stale-While-Revalidate (SWR) support with per-resource TTL.
 * - Key-based & pattern-based cache invalidation.
 * - Automatic wipe on auth session expiration to prevent cross-account data leakage.
 */

const memoryStore = new Map();
const inflightStore = new Map();
const listeners = new Set();

const SESSION_PREFIX = 'tc_pub_cache:';

export function normalizeKey(key) {
  if (!key) return null;
  if (Array.isArray(key)) return key.filter((k) => k !== null && k !== undefined && k !== '').join(':');
  return String(key);
}

/**
 * Retrieve cached entry.
 * Checks memory first, falls back to sessionStorage for public persisted items.
 */
export function getCache(key, { allowStale = true } = {}) {
  const normKey = normalizeKey(key);
  if (!normKey) return null;

  let entry = memoryStore.get(normKey);

  // Fallback to sessionStorage if not in memory (e.g. after F5 reload)
  if (!entry && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(SESSION_PREFIX + normKey);
      if (raw) {
        entry = JSON.parse(raw);
        // Hydrate back into memory for faster subsequent lookups
        if (entry && entry.timestamp && entry.ttl && entry.data !== undefined && entry.data !== null) {
          memoryStore.set(normKey, entry);
        } else {
          entry = null;
        }
      }
    } catch (e) {
      entry = null;
    }
  }

  if (!entry || entry.data === undefined || entry.data === null) return null;

  const age = Date.now() - entry.timestamp;
  const isFresh = age < entry.ttl;

  if (isFresh) {
    return { data: entry.data, fresh: true, timestamp: entry.timestamp };
  }

  if (allowStale) {
    return { data: entry.data, fresh: false, timestamp: entry.timestamp };
  }

  return null;
}

/**
 * Save data to cache.
 */
export function setCache(key, data, { ttl = 300000, persist = false } = {}) {
  const normKey = normalizeKey(key);
  if (!normKey || data === undefined || data === null) return;

  const entry = {
    data,
    timestamp: Date.now(),
    ttl,
    persist: Boolean(persist),
  };

  memoryStore.set(normKey, entry);

  if (persist && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_PREFIX + normKey, JSON.stringify(entry));
    } catch (e) {
      // Storage quota or serialization issue, silent fallback to memory-only
    }
  }

  notifyListeners(normKey, data);
}

/**
 * Invalidate cache entry by exact key or prefix.
 */
export function invalidateCache(pattern) {
  const normPattern = normalizeKey(pattern);
  if (!normPattern) {
    // Invalidate everything
    memoryStore.clear();
    inflightStore.clear();
    clearSessionCache();
    notifyListeners('*', null);
    return;
  }

  // Exact match or prefix match
  for (const k of memoryStore.keys()) {
    if (k === normPattern || k.startsWith(normPattern + ':')) {
      memoryStore.delete(k);
    }
  }
  for (const k of inflightStore.keys()) {
    if (k === normPattern || k.startsWith(normPattern + ':')) {
      inflightStore.delete(k);
    }
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const toRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const fullKey = window.sessionStorage.key(i);
        if (fullKey && fullKey.startsWith(SESSION_PREFIX)) {
          const itemKey = fullKey.slice(SESSION_PREFIX.length);
          if (itemKey === normPattern || itemKey.startsWith(normPattern + ':')) {
            toRemove.push(fullKey);
          }
        }
      }
      toRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch (e) {}
  }

  notifyListeners(normPattern, null);
}

function clearSessionCache() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const toRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(SESSION_PREFIX)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch (e) {}
}

/**
 * Deduplicate concurrent in-flight requests for the same key.
 */
export function fetchWithDedupe(key, fetcher) {
  const normKey = normalizeKey(key);
  if (!normKey) return Promise.resolve().then(() => fetcher());

  if (inflightStore.has(normKey)) {
    return inflightStore.get(normKey);
  }

  const promise = Promise.resolve()
    .then(() => fetcher())
    .catch((err) => {
      inflightStore.delete(normKey);
      throw err;
    })
    .finally(() => {
      inflightStore.delete(normKey);
    });

  inflightStore.set(normKey, promise);
  return promise;
}

/**
 * Listeners for cache updates / invalidations
 */
function notifyListeners(key, data) {
  listeners.forEach((listener) => {
    try {
      listener(key, data);
    } catch (e) {
      console.error('Cache listener error:', e);
    }
  });
}

export function subscribeCache(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Automatically wipe private cache when session expires or changes
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    memoryStore.clear();
    inflightStore.clear();
    clearSessionCache();
  });
  window.addEventListener('auth:changed', () => {
    memoryStore.clear();
    inflightStore.clear();
    clearSessionCache();
  });
}
