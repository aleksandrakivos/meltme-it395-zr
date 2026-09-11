import { Prisma } from "@prisma/client";

export type TxClient = Prisma.TransactionClient;

function dec(value: number): Prisma.Sql {
  return Prisma.sql`${value.toFixed(3)}::numeric`;
}

/** reserved += quantity, samo ako ima dovoljno raspoloživog (stock − reserved). */
export async function reserveMaterial(
  tx: TxClient,
  materialId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "materials"
    SET "reserved" = "reserved" + ${dec(quantity)}
    WHERE "id" = ${materialId}
      AND "stock" - "reserved" >= ${dec(quantity)}
  `;
  return affected === 1;
}

/** reserved -= quantity (oslobađanje rezervacije; stanje se ne dira). */
export async function releaseMaterialReservation(
  tx: TxClient,
  materialId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "materials"
    SET "reserved" = "reserved" - ${dec(quantity)}
    WHERE "id" = ${materialId}
      AND "reserved" >= ${dec(quantity)}
  `;
  return affected === 1;
}

/**
 * Izdavanje u proizvodnju: stanje se umanjuje, a rezervacija oslobađa u istom
 * potezu (rezervisana količina prelazi u stvarno izdatu).
 */
export async function issueMaterial(
  tx: TxClient,
  materialId: string,
  issuedQuantity: number,
  releaseReservation: number,
): Promise<boolean> {
  if (issuedQuantity <= 0 && releaseReservation <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "materials"
    SET "stock" = "stock" - ${dec(issuedQuantity)},
        "reserved" = "reserved" - ${dec(releaseReservation)}
    WHERE "id" = ${materialId}
      AND "stock" - ${dec(issuedQuantity)} >= "reserved" - ${dec(releaseReservation)}
      AND "stock" >= ${dec(issuedQuantity)}
      AND "reserved" >= ${dec(releaseReservation)}
  `;
  return affected === 1;
}

/** Povraćaj neutrošene sirovine na zalihe. */
export async function returnMaterialToStock(
  tx: TxClient,
  materialId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "materials"
    SET "stock" = "stock" + ${dec(quantity)}
    WHERE "id" = ${materialId}
  `;
  return affected === 1;
}

/** reserved += quantity za gotov proizvod, uz proveru raspoloživog. */
export async function reserveProduct(
  tx: TxClient,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "products"
    SET "reserved" = "reserved" + ${quantity}
    WHERE "id" = ${productId}
      AND "active" = true
      AND "stock" - "reserved" >= ${quantity}
  `;
  return affected === 1;
}

/** Oslobađanje rezervacije proizvoda (otkazivanje porudžbine). */
export async function releaseProductReservation(
  tx: TxClient,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "products"
    SET "reserved" = "reserved" - ${quantity}
    WHERE "id" = ${productId}
      AND "reserved" >= ${quantity}
  `;
  return affected === 1;
}

/** Slanje porudžbine: rezervisana količina se umanjuje sa stanja. */
export async function shipProduct(
  tx: TxClient,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "products"
    SET "stock" = "stock" - ${quantity},
        "reserved" = "reserved" - ${quantity}
    WHERE "id" = ${productId}
      AND "stock" >= ${quantity}
      AND "reserved" >= ${quantity}
  `;
  return affected === 1;
}

/** Ulaz gotovih proizvoda iz proizvodnje ili povraćaj prodaje. */
export async function increaseProductStock(
  tx: TxClient,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const affected = await tx.$executeRaw`
    UPDATE "products"
    SET "stock" = "stock" + ${quantity}
    WHERE "id" = ${productId}
  `;
  return affected === 1;
}
