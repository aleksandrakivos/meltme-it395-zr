/**
 * Porudžbine rade sa rezervacijama, ne sa neposrednim otpisom:
 * NOVA/U_PRIPREMI rezerviše, POSLATA otpisuje, OTKAZANA oslobađa.
 */
export type OrderItemRequest = {
  productId: string;
  quantity: number;
};

export type ProductForOrder = {
  id: string;
  name: string;
  stock: number;
  reserved: number;
  sellingPrice: number;
  active: boolean;
};

export type PlannedOrderLine = {
  productId: string;
  productName: string;
  quantity: number;
  /** stock − reserved u trenutku planiranja */
  available: number;
  unitPrice: number;
};

export type PlanOrderResult =
  | { ok: true; lines: PlannedOrderLine[] }
  | { ok: false; error: string };

/**
 * Kreiranje porudžbine REZERVIŠE proizvode iz raspoloživog stanja.
 * Stanje ostaje netaknuto sve do slanja.
 */
export function planOrderReservation(
  items: ReadonlyArray<OrderItemRequest>,
  catalog: ReadonlyArray<ProductForOrder>,
): PlanOrderResult {
  if (items.length === 0) {
    return { ok: false, error: "Dodajte barem jednu stavku" };
  }

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: PlannedOrderLine[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      return { ok: false, error: "Proizvod nije pronađen" };
    }
    if (!product.active) {
      return { ok: false, error: `Proizvod nije aktivan: ${product.name}` };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, error: "Količina mora biti ceo broj veći od nule" };
    }

    const available = product.stock - product.reserved;
    if (available < item.quantity) {
      return {
        ok: false,
        error: `Nedovoljno raspoloživo: ${product.name} (traženo ${item.quantity}, raspoloživo ${available})`,
      };
    }

    lines.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      available,
      unitPrice: product.sellingPrice,
    });
  }

  return { ok: true, lines };
}

/**
 * Simulira redom rezervacije, da bi se uhvatio slučaj u kojem druga stavka
 * pada tek pošto je prva već zauzela raspoloživo stanje.
 */
export function simulateOrderReservation(
  items: ReadonlyArray<OrderItemRequest>,
  catalog: ReadonlyArray<ProductForOrder>,
): PlanOrderResult {
  const availability = new Map(
    catalog.map((p) => [p.id, p.stock - p.reserved]),
  );
  const planned = planOrderReservation(items, catalog);
  if (!planned.ok) {
    return planned;
  }

  for (const line of planned.lines) {
    const current = availability.get(line.productId) ?? 0;
    if (current < line.quantity) {
      return {
        ok: false,
        error: `Nedovoljno raspoloživo: ${line.productName} (traženo ${line.quantity}, raspoloživo ${current})`,
      };
    }
    availability.set(line.productId, current - line.quantity);
  }

  return planned;
}

export type StockChangeLine = {
  productId: string;
  quantity: number;
};

/** Slanje: rezervisana količina se otpisuje sa stanja (stock i reserved padaju). */
export function planOrderShipment(
  items: ReadonlyArray<StockChangeLine>,
): StockChangeLine[] {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
}

/** Otkazivanje pre slanja: rezervacija se oslobađa, stanje se ne dira. */
export function planOrderRelease(
  items: ReadonlyArray<StockChangeLine>,
): StockChangeLine[] {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
}
