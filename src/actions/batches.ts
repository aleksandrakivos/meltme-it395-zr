"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  BatchStatus,
  ProductMovementType,
  Role,
  StockMovementType,
} from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import {
  actionErrorMessage,
  type ActionResult,
  type ActionResultWith,
} from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import {
  canCancelBatch,
  canCompleteBatch,
  canTransitionBatch,
} from "@/lib/services/batch-lifecycle";
import {
  planCancellation,
  planCompletion,
  planIssue,
  planReservation,
} from "@/lib/services/batch-service";
import {
  issueMaterial,
  releaseMaterialReservation,
  increaseProductStock,
  reserveMaterial,
  returnMaterialToStock,
} from "@/lib/reserve";
import {
  batchIdSchema,
  cancelBatchSchema,
  completeBatchSchema,
  planBatchSchema,
  startBatchSchema,
} from "@/lib/validation/batch";

const PRODUCTION_ROLES = [Role.ADMIN, Role.MENADZER_PROIZVODNJE] as const;

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

function revalidateBatch(batchId?: string) {
  revalidatePath("/batches");
  if (batchId) {
    revalidatePath(`/batches/${batchId}`);
  }
  revalidatePath("/materials");
  revalidatePath("/movements");
  revalidatePath("/products");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

function invalidTransition(from: BatchStatus, to: BatchStatus): string {
  return `Nedozvoljen prelaz statusa: ${from} → ${to}`;
}

/**
 * Planiranje serije. Rezerviše sirovine iz raspoloživog stanja;
 * STANJE SE NE MENJA.
 */
export async function planProductionBatch(
  input: unknown,
): Promise<ActionResultWith<{ batchId: string }>> {
  try {
    const actor = await requireRole(PRODUCTION_ROLES);
    const parsed = planBatchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      include: { recipeItems: { include: { material: true } } },
    });
    if (!product) {
      return { ok: false, error: "Proizvod nije pronađen" };
    }

    const plan = planReservation(
      product.recipeItems.map((item) => ({
        materialId: item.materialId,
        materialName: item.material.name,
        quantityPerUnit: item.quantity.toNumber(),
        stock: item.material.stock.toNumber(),
        reserved: item.material.reserved.toNumber(),
        avgPurchasePrice: item.material.avgPurchasePrice.toNumber(),
      })),
      parsed.data.plannedQuantity,
    );
    if (!plan.ok) {
      return { ok: false, error: plan.error };
    }

    const batchId = await prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        const reserved = await reserveMaterial(
          tx,
          line.materialId,
          line.reservedQuantity,
        );
        if (!reserved) {
          const current = await tx.material.findUnique({
            where: { id: line.materialId },
            select: { name: true, stock: true, reserved: true },
          });
          const available = current
            ? current.stock.toNumber() - current.reserved.toNumber()
            : 0;
          throw new Error(
            `Nedovoljno raspoloživo: ${current?.name ?? line.materialName} (potrebno ${line.reservedQuantity}, raspoloživo ${available})`,
          );
        }
      }

      const batch = await tx.productionBatch.create({
        data: {
          productId: product.id,
          status: BatchStatus.PLANIRANA,
          plannedQuantity: parsed.data.plannedQuantity,
          note: emptyToNull(parsed.data.note),
          createdBy: actor.id,
          lines: {
            create: plan.lines.map((line) => ({
              materialId: line.materialId,
              plannedQuantity: line.plannedQuantity,
              reservedQuantity: line.reservedQuantity,
            })),
          },
        },
      });

      return batch.id;
    });

    revalidateBatch(batchId);
    return { ok: true, data: { batchId } };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/** Izdavanje sirovina i početak rada. */
