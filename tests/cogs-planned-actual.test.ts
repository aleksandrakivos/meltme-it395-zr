import { describe, expect, it } from "vitest";
import {
  calculateActualUnitCost,
  calculateCostVariance,
  calculateMargin,
  calculatePlannedUnitCost,
} from "@/lib/services/cogs";

const recipe = [
  { quantity: 180, avgPurchasePrice: 0.0975 },
  { quantity: 1, avgPurchasePrice: 5 },
  { quantity: 1, avgPurchasePrice: 45 },
  { quantity: 12, avgPurchasePrice: 2.5 },
];

describe("calculatePlannedUnitCost", () => {
  it("množi recepturu prosečnom nabavnom cenom", () => {
    // 17,55 + 5 + 45 + 30
    expect(calculatePlannedUnitCost(recipe)).toBeCloseTo(97.55, 10);
  });

  it("proizvod bez recepture ima plansku cenu nula", () => {
    expect(calculatePlannedUnitCost([])).toBe(0);
  });
});

describe("calculateActualUnitCost", () => {
  it("ponderiše trošak završenih serija brojem ispravnih komada", () => {
    const actual = calculateActualUnitCost([
      { batchCost: 1000, producedQuantity: 10 },
      { batchCost: 1200, producedQuantity: 10 },
    ]);
    expect(actual).toBe(110);
  });

  it("serija sa škartom podiže stvarnu cenu preostalih komada", () => {
    const actual = calculateActualUnitCost([
      { batchCost: 1000, producedQuantity: 8 },
    ]);
    expect(actual).toBe(125);
  });

  it("bez završenih serija nema stvarne cene", () => {
    expect(calculateActualUnitCost([])).toBeNull();
  });

  it("serija bez ijednog ispravnog komada ne daje cenu po komadu", () => {
    expect(
      calculateActualUnitCost([{ batchCost: 500, producedQuantity: 0 }]),
    ).toBeNull();
  });
});

describe("calculateCostVariance", () => {
  it("pozitivno odstupanje znači skuplje od plana", () => {
    const variance = calculateCostVariance(100, 110);
    expect(variance).toEqual({ absolute: 10, percent: 10 });
  });

  it("negativno odstupanje znači jeftinije od plana", () => {
    const variance = calculateCostVariance(100, 90);
    expect(variance?.absolute).toBe(-10);
    expect(variance?.percent).toBe(-10);
  });

  it("bez stvarne cene nema odstupanja", () => {
    expect(calculateCostVariance(100, null)).toBeNull();
  });

  it("planska nula ne deli sa nulom", () => {
    expect(calculateCostVariance(0, 50)).toEqual({
      absolute: 50,
      percent: 0,
    });
  });
});

describe("marža nad planskom i stvarnom cenom", () => {
  it("stvarna cena daje nižu maržu kad je proizvodnja skuplja od plana", () => {
    const planned = calculatePlannedUnitCost(recipe);
    const actual = calculateActualUnitCost([
      { batchCost: 1100, producedQuantity: 10 },
    ])!;
    const plannedMargin = calculateMargin(890, planned);
    const actualMargin = calculateMargin(890, actual);
    expect(actual).toBeGreaterThan(planned);
    expect(actualMargin.margin).toBeLessThan(plannedMargin.margin);
    expect(actualMargin.marginPercent).toBeLessThan(
      plannedMargin.marginPercent,
    );
  });
});

describe("izmena nabavne cene ne menja već obračunate troškove serija", () => {
  it("stvarna cena zavisi samo od snimljenog troška serije", () => {
    // Serija je završena po snimljenim cenama; kasnija nabavka menja SAMO
    // plansku cenu, jer se stvarna računa iz batchCost-a koji je zaključan.
    const completed = [{ batchCost: 1000, producedQuantity: 10 }];
    const actualBefore = calculateActualUnitCost(completed);

    const recipeAfterPriceJump = recipe.map((item) => ({
      ...item,
      avgPurchasePrice: item.avgPurchasePrice * 2,
    }));
    const plannedBefore = calculatePlannedUnitCost(recipe);
    const plannedAfter = calculatePlannedUnitCost(recipeAfterPriceJump);
    const actualAfter = calculateActualUnitCost(completed);

    expect(plannedAfter).toBeCloseTo(plannedBefore * 2, 10);
    expect(actualAfter).toBe(actualBefore);
  });
});
