import { describe, expect, it } from "vitest";
import {
  buildPriceHistory,
  countedStockAdjustment,
  planStockAdjustment,
  purchaseTotalCost,
  roundTo,
  weightedAveragePrice,
} from "@/lib/services/material-costing";

describe("countedStockAdjustment (režim „Prebrojano stanje“)", () => {
  it("manje izbrojano od stanja → manjak", () => {
    expect(countedStockAdjustment(1200, 1150)).toEqual({
      direction: "MINUS",
      quantity: 50,
    });
  });

  it("više izbrojano od stanja → višak", () => {
    expect(countedStockAdjustment(1200, 1230.5)).toEqual({
      direction: "PLUS",
      quantity: 30.5,
    });
  });

  it("isto stanje → nema korekcije", () => {
    expect(countedStockAdjustment(1200, 1200)).toBeNull();
  });

  it("zaokružuje razliku na 3 decimale (kao količine u bazi)", () => {
    expect(countedStockAdjustment(0.1 + 0.2, 0.3)).toBeNull();
    expect(countedStockAdjustment(10, 9.9999)).toBeNull();
    expect(countedStockAdjustment(10, 9.9985)).toEqual({
      direction: "MINUS",
      quantity: 0.002,
    });
  });

  it("odbija negativno prebrojano stanje", () => {
    expect(() => countedStockAdjustment(10, -1)).toThrow();
  });

  it("izvedena korekcija se poklapa sa planStockAdjustment", () => {
    const counted = countedStockAdjustment(1200, 1150);
    expect(counted).not.toBeNull();
    if (!counted) return;
    const plan = planStockAdjustment(1200, 0.85, counted.direction, counted.quantity);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.newStock).toBe(1150);
  });
});

describe("weightedAveragePrice", () => {
  it("prva nabavka na prazno stanje daje nabavnu cenu", () => {
    expect(weightedAveragePrice(0, 0, 10000, 0.85)).toBe(0.85);
  });

  it("druga nabavka po drugoj ceni daje prosek između dve cene", () => {
    // 10 kg @ 0,85 + 10 kg @ 1,10 → 0,975
    const avg = weightedAveragePrice(10000, 0.85, 10000, 1.1);
    expect(avg).toBe(0.975);
    expect(avg).toBeGreaterThan(0.85);
    expect(avg).toBeLessThan(1.1);
  });

  it("ponderiše po količini, ne po broju nabavki", () => {
    // 1000 @ 1,00 + 9000 @ 2,00 → 1,9
    expect(weightedAveragePrice(1000, 1, 9000, 2)).toBe(1.9);
  });

  it("kad je stanje 0 a prosek nasleđen, prosek postaje nova cena", () => {
    expect(weightedAveragePrice(0, 3.5, 100, 2)).toBe(2);
  });

  it("zaokružuje na 4 decimale", () => {
    // (3 × 1) / (3 + 0.0001) → beskonačna decimala
    const avg = weightedAveragePrice(3, 1, 7, 0.3333333);
    expect(avg).toBe(roundTo(avg, 4));
    expect(String(avg).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });

  it("odbija količinu nula ili negativnu", () => {
    expect(() => weightedAveragePrice(10, 1, 0, 5)).toThrow(
      "Količina nabavke mora biti veća od nule",
    );
    expect(() => weightedAveragePrice(10, 1, -5, 5)).toThrow();
  });

  it("odbija negativnu nabavnu cenu", () => {
    expect(() => weightedAveragePrice(10, 1, 5, -1)).toThrow(
      "Nabavna cena ne može biti negativna",
    );
  });

  it("nabavka po istoj ceni ne pomera prosek", () => {
    expect(weightedAveragePrice(500, 2.2, 500, 2.2)).toBe(2.2);
  });
});

describe("purchaseTotalCost", () => {
  it("zaokružuje ukupan iznos na 2 decimale", () => {
    expect(purchaseTotalCost(10000, 0.0856)).toBe(856);
    expect(purchaseTotalCost(3, 0.3333)).toBe(1);
  });
});

describe("planStockAdjustment", () => {
  it("smanjenje ne menja prosečnu cenu", () => {
    const result = planStockAdjustment(100, 2.5, "MINUS", 40);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.newStock).toBe(60);
    expect(result.plan.newAvgPrice).toBe(2.5);
  });

  it("smanjenje ispod nule je greška", () => {
    const result = planStockAdjustment(10, 2.5, "MINUS", 11);
    expect(result.ok).toBe(false);
  });

  it("povećanje bez cene koristi zatečeni prosek", () => {
    const result = planStockAdjustment(100, 2.5, "PLUS", 100);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.newStock).toBe(200);
    expect(result.plan.newAvgPrice).toBe(2.5);
  });

  it("povećanje sa cenom pomera prosek", () => {
    const result = planStockAdjustment(100, 2, "PLUS", 100, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.newAvgPrice).toBe(3);
  });

  it("količina nula je greška", () => {
    expect(planStockAdjustment(10, 1, "PLUS", 0).ok).toBe(false);
  });
});

describe("buildPriceHistory", () => {
  it("rekonstruiše prosek kroz niz nabavki", () => {
    const points = buildPriceHistory([
      { quantity: 10000, unitPrice: 0.85 },
      { quantity: 10000, unitPrice: 1.1 },
    ]);
    expect(points).toHaveLength(2);
    expect(points[0].runningAverage).toBe(0.85);
    expect(points[1].runningAverage).toBe(0.975);
    expect(points[1].runningStock).toBe(20000);
  });

  it("prazna istorija daje praznu listu", () => {
    expect(buildPriceHistory([])).toEqual([]);
  });
});
