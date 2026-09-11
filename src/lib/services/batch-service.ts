import type { BatchStatus } from "@prisma/client";
import { deriveCompletionStatus } from "@/lib/services/batch-lifecycle";
import { QUANTITY_DECIMALS, roundTo } from "@/lib/services/material-costing";

/**
 * Čiste funkcije životnog ciklusa serije. Transakcioni sloj u
 * `src/actions/batches.ts` samo izvršava plan koji ove funkcije vrate.
 */

export type RecipeMaterialLine = {
  materialId: string;
  materialName: string;
  quantityPerUnit: number;
  stock: number;
  reserved: number;
  avgPurchasePrice: number;
};

export type RequirementLine = {
  materialId: string;
  materialName: string;
  /** receptura × planirana količina */
  quantity: number;
  /** stock − reserved */
  available: number;
  unitPrice: number;
  sufficient: boolean;
};

export type PlanError = { ok: false; error: string };

/** Pregled potreba za seriju — raspoloživo, ne ukupno stanje. */
export function previewBatchRequirements(
  recipe: ReadonlyArray<RecipeMaterialLine>,
  batchQuantity: number,
): RequirementLine[] {
  return recipe.map((line) => {
    const quantity = roundTo(
      line.quantityPerUnit * batchQuantity,
      QUANTITY_DECIMALS,
    );
    const available = roundTo(line.stock - line.reserved, QUANTITY_DECIMALS);
    return {
      materialId: line.materialId,
      materialName: line.materialName,
      quantity,
      available,
      unitPrice: line.avgPurchasePrice,
      sufficient: available >= quantity,
    };
  });
}

export type ReservationLine = {
  materialId: string;
  materialName: string;
  plannedQuantity: number;
  reservedQuantity: number;
};

export type PlanReservationResult =
  | { ok: true; lines: ReservationLine[]; plannedCost: number }
  | PlanError;

/** Planiranje serije rezerviše sirovine iz RASPOLOŽIVOG stanja. */
export function planReservation(
  recipe: ReadonlyArray<RecipeMaterialLine>,
  plannedQuantity: number,
): PlanReservationResult {
  if (!Number.isInteger(plannedQuantity) || plannedQuantity <= 0) {
    return { ok: false, error: "Broj komada mora biti ceo broj veći od nule" };
  }
  if (recipe.length === 0) {
    return { ok: false, error: "Proizvod nema recepturu" };
  }

  const requirements = previewBatchRequirements(recipe, plannedQuantity);
  const insufficient = requirements.find((line) => !line.sufficient);
  if (insufficient) {
    return {
      ok: false,
      error: `Nedovoljno raspoloživo: ${insufficient.materialName} (potrebno ${insufficient.quantity}, raspoloživo ${insufficient.available})`,
    };
  }

  return {
    ok: true,
    lines: requirements.map((line) => ({
      materialId: line.materialId,
      materialName: line.materialName,
      plannedQuantity: line.quantity,
      reservedQuantity: line.quantity,
    })),
    plannedCost: roundTo(
      requirements.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
      2,
    ),
  };
}

export type IssuableLine = {
  materialId: string;
  materialName: string;
  plannedQuantity: number;
  reservedQuantity: number;
  stock: number;
  avgPrice: number;
};

export type IssueLine = {
  materialId: string;
  materialName: string;
  issuedQuantity: number;
  /** rezervacija koja se oslobađa jer prelazi u stvarno izdavanje */
  releaseReservation: number;
  unitPrice: number;
};

export type PlanIssueResult =
  | { ok: true; lines: IssueLine[]; issuedCost: number }
  | PlanError;

/**
 * Izdavanje sirovina. Podrazumevano se izdaje planirana količina;
 * `overrides` dozvoljavaju ručnu korekciju naviše ili naniže.
 */
