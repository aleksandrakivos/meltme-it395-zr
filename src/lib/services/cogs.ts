/**
 * Cena koštanja ima dva lica:
 *  - PLANSKA  — receptura × trenutna prosečna nabavna cena (šta bi trebalo da košta)
 *  - STVARNA  — ponderisani prosek završenih serija (šta je stvarno koštalo)
 * Razlika između njih je odstupanje, koje se prikazuje u izveštajima.
 */

/** Planska cena koštanja po komadu: receptura × prosečna nabavna cena. */
export function calculatePlannedUnitCost(
  recipeItems: ReadonlyArray<{ quantity: number; avgPurchasePrice: number }>,
): number {
  if (recipeItems.length === 0) {
    return 0;
  }
  return recipeItems.reduce(
    (sum, item) => sum + item.quantity * item.avgPurchasePrice,
    0,
  );
}

/**
 * Stvarna cena koštanja po komadu: ukupan trošak završenih serija podeljen
 * ukupnim brojem ispravnih komada. Serije bez ispravnih komada nose svoj
 * trošak u brojilac — škart je stvaran trošak, ne besplatna greška.
 */
export function calculateActualUnitCost(
  batches: ReadonlyArray<{ batchCost: number; producedQuantity: number }>,
): number | null {
  if (batches.length === 0) {
    return null;
  }
  const totalProduced = batches.reduce(
    (sum, batch) => sum + batch.producedQuantity,
    0,
  );
  if (totalProduced <= 0) {
    return null;
  }
  const totalCost = batches.reduce((sum, batch) => sum + batch.batchCost, 0);
  return totalCost / totalProduced;
}

export type CostVariance = {
  /** stvarna − planska; pozitivno = skuplje od plana */
  absolute: number;
  percent: number;
};

export function calculateCostVariance(
  planned: number,
  actual: number | null,
): CostVariance | null {
  if (actual === null) {
    return null;
  }
  const absolute = actual - planned;
  return {
    absolute,
    percent: planned === 0 ? 0 : (absolute / planned) * 100,
  };
}

export type MarginResult = {
  margin: number;
  marginPercent: number;
};

/** Apsolutna i procentualna marža iz prodajne cene i cene koštanja. */
export function calculateMargin(
  sellingPrice: number,
  unitCost: number,
): MarginResult {
  const margin = sellingPrice - unitCost;
  const marginPercent = sellingPrice === 0 ? 0 : (margin / sellingPrice) * 100;
  return { margin, marginPercent };
}
