import { describe, expect, it } from "vitest";
import { BatchStatus } from "@prisma/client";
import {
  planCancellation,
  type CancellableLine,
} from "@/lib/services/batch-service";

const plannedLines: CancellableLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    reservedQuantity: 1800,
    issuedQuantity: 0,
    unitPrice: 0.1,
  },
];

const startedLines: CancellableLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    reservedQuantity: 0,
    issuedQuantity: 1800,
    unitPrice: 0.1,
  },
];

describe("planCancellation", () => {
  it("iz PLANIRANA samo oslobađa rezervaciju", () => {
    const result = planCancellation(BatchStatus.PLANIRANA, plannedLines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0]).toMatchObject({
      materialId: "wax",
      materialName: "Soja vosak",
      releaseReservation: 1800,
      returnToStock: 0,
      writtenOff: 0,
      consumedQuantity: 0,
      wasteQuantity: 0,
    });
    expect(result.writtenOffCost).toBe(0);
  });

  it("iz ZAPOCETA vraća neutrošeno, utrošak i otpad ostaju trošak", () => {
    const result = planCancellation(BatchStatus.ZAPOCETA, startedLines, [
      { materialId: "wax", consumedQuantity: 400, wasteQuantity: 100 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].returnToStock).toBe(1300);
    expect(result.lines[0].consumedQuantity).toBe(400);
    expect(result.lines[0].wasteQuantity).toBe(100);
    expect(result.lines[0].writtenOff).toBe(400);
    expect(result.writtenOffCost).toBe(50);
  });

  it("bez izveštaja iz ZAPOCETA vraća sve izdato", () => {
    const result = planCancellation(BatchStatus.ZAPOCETA, startedLines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].returnToStock).toBe(1800);
    expect(result.lines[0].consumedQuantity).toBe(0);
    expect(result.lines[0].wasteQuantity).toBe(0);
    expect(result.writtenOffCost).toBe(0);
  });

  it("odbija otkazivanje iz U_TOKU", () => {
    const result = planCancellation(BatchStatus.U_TOKU, startedLines, [
      { materialId: "wax", consumedQuantity: 0, wasteQuantity: 0 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/u toku/i);
  });

  it("odbija utrošak + otpad iznad izdatog", () => {
    const result = planCancellation(BatchStatus.ZAPOCETA, startedLines, [
      { materialId: "wax", consumedQuantity: 1000, wasteQuantity: 900 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("ne vraća negativnu količinu kad je sve utrošeno ili otpad", () => {
    const result = planCancellation(BatchStatus.ZAPOCETA, startedLines, [
      { materialId: "wax", consumedQuantity: 1500, wasteQuantity: 300 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].returnToStock).toBe(0);
  });

  it("odbija otkazivanje serije u terminalnom statusu", () => {
    for (const status of [
      BatchStatus.ZAVRSENA,
      BatchStatus.DELIMICNO_USPESNA,
      BatchStatus.OTKAZANA,
    ]) {
      const result = planCancellation(status, startedLines);
      expect(result.ok).toBe(false);
    }
  });
});
