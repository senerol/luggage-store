import { describe, it, expect, vi } from "vitest";
import { createGeocodingService, GeocodeResult } from "../src/services/geocodingService";

function fakeResult(overrides: Partial<GeocodeResult> = {}): GeocodeResult {
  return { latitude: 28.6315, longitude: 77.2167, displayName: "Connaught Place, New Delhi", ...overrides };
}

describe("geocodingService", () => {
  it("returns the provider's result on a fresh query", async () => {
    const provider = vi.fn().mockResolvedValue(fakeResult());
    const service = createGeocodingService(provider);

    const result = await service.geocode("Connaught Place, Delhi");

    expect(result).toEqual(fakeResult());
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("returns null when the provider can't resolve the query, without throwing", async () => {
    const provider = vi.fn().mockResolvedValue(null);
    const service = createGeocodingService(provider);

    const result = await service.geocode("xyzrandomplace123");

    expect(result).toBeNull();
  });

  it("caches results so the same query doesn't hit the provider twice", async () => {
    const provider = vi.fn().mockResolvedValue(fakeResult());
    const service = createGeocodingService(provider);

    await service.geocode("Connaught Place, Delhi");
    await service.geocode("Connaught Place, Delhi");
    await service.geocode("connaught place, delhi"); // case-insensitive cache key
    await service.geocode("  Connaught Place, Delhi  "); // trimmed cache key

    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("caches a null (unresolved) result too, rather than retrying every time", async () => {
    const provider = vi.fn().mockResolvedValue(null);
    const service = createGeocodingService(provider);

    await service.geocode("xyzrandomplace123");
    await service.geocode("xyzrandomplace123");

    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("treats different queries independently", async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce(fakeResult({ displayName: "Connaught Place" }))
      .mockResolvedValueOnce(fakeResult({ latitude: 28.6129, longitude: 77.2295, displayName: "India Gate" }));
    const service = createGeocodingService(provider);

    const a = await service.geocode("Connaught Place");
    const b = await service.geocode("India Gate");

    expect(a?.displayName).toBe("Connaught Place");
    expect(b?.displayName).toBe("India Gate");
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("spaces out consecutive provider calls to respect the rate limit", async () => {
    const provider = vi.fn().mockResolvedValue(fakeResult());
    const service = createGeocodingService(provider);

    const start = Date.now();
    await Promise.all([service.geocode("Place A"), service.geocode("Place B")]);
    const elapsed = Date.now() - start;

    // Two distinct queries queued back-to-back must be spaced by roughly the
    // service's minimum request interval (~1.1s) rather than fired in
    // parallel - this is what keeps a shared free geocoding API within its
    // usage policy under concurrent requests.
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  }, 10000);
});
