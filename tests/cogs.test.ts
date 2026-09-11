import { describe, expect, it } from "vitest";
import { calculatePlannedUnitCost } from "@/lib/services/cogs";

describe("calculatePlannedUnitCost", () => {
  it("returns 0 for empty recipe", () => {
    expect(calculatePlannedUnitCost([])).toBe(0);
  });

  it("matches a known manual example", () => {
    // 180g soja @ 0.08 + 1 fitilj @ 5 + 1 teglica @ 45 + 12ml miris @ 2.5
    const cost = calculatePlannedUnitCost([
      { quantity: 180, avgPurchasePrice: 0.08 },
      { quantity: 1, avgPurchasePrice: 5 },
      { quantity: 1, avgPurchasePrice: 45 },
      { quantity: 12, avgPurchasePrice: 2.5 },
    ]);
    expect(cost).toBeCloseTo(180 * 0.08 + 5 + 45 + 12 * 2.5, 6);
  });

  it("keeps three-decimal quantity precision", () => {
    const cost = calculatePlannedUnitCost([
      { quantity: 12.125, avgPurchasePrice: 2.4 },
    ]);
    expect(cost).toBeCloseTo(29.1, 6);
  });
});
