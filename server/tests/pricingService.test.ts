import { describe, it, expect } from "vitest";
import { billableHours, calculatePrice, splitCommission } from "../src/services/pricingService";

describe("billableHours", () => {
  it("rounds up partial hours", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T10:30:00Z");
    expect(billableHours(dropoff, pickup)).toBe(1);
  });

  it("enforces a 1 hour minimum even for a near-zero duration", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T10:00:01Z");
    expect(billableHours(dropoff, pickup)).toBe(1);
  });

  it("computes exact whole-hour durations without rounding up an extra hour", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T15:00:00Z");
    expect(billableHours(dropoff, pickup)).toBe(5);
  });
});

describe("calculatePrice", () => {
  const priceRules = [
    { luggageType: "LARGE_SUITCASE", pricePerHour: 50 },
    { luggageType: "BACKPACK", pricePerHour: 20 },
  ];

  it("matches the worked example from the spec: 2 large suitcases, 5 hours", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T15:00:00Z");
    const result = calculatePrice(priceRules, [{ luggageType: "LARGE_SUITCASE", quantity: 2 }], dropoff, pickup);

    expect(result.hours).toBe(5);
    expect(result.baseAmount).toBe(500); // 50/hr * 5hr * 2 bags
    expect(result.serviceFee).toBe(50); // default 10%
    expect(result.totalAmount).toBe(550);
  });

  it("sums multiple luggage types independently", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T12:00:00Z");
    const result = calculatePrice(
      priceRules,
      [
        { luggageType: "LARGE_SUITCASE", quantity: 1 },
        { luggageType: "BACKPACK", quantity: 3 },
      ],
      dropoff,
      pickup
    );
    // 2 hours: large = 50*2*1 = 100, backpack = 20*2*3 = 120 -> base 220
    expect(result.baseAmount).toBe(220);
  });

  it("throws if a requested luggage type has no price rule at this location", () => {
    const dropoff = new Date("2026-01-01T10:00:00Z");
    const pickup = new Date("2026-01-01T12:00:00Z");
    expect(() =>
      calculatePrice(priceRules, [{ luggageType: "OTHER", quantity: 1 }], dropoff, pickup)
    ).toThrow();
  });
});

describe("splitCommission", () => {
  it("matches the spec's worked example: customer pays ₹100, partner gets ₹85, Luggo keeps ₹15", () => {
    const result = splitCommission(100, 15);
    expect(result.platformCommissionAmount).toBe(15);
    expect(result.partnerEarningsAmount).toBe(85);
  });

  it("always sums back to the total amount", () => {
    const result = splitCommission(550, 12.5);
    expect(Math.round((result.partnerEarningsAmount + result.platformCommissionAmount) * 100) / 100).toBe(550);
  });

  it("takes zero commission at 0%", () => {
    const result = splitCommission(200, 0);
    expect(result.platformCommissionAmount).toBe(0);
    expect(result.partnerEarningsAmount).toBe(200);
  });
});
