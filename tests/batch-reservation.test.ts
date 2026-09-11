import { describe, expect, it } from "vitest";
import {
  planReservation,
  previewBatchRequirements,
  type RecipeMaterialLine,
} from "@/lib/services/batch-service";

const recipe: RecipeMaterialLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    quantityPerUnit: 180,
    stock: 5000,
    reserved: 0,
    avgPurchasePrice: 0.0975,
  },
  {
    materialId: "jar",
    materialName: "Teglica 200ml",
    quantityPerUnit: 1,
    stock: 150,
    reserved: 0,
    avgPurchasePrice: 45,
  },
];

describe("planReservation", () => {
  it("rezerviše recepturu × broj komada", () => {
    const result = planReservation(recipe, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toEqual([
      {
        materialId: "wax",
        materialName: "Soja vosak",
        plannedQuantity: 1800,
        reservedQuantity: 1800,
      },
      {
        materialId: "jar",
        materialName: "Teglica 200ml",
        plannedQuantity: 10,
        reservedQuantity: 10,
      },
    ]);
    expect(result.plannedCost).toBe(625.5);
  });

  it("računa protiv raspoloživog, ne ukupnog stanja", () => {
    const withOtherBatch = recipe.map((line) =>
      line.materialId === "jar" ? { ...line, reserved: 145 } : line,
    );
    const result = planReservation(withOtherBatch, 10);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Teglica 200ml");
    expect(result.error).toContain("raspoloživo 5");
  });

  it("prolazi kad je raspoloživo tačno jednako potrebnom", () => {
    const tight = recipe.map((line) =>
      line.materialId === "jar" ? { ...line, reserved: 140 } : line,
    );
    expect(planReservation(tight, 10).ok).toBe(true);
  });

  it("odbija proizvod bez recepture", () => {
    const result = planReservation([], 5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Proizvod nema recepturu");
  });

  it("odbija nulu, negativnu i decimalnu količinu", () => {
    expect(planReservation(recipe, 0).ok).toBe(false);
    expect(planReservation(recipe, -3).ok).toBe(false);
    expect(planReservation(recipe, 2.5).ok).toBe(false);
  });
});

describe("previewBatchRequirements", () => {
  it("prikazuje raspoloživo umanjeno za tuđu rezervaciju", () => {
    const lines = previewBatchRequirements(
      [{ ...recipe[0], reserved: 1800 }],
      10,
    );
    expect(lines[0].available).toBe(3200);
    expect(lines[0].sufficient).toBe(true);
  });
});