export async function startProductionBatch(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(PRODUCTION_ROLES);
    const parsed = startBatchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: parsed.data.batchId },
      include: { lines: { include: { material: true } } },
    });
    if (!batch) {
      return { ok: false, error: "Serija nije pronađena" };
    }
    if (!canTransitionBatch(batch.status, BatchStatus.ZAPOCETA)) {
      return {
        ok: false,
        error: invalidTransition(batch.status, BatchStatus.ZAPOCETA),
      };
    }

    const plan = planIssue(
      batch.lines.map((line) => ({
        materialId: line.materialId,
        materialName: line.material.name,
        plannedQuantity: line.plannedQuantity.toNumber(),
        reservedQuantity: line.reservedQuantity.toNumber(),
        stock: line.material.stock.toNumber(),
        avgPrice: line.material.avgPurchasePrice.toNumber(),
      })),
      parsed.data.lines.map((line) => ({
        materialId: line.materialId,
        quantity: line.issuedQuantity,
      })),
    );
    if (!plan.ok) {
      return { ok: false, error: plan.error };
    }

    await prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        const issued = await issueMaterial(
          tx,
          line.materialId,
          line.issuedQuantity,
          line.releaseReservation,
        );
        if (!issued) {
          throw new Error(`Nedovoljno na stanju: ${line.materialName}`);
        }

        await tx.batchMaterialLine.update({
          where: {
            batchId_materialId: {
              batchId: batch.id,
              materialId: line.materialId,
            },
          },
          data: {
            issuedQuantity: line.issuedQuantity,
            reservedQuantity: 0,
            unitPrice: line.unitPrice,
          },
        });

        if (line.issuedQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              materialId: line.materialId,
              type: StockMovementType.IZDAVANJE,
              quantity: line.issuedQuantity,
              unitPrice: line.unitPrice,
              batchId: batch.id,
              note: "Izdavanje pri započinjanju serije",
              createdBy: actor.id,
            },
          });
        }
      }

      await tx.productionBatch.update({
        where: { id: batch.id },
        data: {
          status: BatchStatus.ZAPOCETA,
          startedAt: new Date(),
          startedBy: actor.id,
        },
      });
    });

    revalidateBatch(batch.id);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/** Serija je u radu. Menja samo status. */
export async function markBatchInProgress(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireRole(PRODUCTION_ROLES);
    const parsed = batchIdSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Neispravni podaci" };
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: parsed.data.batchId },
      select: { id: true, status: true },
    });
    if (!batch) {
      return { ok: false, error: "Serija nije pronađena" };
    }
    if (!canTransitionBatch(batch.status, BatchStatus.U_TOKU)) {
      return {
        ok: false,
        error: invalidTransition(batch.status, BatchStatus.U_TOKU),
      };
    }

    await prisma.productionBatch.update({
      where: { id: batch.id },
      data: { status: BatchStatus.U_TOKU },
    });

    revalidateBatch(batch.id);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/**
 * Završetak. Tek ovde raste stanje gotovih proizvoda, i to samo za
 * ispravne komade; neutrošeno se vraća, otpad se otpisuje u trošak serije.
 */
export async function completeProductionBatch(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(PRODUCTION_ROLES);
    const parsed = completeBatchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: parsed.data.batchId },
      include: { lines: { include: { material: true } } },
    });
    if (!batch) {
      return { ok: false, error: "Serija nije pronađena" };
    }
    if (!canCompleteBatch(batch.status)) {
      return {
        ok: false,
        error: "Serija se može završiti samo iz statusa Započeta ili U toku",
      };
    }

    const plan = planCompletion(
      batch.lines.map((line) => ({
        materialId: line.materialId,
        materialName: line.material.name,
        plannedQuantity: line.plannedQuantity.toNumber(),
        issuedQuantity: line.issuedQuantity.toNumber(),
        unitPrice: line.unitPrice.toNumber(),
      })),
      parsed.data.lines,
      parsed.data.producedQuantity,
      parsed.data.scrapQuantity,
      batch.plannedQuantity,
    );
    if (!plan.ok) {
      return { ok: false, error: plan.error };
    }
    if (!canTransitionBatch(batch.status, plan.status)) {
      return { ok: false, error: invalidTransition(batch.status, plan.status) };
    }

    await prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        await tx.batchMaterialLine.update({
          where: {
            batchId_materialId: {
              batchId: batch.id,
              materialId: line.materialId,
            },
          },
          data: {
            consumedQuantity: line.consumedQuantity,
            wasteQuantity: line.wasteQuantity,
            returnedQuantity: line.returnedQuantity,
          },
        });

        if (line.returnedQuantity > 0) {
          const returned = await returnMaterialToStock(
            tx,
            line.materialId,
            line.returnedQuantity,
          );
          if (!returned) {
            throw new Error(`Povraćaj nije uspeo: ${line.materialName}`);
          }
          await tx.stockMovement.create({
            data: {
              materialId: line.materialId,
              type: StockMovementType.POVRACAJ,
              quantity: line.returnedQuantity,
              unitPrice: line.unitPrice,
              batchId: batch.id,
              note: "Povraćaj neutrošene sirovine",
              createdBy: actor.id,
            },
          });
        }

        if (line.wasteQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              materialId: line.materialId,
              type: StockMovementType.OTPAD,
              quantity: line.wasteQuantity,
              unitPrice: line.unitPrice,
              batchId: batch.id,
              note: "Otpad u proizvodnji",
              createdBy: actor.id,
            },
          });
        }
      }

      if (parsed.data.producedQuantity > 0) {
        await increaseProductStock(
          tx,
          batch.productId,
          parsed.data.producedQuantity,
        );
        await tx.productStockMovement.create({
          data: {
            productId: batch.productId,
            type: ProductMovementType.PROIZVODNJA,
            quantity: parsed.data.producedQuantity,
            unitCost: plan.actualUnitCost,
            batchId: batch.id,
            note: emptyToNull(parsed.data.note),
            createdBy: actor.id,
          },
        });
      }

      await tx.productionBatch.update({
        where: { id: batch.id },
        data: {
          status: plan.status,
          producedQuantity: parsed.data.producedQuantity,
          scrapQuantity: parsed.data.scrapQuantity,
          note: emptyToNull(parsed.data.note) ?? batch.note,
          completedAt: new Date(),
          completedBy: actor.id,
        },
      });
    });

    revalidateBatch(batch.id);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

