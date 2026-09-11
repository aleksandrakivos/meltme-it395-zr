import { OrderStatus } from "@prisma/client";

/**
 * Prelazi statusa i njihov efekat na zalihe:
 *   NOVA / U_PRIPREMI      → proizvodi su REZERVISANI (stock netaknut)
 *   U_PRIPREMI → POSLATA   → otpis: stock i reserved se umanjuju
 *   NOVA|U_PRIPREMI → OTKAZANA → oslobađanje rezervacije (stock netaknut)
 *   POSLATA → ZAVRSENA     → bez promene zaliha
 */

const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  NOVA: [OrderStatus.U_PRIPREMI, OrderStatus.OTKAZANA],
  U_PRIPREMI: [OrderStatus.POSLATA, OrderStatus.OTKAZANA],
  POSLATA: [OrderStatus.ZAVRSENA],
  ZAVRSENA: [],
  OTKAZANA: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED[from].includes(to);
}

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED[from];
}

/** Da li prelaz otpisuje rezervisanu robu sa stanja. */
export function transitionShipsStock(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return from === OrderStatus.U_PRIPREMI && to === OrderStatus.POSLATA;
}

/** Da li prelaz oslobađa rezervaciju bez diranja stanja. */
export function transitionReleasesReservation(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return (
    to === OrderStatus.OTKAZANA &&
    (from === OrderStatus.NOVA || from === OrderStatus.U_PRIPREMI)
  );
}
