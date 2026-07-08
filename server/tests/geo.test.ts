import { describe, it, expect } from "vitest";
import { haversineDistanceKm } from "../src/utils/geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm(28.6315, 77.2167, 28.6315, 77.2167)).toBeCloseTo(0, 5);
  });

  it("is roughly correct for Connaught Place to India Gate (~2.5km)", () => {
    const d = haversineDistanceKm(28.6315, 77.2167, 28.6129, 77.2295);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(4);
  });

  it("is symmetric", () => {
    const a = haversineDistanceKm(28.6315, 77.2167, 28.5507, 77.1219);
    const b = haversineDistanceKm(28.5507, 77.1219, 28.6315, 77.2167);
    expect(a).toBeCloseTo(b, 8);
  });
});
