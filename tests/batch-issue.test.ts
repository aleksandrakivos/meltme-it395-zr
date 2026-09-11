import { describe, expect, it } from "vitest";
import { planIssue, type IssuableLine } from "@/lib/services/batch-service";

const lines: IssuableLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    plannedQuantity: 1800,
    reservedQuantity: 1800,
    stock: 5000,
    avgPrice: 0.0975,
  },
  {
    materialId: "jar",
    materialName: "Teglica 200ml",
    plannedQuantity: 10,
    reservedQuantity: 10,
    stock: 150,
    avgPrice: 45,
  },
];

describe("planIssue", () => {
  it("podrazumevano izdaje planiranu količinu i snima prosečnu cenu", () => {
    const result = planIssue(lines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0]).toEqual({
      materialId: "wax",
      materialName: "Soja vosak",
      issuedQuantity: 1800,
      releaseReservation: 1800,
      unitPrice: 0.0975,
    });
    expect(result.issuedCost).toBe(625.5);
  });

  it("dozvoljava ručnu korekciju naviše", () => {
    const result = planIssue(lines, [{ materialId: "wax", quantity: 1900 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].issuedQuantity).toBe(1900);
    expect(result.lines[0].releaseReservation).toBe(1800);
  });

  it("dozvoljava ručnu korekciju naniže, uključujući nulu za jednu stavku", () => {
    const result = planIssue(lines, [{ materialId: "jar", quantity: 0 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[1].issuedQuantity).toBe(0);
  });

  it("odbija izdavanje preko stanja", () => {
    const result = planIssue(lines, [{ materialId: "wax", quantity: 5001 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Nedovoljno na stanju");
    expect(result.error).toContain("Soja vosak");
  });

  it("odbija negativnu količinu", () => {
    expect(planIssue(lines, [{ materialId: "wax", quantity: -1 }]).ok).toBe(
      false,
    );
  });

  it("odbija korekciju za sirovinu koja nije stavka serije", () => {
    const result = planIssue(lines, [{ materialId: "nepostojeca", quantity: 1 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Sirovina nije stavka ove serije");
  });

  it("odbija izdavanje u kojem su sve količine nula", () => {
    const result = planIssue(lines, [
      { materialId: "wax", quantity: 0 },
      { materialId: "jar", quantity: 0 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("odbija seriju bez stavki", () => {
    expect(planIssue([]).ok).toBe(false);
  });
});
