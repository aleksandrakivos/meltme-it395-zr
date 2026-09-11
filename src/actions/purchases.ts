"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { type Prisma, Role, StockMovementType } from "@prisma/client";
import {
  actionErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";
import {
  planStockAdjustment,
  purchaseTotalCost,
  weightedAveragePrice,
} from "@/lib/services/material-costing";
import {
  purchaseCreateSchema,
  purchaseDocumentSchema,
  stockAdjustmentSchema,
  type PurchaseLineInput,
} from "@/lib/validation/purchase";

function toError(error: unknown): string {
  if (error instanceof AuthzError) {
    return error.message;
  }
  return actionErrorMessage(error);
}

function emptyToNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

function revalidateStockViews(materialId: string) {
  revalidatePath("/purchases");
  revalidatePath("/movements");
  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

type PurchaseHeader = {
  supplierId: string | null;
  purchasedAt: Date;
  documentNo: string | null;
  note: string | null;
};

/**
 * Jedna stavka nabavke unutar transakcije: zapis nabavke (append-only),
 * uvećanje stanja, novi ponderisani prosek i red u kretanju zaliha.
 * Zajedničko jezgro za pojedinačnu nabavku i dokument sa više stavki.
 */
async function recordPurchaseLine(
  tx: Prisma.TransactionClient,
  actorId: string,
  header: PurchaseHeader,
  line: PurchaseLineInput,
): Promise<void> {
  const { materialId, quantity, unitPrice } = line;

  const material = await tx.material.findUnique({
    where: { id: materialId },
    select: { id: true, stock: true, avgPurchasePrice: true },
  });
  if (!material) {
    throw new Error("Sirovina nije pronađena");
  }

  const newAvg = weightedAveragePrice(
    material.stock.toNumber(),
    material.avgPurchasePrice.toNumber(),
    quantity,
    unitPrice,
  );

  const purchase = await tx.materialPurchase.create({
    data: {
      materialId,
      supplierId: header.supplierId,
      quantity,
      unitPrice,
      totalCost: purchaseTotalCost(quantity, unitPrice),
      documentNo: header.documentNo,
      purchasedAt: header.purchasedAt,
      note: header.note,
      createdBy: actorId,
    },
  });

  await tx.material.update({
    where: { id: materialId },
    data: {
      stock: { increment: quantity },
      avgPurchasePrice: newAvg,
    },
  });

  await tx.stockMovement.create({
    data: {
      materialId,
      type: StockMovementType.NABAVKA,
      quantity,
      unitPrice,
      purchaseId: purchase.id,
      note: header.documentNo,
      createdBy: actorId,
    },
  });
}

/**
 * Nova nabavka (jedna sirovina). Zapis je append-only: ne postoje
 * `updatePurchase` ni `deletePurchase` — ispravka se evidentira kao korekcija
 * zaliha, da promena cene ne bi retroaktivno menjala već obračunate troškove serija.
 */
export async function recordPurchase(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = purchaseCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const { materialId, quantity, unitPrice } = parsed.data;
    const header: PurchaseHeader = {
      supplierId: emptyToNull(parsed.data.supplierId),
      purchasedAt: parsed.data.purchasedAt,
      documentNo: emptyToNull(parsed.data.documentNo),
      note: emptyToNull(parsed.data.note),
    };

    await prisma.$transaction((tx) =>
      recordPurchaseLine(tx, actor.id, header, {
        materialId,
        quantity,
        unitPrice,
      }),
    );

    revalidateStockViews(materialId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/**
 * Dokument nabavke sa više sirovina (jedan dobavljač, datum i broj dokumenta).
 * Sve stavke se upisuju u JEDNOJ transakciji, svaka kao zaseban zapis nabavke
 * — ista logika, isti prosek, ista istorija cena kao kod pojedinačnog unosa.
 */
export async function recordPurchaseDocument(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = purchaseDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const header: PurchaseHeader = {
      supplierId: emptyToNull(parsed.data.supplierId),
      purchasedAt: parsed.data.purchasedAt,
      documentNo: emptyToNull(parsed.data.documentNo),
      note: emptyToNull(parsed.data.note),
    };

    await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.lines) {
        await recordPurchaseLine(tx, actor.id, header, line);
      }
    });

    for (const line of parsed.data.lines) {
      revalidateStockViews(line.materialId);
    }
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/** Korekcija zaliha (inventura / ispravka greške) — jedini način da se ispravi nabavka. */
export async function adjustMaterialStock(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN]);
    const parsed = stockAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const { materialId, direction, quantity, unitPrice, note } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: materialId },
        select: {
          id: true,
          stock: true,
          reserved: true,
          avgPurchasePrice: true,
        },
      });
      if (!material) {
        throw new Error("Sirovina nije pronađena");
      }

      const plan = planStockAdjustment(
        material.stock.toNumber(),
        material.avgPurchasePrice.toNumber(),
        direction,
        quantity,
        unitPrice,
      );
      if (!plan.ok) {
        throw new Error(plan.error);
      }
      if (plan.plan.newStock < material.reserved.toNumber()) {
        throw new Error(
          `Novo stanje bi bilo ispod rezervisane količine (${material.reserved.toNumber()})`,
        );
      }

      await tx.material.update({
        where: { id: materialId },
        data: {
          stock: plan.plan.newStock,
          avgPurchasePrice: plan.plan.newAvgPrice,
        },
      });

      await tx.stockMovement.create({
        data: {
          materialId,
          type: StockMovementType.KOREKCIJA,
          quantity: plan.plan.movementQuantity,
          unitPrice: plan.plan.newAvgPrice,
          note: `${direction === "PLUS" ? "+" : "−"}${quantity} — ${note}`,
          createdBy: actor.id,
        },
      });
    });

    revalidateStockViews(materialId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}
