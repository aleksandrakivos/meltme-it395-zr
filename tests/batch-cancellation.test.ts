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
    consumedQuantity: 0,
    unitPrice: 0.1,
  },
];

const startedLines: CancellableLine[] = [
  {
    materialId: "wax",
    materialName: "Soja vosak",
    reservedQuantity: 0,
    issuedQuantity: 1800,
    consumedQuantity: 500,
    unitPrice: 0.1,
  },
];

describe("planCancellation", () => {
  it("iz PLANIRANA samo oslobađa rezervaciju", () => {
    const result = planCancellation(BatchStatus.PLANIRANA, plannedLines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0]).toEqual({
      materialId: "wax",
      materialName: "Soja vosak",
      releaseReservation: 1800,
      returnToStock: 0,
      writtenOff: 0,
    });
    expect(result.writtenOffCost).toBe(0);
  });

  it("iz ZAPOCETA vraća neutrošeno, već utrošeno ostaje trošak", () => {
    const result = planCancellation(BatchStatus.ZAPOCETA, startedLines);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].returnToStock).toBe(1300);
    expect(result.lines[0].writtenOff).toBe(500);
    expect(result.writtenOffCost).toBe(50);
  });

  it("iz U_TOKU se ponaša isto kao iz ZAPOCETA", () => {
    const started = planCancellation(BatchStatus.ZAPOCETA, startedLines);
    const inProgress = planCancellation(BatchStatus.U_TOKU, startedLines);
    expect(inProgress).toEqual(started);
  });

  it("ne vraća negativnu količinu kad je utrošeno sve izdato", () => {
    const result = planCancellation(BatchStatus.U_TOKU, [
      { ...startedLines[0], consumedQuantity: 1800 },
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
