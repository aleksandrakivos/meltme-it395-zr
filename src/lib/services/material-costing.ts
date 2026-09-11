/**
 * Vrednovanje zaliha sirovina: ponderisani prosek.
 *
 * Prosek se menja SAMO pri nabavci. Izdavanje u proizvodnju, otpad i povraćaj
 * ga ne diraju — oni koriste snimak proseka iz trenutka izdavanja. Zato izmena
 * nabavne cene nikada retroaktivno ne menja već obračunate troškove serija.
 */

/** Zaokruživanje na zadati broj decimala bez akumulacije binarne greške. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Cene se čuvaju kao Decimal(12,4). */
export const PRICE_DECIMALS = 4;

/** Količine se čuvaju kao Decimal(12,3). */
export const QUANTITY_DECIMALS = 3;

/**
 * Nova prosečna nabavna cena posle nabavke:
 * (stanje × prosek + količina × cena) / (stanje + količina).
 *
 * Ako je zbir količina nula (prazno stanje, nabavka nulte vrednosti nije
 * dozvoljena), prosek postaje sama nabavna cena.
 */
export function weightedAveragePrice(
  currentStock: number,
  currentAvg: number,
  purchaseQuantity: number,
  purchaseUnitPrice: number,
): number {
  if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0) {
    throw new Error("Količina nabavke mora biti veća od nule");
  }
  if (!Number.isFinite(purchaseUnitPrice) || purchaseUnitPrice < 0) {
    throw new Error("Nabavna cena ne može biti negativna");
  }

  const stock =
    Number.isFinite(currentStock) && currentStock > 0 ? currentStock : 0;
  const avg = Number.isFinite(currentAvg) && currentAvg > 0 ? currentAvg : 0;
  const totalQuantity = stock + purchaseQuantity;

  if (totalQuantity === 0) {
    return roundTo(purchaseUnitPrice, PRICE_DECIMALS);
  }

  const totalValue = stock * avg + purchaseQuantity * purchaseUnitPrice;
  return roundTo(totalValue / totalQuantity, PRICE_DECIMALS);
}

/** Ukupna vrednost nabavke, zaokružena na 2 decimale (Decimal(12,2)). */
export function purchaseTotalCost(quantity: number, unitPrice: number): number {
  return roundTo(quantity * unitPrice, 2);
}

export type StockAdjustmentDirection = "PLUS" | "MINUS";

export type StockAdjustmentPlan = {
  newStock: number;
  newAvgPrice: number;
  movementQuantity: number;
};

/**
 * Korekcija zaliha (inventura / ispravka greške).
 * Povećanje se vrednuje kao nabavka i pomera prosek; smanjenje ne dira prosek.
 */
export function planStockAdjustment(
  currentStock: number,
  currentAvg: number,
  direction: StockAdjustmentDirection,
  quantity: number,
  unitPrice?: number,
): { ok: true; plan: StockAdjustmentPlan } | { ok: false; error: string } {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Količina mora biti veća od nule" };
  }

  if (direction === "MINUS") {
    if (quantity > currentStock) {
      return {
        ok: false,
        error: `Korekcija je veća od stanja (stanje ${currentStock})`,
      };
    }
    return {
      ok: true,
      plan: {
        newStock: roundTo(currentStock - quantity, QUANTITY_DECIMALS),
        newAvgPrice: roundTo(currentAvg, PRICE_DECIMALS),
        movementQuantity: quantity,
      },
    };
  }

  const price = unitPrice ?? currentAvg;
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Cena ne može biti negativna" };
  }

  return {
    ok: true,
    plan: {
      newStock: roundTo(currentStock + quantity, QUANTITY_DECIMALS),
      newAvgPrice: weightedAveragePrice(
        currentStock,
        currentAvg,
        quantity,
        price,
      ),
      movementQuantity: quantity,
    },
  };
}

export type CountedStockAdjustment = {
  direction: StockAdjustmentDirection;
  quantity: number;
} | null;

/**
 * Režim „Prebrojano stanje": korisnik unese koliko je stvarno izbrojao, a
 * sistem izvede smer i količinu korekcije. Vraća `null` kad nema razlike.
 */
export function countedStockAdjustment(
  currentStock: number,
  countedStock: number,
): CountedStockAdjustment {
  if (!Number.isFinite(countedStock) || countedStock < 0) {
    throw new Error("Prebrojano stanje ne može biti negativno");
  }
  const diff = countedStock - currentStock;
  // Zaokružuje se apsolutna razlika, da manjak i višak budu simetrični.
  const quantity = roundTo(Math.abs(diff), QUANTITY_DECIMALS);
  if (quantity === 0) {
    return null;
  }
  return { direction: diff > 0 ? "PLUS" : "MINUS", quantity };
}

export type PriceHistoryPoint = {
  unitPrice: number;
  /** Ponderisani prosek posle te nabavke. */
  runningAverage: number;
  runningStock: number;
};

/**
 * Rekonstruiše kretanje nabavne cene i proseka kroz niz nabavki
 * (hronološki, od najstarije). Isti obračun kao u `recordPurchase`.
 */
export function buildPriceHistory(
  purchases: ReadonlyArray<{ quantity: number; unitPrice: number }>,
): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  let stock = 0;
  let average = 0;

  for (const purchase of purchases) {
    average = weightedAveragePrice(
      stock,
      average,
      purchase.quantity,
      purchase.unitPrice,
    );
    stock = roundTo(stock + purchase.quantity, QUANTITY_DECIMALS);
    points.push({
      unitPrice: purchase.unitPrice,
      runningAverage: average,
      runningStock: stock,
    });
  }

  return points;
}
