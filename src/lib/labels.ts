import {
  BatchStatus,
  MaterialType,
  OrderStatus,
  ProductMovementType,
  StockMovementType,
  Unit,
} from "@prisma/client";

export function materialTypeLabel(type: MaterialType): string {
  switch (type) {
    case "VOSAK":
      return "Vosak";
    case "FITILJ":
      return "Fitilj";
    case "MIRIS":
      return "Miris";
    case "TEGLICA":
      return "Teglica";
    case "OSTALO":
      return "Ostalo";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function unitLabel(unit: Unit): string {
  switch (unit) {
    case "G":
      return "g";
    case "ML":
      return "ml";
    case "KOM":
      return "kom";
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/**
 * Cene se ČUVAJU po osnovnoj jedinici (RSD/g, RSD/ml, RSD/kom) — tako ih
 * koriste recepture, serije i COGS. Korisniku se PRIKAZUJU i od njega UNOSE
 * po praktičnoj jedinici: kg za grame, l za mililitre, kom ostaje kom.
 * Na formi nabavke ista konverzija važi i za količinu (toDisplayQuantity /
 * fromDisplayQuantity); ostali ekrani i dalje rade u g / ml / kom.
 */
export function priceUnitFactor(unit: Unit): number {
  switch (unit) {
    case "G":
    case "ML":
      return 1000;
    case "KOM":
      return 1;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

export function priceUnitLabel(unit: Unit): string {
  switch (unit) {
    case "G":
      return "RSD/kg";
    case "ML":
      return "RSD/l";
    case "KOM":
      return "RSD/kom";
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Sačuvana cena (po g/ml/kom) → cena za prikaz (po kg/l/kom). */
export function toDisplayPrice(storedPrice: number, unit: Unit): number {
  return storedPrice * priceUnitFactor(unit);
}

/** Uneta cena (po kg/l/kom) → cena za čuvanje (po g/ml/kom). */
export function fromDisplayPrice(displayPrice: number, unit: Unit): number {
  return displayPrice / priceUnitFactor(unit);
}

export function quantityUnitLabel(unit: Unit): string {
  switch (unit) {
    case "G":
      return "kg";
    case "ML":
      return "l";
    case "KOM":
      return "kom";
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Sačuvana količina (g/ml/kom) → količina za prikaz (kg/l/kom). */
export function toDisplayQuantity(storedQty: number, unit: Unit): number {
  return storedQty / priceUnitFactor(unit);
}

/** Uneta količina (kg/l/kom) → količina za čuvanje (g/ml/kom). */
export function fromDisplayQuantity(displayQty: number, unit: Unit): number {
  return displayQty * priceUnitFactor(unit);
}

/** Formatiran prikaz jedinične cene, npr. "97,50 RSD/kg". */
export function formatUnitPrice(storedPrice: number, unit: Unit): string {
  const amount = toDisplayPrice(storedPrice, unit);
  return `${formatRsd(amount).replace(/ RSD$/, "")} ${priceUnitLabel(unit)}`;
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "NOVA":
      return "Nova";
    case "U_PRIPREMI":
      return "U pripremi";
    case "POSLATA":
      return "Poslata";
    case "ZAVRSENA":
      return "Završena";
    case "OTKAZANA":
      return "Otkazana";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function batchStatusLabel(status: BatchStatus): string {
  switch (status) {
    case "PLANIRANA":
      return "Planirana";
    case "ZAPOCETA":
      return "Započeta";
    case "U_TOKU":
      return "U toku";
    case "ZAVRSENA":
      return "Završena";
    case "DELIMICNO_USPESNA":
      return "Delimično uspešna";
    case "OTKAZANA":
      return "Otkazana";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function stockMovementTypeLabel(type: StockMovementType): string {
  switch (type) {
    case "NABAVKA":
      return "Nabavka";
    case "IZDAVANJE":
      return "Izdavanje u proizvodnju";
    case "POVRACAJ":
      return "Povraćaj na zalihe";
    case "OTPAD":
      return "Otpad";
    case "KOREKCIJA":
      return "Korekcija zaliha";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** +1 ulaz na zalihe, −1 izlaz sa zaliha. */
export function stockMovementDirection(type: StockMovementType): 1 | -1 {
  switch (type) {
    case "NABAVKA":
    case "POVRACAJ":
      return 1;
    case "IZDAVANJE":
    case "OTPAD":
      return -1;
    case "KOREKCIJA":
      return 1;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function productMovementTypeLabel(type: ProductMovementType): string {
  switch (type) {
    case "PROIZVODNJA":
      return "Iz proizvodnje";
    case "PRODAJA":
      return "Prodaja";
    case "POVRACAJ_PRODAJE":
      return "Povraćaj prodaje";
    case "KOREKCIJA":
      return "Korekcija";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function formatRsd(amount: number): string {
  const [intPart, fracPart] = amount.toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${fracPart} RSD`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("sr-RS", {
    dateStyle: "medium",
  }).format(date);
}
