import type { BatchStatus } from "@prisma/client";

/**
 * Životni ciklus proizvodne serije.
 *
 * PLANIRANA  — sirovine su rezervisane, stanje se NE menja
 * ZAPOCETA   — sirovine su izdate u proizvodnju (stanje umanjeno)
 * U_TOKU     — radna faza (proizvodnja traje)
 * ZAVRSENA / DELIMICNO_USPESNA / OTKAZANA — završni statusi
 */
export const BATCH_TRANSITIONS: Record<BatchStatus, readonly BatchStatus[]> = {
  PLANIRANA: ["ZAPOCETA", "OTKAZANA"],
  ZAPOCETA: ["U_TOKU", "ZAVRSENA", "DELIMICNO_USPESNA", "OTKAZANA"],
  U_TOKU: ["ZAVRSENA", "DELIMICNO_USPESNA"],
  ZAVRSENA: [],
  DELIMICNO_USPESNA: [],
  OTKAZANA: [],
};

export function canTransitionBatch(
  from: BatchStatus,
  to: BatchStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return BATCH_TRANSITIONS[from].includes(to);
}

export function allowedBatchTransitions(
  from: BatchStatus,
): readonly BatchStatus[] {
  return BATCH_TRANSITIONS[from];
}

export function isTerminalBatchStatus(status: BatchStatus): boolean {
  return BATCH_TRANSITIONS[status].length === 0;
}

/** Serija se može završiti samo iz radnih faza. */
export function canCompleteBatch(status: BatchStatus): boolean {
  return status === "ZAPOCETA" || status === "U_TOKU";
}

/** Otkazivanje: planirana (oslobađanje) ili započeta (utrošak/otpad/povraćaj). */
export function canCancelBatch(status: BatchStatus): boolean {
  return status === "PLANIRANA" || status === "ZAPOCETA";
}

/**
 * Status pri završetku se određuje na osnovu količina:
 * potpuno uspešna je samo serija bez škarta koja je dala planiranu količinu.
 */
export function deriveCompletionStatus(
  plannedQuantity: number,
  producedQuantity: number,
  scrapQuantity: number,
): Extract<BatchStatus, "ZAVRSENA" | "DELIMICNO_USPESNA"> {
  if (producedQuantity === plannedQuantity && scrapQuantity === 0) {
    return "ZAVRSENA";
  }
  return "DELIMICNO_USPESNA";
}
