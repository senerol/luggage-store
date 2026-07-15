/**
 * Resolves free-text place names ("Connaught Place, Delhi") into coordinates,
 * so the search endpoint can use "distance from the searched place" rather
 * than just matching text.
 *
 * Provider: OpenStreetMap's Nominatim (https://nominatim.org) - free, keyless,
 * no billing account required, consistent with the rest of the app already
 * using OpenStreetMap tiles for the map. This is explicitly a *development*
 * choice: Nominatim's public instance asks for at most ~1 request/second and
 * a descriptive User-Agent, which is fine for a demo/portfolio project but
 * would need a paid/self-hosted geocoder (or Nominatim's paid tier) under
 * real production traffic.
 *
 * The provider is injected (see `GeocodeProvider`) specifically so this can
 * be swapped for a production geocoder later, or replaced with a stub in
 * tests, without touching any calling code in storageService.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Human-readable resolved place name, e.g. "Connaught Place, New Delhi, Delhi, India" */
  displayName: string;
}

export type GeocodeProvider = (query: string) => Promise<GeocodeResult | null>;

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Luggo-LuggageStorage-Dev/1.0 (https://github.com/senerol/luggage-store)";
const REQUEST_TIMEOUT_MS = 5000;

export const nominatimProvider: GeocodeProvider = async (query) => {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const body = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(body) || body.length === 0) return null;

    const [top] = body;
    const latitude = Number(top.lat);
    const longitude = Number(top.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude, displayName: top.display_name };
  } catch {
    // Network error, timeout, or malformed response - treated the same as
    // "couldn't resolve this location" by the caller (see storageService).
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

interface CacheEntry {
  result: GeocodeResult | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours - place coordinates don't change
const CACHE_MAX_ENTRIES = 500;
const MIN_REQUEST_INTERVAL_MS = 1100; // stays under Nominatim's ~1 req/sec usage policy

/**
 * Wraps a GeocodeProvider with an in-memory cache (so repeat searches for the
 * same place don't hit the network) and a simple request-spacing throttle
 * (so concurrent searches from different users don't collectively exceed the
 * provider's rate limit). Both concerns are deliberately kept out of
 * `nominatimProvider` itself so a test can inject a bare stub provider with
 * neither.
 */
export function createGeocodingService(provider: GeocodeProvider = nominatimProvider) {
  const cache = new Map<string, CacheEntry>();
  let lastRequestAt = 0;
  let queue: Promise<unknown> = Promise.resolve();

  async function geocode(rawQuery: string): Promise<GeocodeResult | null> {
    const key = rawQuery.trim().toLowerCase();
    if (!key) return null;

    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // Chain onto a shared queue so overlapping requests are still spaced out,
    // rather than each one independently racing the throttle check.
    const run = queue.then(async () => {
      const waitFor = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
      if (waitFor > 0) await new Promise((resolve) => setTimeout(resolve, waitFor));
      lastRequestAt = Date.now();
      return provider(rawQuery);
    });
    queue = run.catch(() => undefined);

    const result = (await run) ?? null;

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });

    return result;
  }

  return { geocode };
}

export const geocodingService = createGeocodingService();
