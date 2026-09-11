import { describe, expect, it } from "vitest";
import {
  planCompletion,
  type CompletableLine,
} from "@/lib/services/batch-service";

const lines: CompletableLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    plannedQuantity: 1800,
    issuedQuantity: 1800,
    unitPrice: 0.1,
  },
  {
    materialId: "jar",
    materialName: "Teglica 200ml",
    plannedQuantity: 10,
    issuedQuantity: 10,
    unitPrice: 45,
  },
];

describe("planCompletion", () => {
  it("srećan put: sve izdato je utrošeno, serija je ZAVRSENA", () => {
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1800, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 10, wasteQuantity: 0 },
      ],
      10,
      0,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("ZAVRSENA");
    expect(result.batchCost).toBe(630);
    expect(result.actualUnitCost).toBe(63);
    expect(result.lines.every((l) => l.returnedQuantity === 0)).toBe(true);
    expect(result.lines.every((l) => l.deviation === 0)).toBe(true);
  });

  it("višak iznad recepta (prethodno izdat) se vraća i ne ulazi u trošak", () => {
    const overIssued: CompletableLine[] = [
      { ...lines[0], issuedQuantity: 1900 },
      lines[1],
    ];
    const result = planCompletion(
      overIssued,
      [
        { materialId: "wax", consumedQuantity: 1800, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 10, wasteQuantity: 0 },
      ],
      10,
      0,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].returnedQuantity).toBe(100);
    expect(result.batchCost).toBe(630);
  });

  it("blokira utrošak ispod recepta za proizvedenu količinu", () => {
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1700, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 10, wasteQuantity: 0 },
      ],
      10,
      0,
      10,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      "Utrošak ispod recepta za proizvedenu količinu: Soja vosak (min. 1800)",
    );
  });

  it("otpad ulazi u trošak serije, povraćaj ne", () => {
    // proizvedeno 9 → očekivano vosak 1620, teglica 9
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1620, wasteQuantity: 100 },
        { materialId: "jar", consumedQuantity: 9, wasteQuantity: 1 },
      ],
      9,
      1,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // vosak: (1620 + 100) × 0,1 = 172; teglice: (9 + 1) × 45 = 450
    expect(result.batchCost).toBe(622);
    expect(result.lines[0].returnedQuantity).toBe(80);
    expect(result.status).toBe("DELIMICNO_USPESNA");
  });

  it("utrošeno + otpad preko izdatog je greška", () => {
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1800, wasteQuantity: 1 },
        { materialId: "jar", consumedQuantity: 10, wasteQuantity: 0 },
      ],
      10,
      0,
      10,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      "Utrošeno i otpad prelaze izdatu količinu: Soja vosak",
    );
  });

  it("odstupanje od recepture se računa po stavci (srazmerno produced)", () => {
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1620, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 9, wasteQuantity: 0 },
      ],
      9,
      0,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].deviation).toBe(-180);
    expect(result.lines[1].deviation).toBe(-1);
  });

  it("kad nema ispravnih komada, stvarna cena po komadu je null", () => {
    const result = planCompletion(
      lines,
      [
        { materialId: "wax", consumedQuantity: 1800, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 10, wasteQuantity: 0 },
      ],
      0,
      10,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actualUnitCost).toBeNull();
    expect(result.batchCost).toBe(630);
    expect(result.status).toBe("DELIMICNO_USPESNA");
  });

  it("ni proizvedenih ni škarta — greška", () => {
    const result = planCompletion(lines, [], 0, 0, 10);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Evidentirajte proizvedene komade ili škart");
  });

  it("bez izveštaja po stavci podrazumeva da je sve izdato utrošeno", () => {
    const result = planCompletion(lines, [], 10, 0, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].consumedQuantity).toBe(1800);
    expect(result.lines[0].wasteQuantity).toBe(0);
  });

  it("prekoračenje plana zahteva dovoljno izdatog materijala", () => {
    const overIssued: CompletableLine[] = [
      { ...lines[0], issuedQuantity: 1980 },
      { ...lines[1], issuedQuantity: 11 },
    ];
    const result = planCompletion(
      overIssued,
      [
        { materialId: "wax", consumedQuantity: 1980, wasteQuantity: 0 },
        { materialId: "jar", consumedQuantity: 11, wasteQuantity: 0 },
      ],
      11,
      0,
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.includes("prelaze planiranu"))).toBe(
      true,
    );
    expect(result.status).toBe("DELIMICNO_USPESNA");
  });

  it("prekoračenje plana bez dovoljno utroška je greška", () => {
    const result = planCompletion(lines, [], 11, 0, 10);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Utrošak ispod recepta");
  });

  it("odbija decimalan i negativan broj komada", () => {
    expect(planCompletion(lines, [], 2.5, 0, 10).ok).toBe(false);
    expect(planCompletion(lines, [], -1, 0, 10).ok).toBe(false);
    expect(planCompletion(lines, [], 5, -1, 10).ok).toBe(false);
  });

  it("odbija izveštaj za sirovinu van serije", () => {
    const result = planCompletion(
      lines,
      [{ materialId: "x", consumedQuantity: 1, wasteQuantity: 0 }],
      10,
      0,
      10,
    );
    expect(result.ok).toBe(false);
  });
});