/** Otkazivanje: PLANIRANA ili ZAPOCETA (U_TOKU se mora završiti). */
export async function cancelProductionBatch(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(PRODUCTION_ROLES);
    const parsed = cancelBatchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: parsed.data.batchId },
      include: { lines: { include: { material: true } } },
    });
    if (!batch) {
      return { ok: false, error: "Serija nije pronađena" };
    }
    if (!canCancelBatch(batch.status)) {
      return {
        ok: false,
        error:
          batch.status === BatchStatus.U_TOKU
            ? "Serija u toku se ne može otkazati — završite seriju i evidentirajte stanje"
            : invalidTransition(batch.status, BatchStatus.OTKAZANA),
      };
    }
    if (!canTransitionBatch(batch.status, BatchStatus.OTKAZANA)) {
      return {
        ok: false,
        error: invalidTransition(batch.status, BatchStatus.OTKAZANA),
      };
    }

    const report =
      batch.status === BatchStatus.ZAPOCETA ? (parsed.data.lines ?? []) : [];

    if (batch.status === BatchStatus.ZAPOCETA && report.length === 0) {
      return {
        ok: false,
        error: "Unesite utrošak i otpad po sirovini pre otkazivanja",
      };
    }

    const plan = planCancellation(
      batch.status,
      batch.lines.map((line) => ({
        materialId: line.materialId,
        materialName: line.material.name,
        reservedQuantity: line.reservedQuantity.toNumber(),
        issuedQuantity: line.issuedQuantity.toNumber(),
        unitPrice: line.unitPrice.toNumber(),
      })),
      report,
    );
    if (!plan.ok) {
      return { ok: false, error: plan.error };
    }

    await prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        if (line.releaseReservation > 0) {
          const released = await releaseMaterialReservation(
            tx,
            line.materialId,
            line.releaseReservation,
          );
          if (!released) {
            throw new Error(
              `Oslobađanje rezervacije nije uspelo: ${line.materialName}`,
            );
          }
          await tx.batchMaterialLine.update({
            where: {
              batchId_materialId: {
                batchId: batch.id,
                materialId: line.materialId,
              },
            },
            data: { reservedQuantity: 0 },
          });
        }

        if (batch.status === BatchStatus.ZAPOCETA) {
          await tx.batchMaterialLine.update({
            where: {
              batchId_materialId: {
                batchId: batch.id,
                materialId: line.materialId,
              },
            },
            data: {
              consumedQuantity: line.consumedQuantity,
              wasteQuantity: line.wasteQuantity,
              returnedQuantity: line.returnToStock,
              reservedQuantity: 0,
            },
          });

          if (line.returnToStock > 0) {
            const returned = await returnMaterialToStock(
              tx,
              line.materialId,
              line.returnToStock,
            );
            if (!returned) {
              throw new Error(`Povraćaj nije uspeo: ${line.materialName}`);
            }
            await tx.stockMovement.create({
              data: {
                materialId: line.materialId,
                type: StockMovementType.POVRACAJ,
                quantity: line.returnToStock,
                unitPrice: line.unitPrice,
                batchId: batch.id,
                note: "Povraćaj pri otkazivanju serije",
                createdBy: actor.id,
              },
            });
          }

          if (line.wasteQuantity > 0) {
            await tx.stockMovement.create({
              data: {
                materialId: line.materialId,
                type: StockMovementType.OTPAD,
                quantity: line.wasteQuantity,
                unitPrice: line.unitPrice,
                batchId: batch.id,
                note: "Otpad pri otkazivanju serije",
                createdBy: actor.id,
              },
            });
          }
        }
      }

      await tx.productionBatch.update({
        where: { id: batch.id },
        data: {
          status: BatchStatus.OTKAZANA,
          cancelReason: parsed.data.reason,
          completedAt: new Date(),
          completedBy: actor.id,
        },
      });
    });

    revalidateBatch(batch.id);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}
