import { describe, it, expect } from "vitest";
import { textRelevanceTier } from "../src/services/storageService";

const loc = {
  name: "CP Central Cloakroom",
  address: "Inner Circle, Connaught Place, New Delhi",
  city: "New Delhi",
};

describe("textRelevanceTier", () => {
  it("returns 0 when there is no search text", () => {
    expect(textRelevanceTier(undefined, loc)).toBe(0);
    expect(textRelevanceTier("", loc)).toBe(0);
  });

  it("returns 3 for an exact (case-insensitive) name match", () => {
    expect(textRelevanceTier("CP Central Cloakroom", loc)).toBe(3);
    expect(textRelevanceTier("cp central cloakroom", loc)).toBe(3);
  });

  it("returns 2 for a partial name match", () => {
    expect(textRelevanceTier("Central Cloakroom", loc)).toBe(2);
    expect(textRelevanceTier("CP Central", loc)).toBe(2);
  });

  it("returns 1 for an address or city match that isn't in the name", () => {
    expect(textRelevanceTier("Connaught Place", loc)).toBe(1);
    expect(textRelevanceTier("New Delhi", loc)).toBe(1);
  });

  it("returns 0 when nothing matches", () => {
    expect(textRelevanceTier("Mumbai Airport", loc)).toBe(0);
    expect(textRelevanceTier("xyzrandomplace123", loc)).toBe(0);
  });

  it("ranks name matches above address matches (tier ordering)", () => {
    const nameMatch = textRelevanceTier("CP Central Cloakroom", loc);
    const addressMatch = textRelevanceTier("Connaught Place", loc);
    expect(nameMatch).toBeGreaterThan(addressMatch);
  });
});