export function planIssue(
  lines: ReadonlyArray<IssuableLine>,
  overrides: ReadonlyArray<{ materialId: string; quantity: number }> = [],
): PlanIssueResult {
  if (lines.length === 0) {
    return { ok: false, error: "Serija nema stavke sirovina" };
  }

  const byId = new Map(lines.map((l) => [l.materialId, l]));
  for (const override of overrides) {
    if (!byId.has(override.materialId)) {
      return { ok: false, error: "Sirovina nije stavka ove serije" };
    }
  }
  const overrideById = new Map(
    overrides.map((o) => [o.materialId, o.quantity]),
  );

  const planned: IssueLine[] = [];
  for (const line of lines) {
    const raw = overrideById.get(line.materialId) ?? line.plannedQuantity;
    if (!Number.isFinite(raw) || raw < 0) {
      return {
        ok: false,
        error: `Izdata količina ne može biti negativna: ${line.materialName}`,
      };
    }
    const issuedQuantity = roundTo(raw, QUANTITY_DECIMALS);
    if (issuedQuantity > line.stock) {
      return {
        ok: false,
        error: `Nedovoljno na stanju: ${line.materialName} (izdaje se ${issuedQuantity}, stanje ${line.stock})`,
      };
    }
    planned.push({
      materialId: line.materialId,
      materialName: line.materialName,
      issuedQuantity,
      releaseReservation: line.reservedQuantity,
      unitPrice: line.avgPrice,
    });
  }

  if (planned.every((line) => line.issuedQuantity === 0)) {
    return { ok: false, error: "Izdajte barem jednu sirovinu" };
  }

  return {
    ok: true,
    lines: planned,
    issuedCost: roundTo(
      planned.reduce((sum, l) => sum + l.issuedQuantity * l.unitPrice, 0),
      2,
    ),
  };
}

export type CompletableLine = {
  materialId: string;
  materialName: string;
  plannedQuantity: number;
  issuedQuantity: number;
  unitPrice: number;
};

export type CompletionLine = {
  materialId: string;
  materialName: string;
  consumedQuantity: number;
  wasteQuantity: number;
  returnedQuantity: number;
  /** utrošeno − planirano; pozitivno = potrošeno više od recepture */
  deviation: number;
  unitPrice: number;
  lineCost: number;
};

export type PlanCompletionResult =
  | {
      ok: true;
      lines: CompletionLine[];
      batchCost: number;
      actualUnitCost: number | null;
      status: Extract<BatchStatus, "ZAVRSENA" | "DELIMICNO_USPESNA">;
      warnings: string[];
    }
  | PlanError;

/**
 * Završetak serije: stvarna potrošnja, otpad, povraćaj i trošak.
 * Otpad ULAZI u trošak serije (resurs je stvarno potrošen); povraćaj ne.
 */
