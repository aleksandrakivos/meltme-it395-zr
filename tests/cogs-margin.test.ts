import { describe, expect, it } from "vitest";
import { calculateMargin, calculatePlannedUnitCost } from "@/lib/services/cogs";

describe("calculateMargin", () => {
  it("computes positive margin and percent", () => {
    const unitCost = calculatePlannedUnitCost([
      { quantity: 1, avgPurchasePrice: 40 },
    ]);
    const { margin, marginPercent } = calculateMargin(100, unitCost);
    expect(margin).toBe(60);
    expect(marginPercent).toBe(60);
  });

  it("allows negative margin", () => {
    const { margin, marginPercent } = calculateMargin(50, 80);
    expect(margin).toBe(-30);
    expect(marginPercent).toBe(-60);
  });

  it("returns 0 percent when selling price is 0", () => {
    const { margin, marginPercent } = calculateMargin(0, 10);
    expect(margin).toBe(-10);
    expect(marginPercent).toBe(0);
  });
});
