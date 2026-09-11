import { describe, expect, it } from "vitest";
import { BatchStatus } from "@prisma/client";
import {
  BATCH_TRANSITIONS,
  allowedBatchTransitions,
  canCompleteBatch,
  canTransitionBatch,
  deriveCompletionStatus,
  isTerminalBatchStatus,
} from "@/lib/services/batch-lifecycle";

const ALL = Object.values(BatchStatus);

describe("canTransitionBatch", () => {
  it("dozvoljava sve prelaze iz matrice", () => {
    for (const from of ALL) {
      for (const to of BATCH_TRANSITIONS[from]) {
        expect(canTransitionBatch(from, to)).toBe(true);
      }
    }
  });

  it("zabranjuje sve prelaze koji nisu u matrici", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        if (BATCH_TRANSITIONS[from].includes(to)) continue;
        expect(canTransitionBatch(from, to)).toBe(false);
      }
    }
  });

  it("zabranjuje prelaz u isti status", () => {
    for (const status of ALL) {
      expect(canTransitionBatch(status, status)).toBe(false);
    }
  });

  it("planirana serija ide samo u započetu ili otkazanu", () => {
    expect(allowedBatchTransitions(BatchStatus.PLANIRANA)).toEqual([
      BatchStatus.ZAPOCETA,
      BatchStatus.OTKAZANA,
    ]);
    expect(canTransitionBatch(BatchStatus.PLANIRANA, BatchStatus.ZAVRSENA)).toBe(
      false,
    );
    expect(canTransitionBatch(BatchStatus.PLANIRANA, BatchStatus.U_TOKU)).toBe(
      false,
    );
  });

  it("iz terminalnog statusa nema izlaza", () => {
    for (const status of [
      BatchStatus.ZAVRSENA,
      BatchStatus.DELIMICNO_USPESNA,
      BatchStatus.OTKAZANA,
    ]) {
      expect(isTerminalBatchStatus(status)).toBe(true);
      for (const to of ALL) {
        expect(canTransitionBatch(status, to)).toBe(false);
      }
    }
  });

  it("radne faze dozvoljavaju završetak", () => {
    expect(canCompleteBatch(BatchStatus.ZAPOCETA)).toBe(true);
    expect(canCompleteBatch(BatchStatus.U_TOKU)).toBe(true);
    expect(canCompleteBatch(BatchStatus.PLANIRANA)).toBe(false);
  });
});

describe("deriveCompletionStatus", () => {
  it("puna količina bez škarta je ZAVRSENA", () => {
    expect(deriveCompletionStatus(20, 20, 0)).toBe("ZAVRSENA");
  });

  it("manje komada od planiranog je DELIMICNO_USPESNA", () => {
    expect(deriveCompletionStatus(20, 18, 0)).toBe("DELIMICNO_USPESNA");
  });

  it("puna količina uz škart je DELIMICNO_USPESNA", () => {
    expect(deriveCompletionStatus(20, 20, 2)).toBe("DELIMICNO_USPESNA");
  });

  it("nula ispravnih komada je DELIMICNO_USPESNA", () => {
    expect(deriveCompletionStatus(20, 0, 20)).toBe("DELIMICNO_USPESNA");
  });

  it("više komada od planiranog nije potpuno po planu", () => {
    expect(deriveCompletionStatus(20, 21, 0)).toBe("DELIMICNO_USPESNA");
  });
});