export function planCompletion(
  lines: ReadonlyArray<CompletableLine>,
  report: ReadonlyArray<{
    materialId: string;
    consumedQuantity: number;
    wasteQuantity: number;
  }>,
  producedQuantity: number,
  scrapQuantity: number,
  plannedQuantity: number,
): PlanCompletionResult {
  if (!Number.isInteger(producedQuantity) || producedQuantity < 0) {
    return {
      ok: false,
      error: "Broj ispravnih komada mora biti ceo broj, ne manji od nule",
    };
  }
  if (!Number.isInteger(scrapQuantity) || scrapQuantity < 0) {
    return { ok: false, error: "Škart mora biti ceo broj, ne manji od nule" };
  }
  if (producedQuantity === 0 && scrapQuantity === 0) {
    return { ok: false, error: "Evidentirajte proizvedene komade ili škart" };
  }
  if (lines.length === 0) {
    return { ok: false, error: "Serija nema stavke sirovina" };
  }

  const byId = new Map(lines.map((l) => [l.materialId, l]));
  for (const row of report) {
    if (!byId.has(row.materialId)) {
      return { ok: false, error: "Sirovina nije stavka ove serije" };
    }
  }
  const reportById = new Map(report.map((r) => [r.materialId, r]));

  const planned: CompletionLine[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const row = reportById.get(line.materialId);
    const consumedQuantity = roundTo(
      row ? row.consumedQuantity : line.issuedQuantity,
      QUANTITY_DECIMALS,
    );
    const wasteQuantity = roundTo(
      row ? row.wasteQuantity : 0,
      QUANTITY_DECIMALS,
    );

    if (consumedQuantity < 0 || wasteQuantity < 0) {
      return {
        ok: false,
        error: `Količine ne mogu biti negativne: ${line.materialName}`,
      };
    }
    if (consumedQuantity + wasteQuantity > line.issuedQuantity) {
      return {
        ok: false,
        error: `Utrošeno i otpad prelaze izdatu količinu: ${line.materialName}`,
      };
    }

    if (!(plannedQuantity > 0)) {
      return {
        ok: false,
        error: "Planirana količina serije mora biti veća od nule",
      };
    }
    const expected = roundTo(
      line.plannedQuantity * (producedQuantity / plannedQuantity),
      QUANTITY_DECIMALS,
    );
    if (consumedQuantity < expected) {
      return {
        ok: false,
        error: `Utrošak ispod recepta za proizvedenu količinu: ${line.materialName} (min. ${expected})`,
      };
    }

    const returnedQuantity = roundTo(
      line.issuedQuantity - consumedQuantity - wasteQuantity,
      QUANTITY_DECIMALS,
    );
    const deviation = roundTo(
      consumedQuantity - line.plannedQuantity,
      QUANTITY_DECIMALS,
    );

    planned.push({
      materialId: line.materialId,
      materialName: line.materialName,
      consumedQuantity,
      wasteQuantity,
      returnedQuantity,
      deviation,
      unitPrice: line.unitPrice,
      lineCost: roundTo((consumedQuantity + wasteQuantity) * line.unitPrice, 2),
    });

    if (wasteQuantity > 0) {
      warnings.push(`Otpad: ${line.materialName} (${wasteQuantity})`);
    }
  }

  if (producedQuantity + scrapQuantity > plannedQuantity) {
    warnings.push(
      `Proizvedeno i škart (${producedQuantity + scrapQuantity}) prelaze planiranu količinu (${plannedQuantity})`,
    );
  }

  const batchCost = roundTo(
    planned.reduce((sum, l) => sum + l.lineCost, 0),
    2,
  );

  return {
    ok: true,
    lines: planned,
    batchCost,
    actualUnitCost:
      producedQuantity > 0 ? roundTo(batchCost / producedQuantity, 4) : null,
    status: deriveCompletionStatus(
      plannedQuantity,
      producedQuantity,
      scrapQuantity,
    ),
    warnings,
  };
}

export type CancellableLine = {
  materialId: string;
  materialName: string;
  reservedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  unitPrice: number;
};

export type CancellationLine = {
  materialId: string;
  materialName: string;
  /** rezervacija koja se oslobađa (stanje se ne menja) */
  releaseReservation: number;
  /** neutrošeno izdato koje se vraća na zalihe */
  returnToStock: number;
  /** već utrošeno — ostaje kao trošak, ne vraća se */
  writtenOff: number;
};

export type PlanCancellationResult =
  | { ok: true; lines: CancellationLine[]; writtenOffCost: number }
  | PlanError;

/** Otkazivanje: oslobađa rezervacije i vraća neutrošeno izdato. */
export function planCancellation(
  status: BatchStatus,
  lines: ReadonlyArray<CancellableLine>,
): PlanCancellationResult {
  if (status !== "PLANIRANA" && status !== "ZAPOCETA" && status !== "U_TOKU") {
    return { ok: false, error: "Serija je već u završnom statusu" };
  }

  const planned = lines.map((line) => {
    const returnToStock =
      status === "PLANIRANA"
        ? 0
        : roundTo(
            Math.max(line.issuedQuantity - line.consumedQuantity, 0),
            QUANTITY_DECIMALS,
          );
    return {
      materialId: line.materialId,
      materialName: line.materialName,
      releaseReservation: line.reservedQuantity,
      returnToStock,
      writtenOff: status === "PLANIRANA" ? 0 : line.consumedQuantity,
    };
  });

  const writtenOffCost = roundTo(
    lines.reduce(
      (sum, line) =>
        sum +
        (status === "PLANIRANA" ? 0 : line.consumedQuantity * line.unitPrice),
      0,
    ),
    2,
  );

  return { ok: true, lines: planned, writtenOffCost };
}
