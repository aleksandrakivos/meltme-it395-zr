"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { OrderStatus, ProductMovementType, Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import {
  actionErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { planOrderReservation } from "@/lib/services/order-service";
import {
  canTransition,
  transitionReleasesReservation,
  transitionShipsStock,
} from "@/lib/services/order-status";
import { releaseProductReservation, reserveProduct, shipProduct } from "@/lib/reserve";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "@/lib/validation/order";

function toError(error: unknown): string {
  if (error instanceof AuthzError) {
    return error.message;
  }
  return actionErrorMessage(error);
}

export async function createOrder(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parsed.data.customerId },
    });
    if (!customer) {
      return { ok: false, error: "Kupac nije pronađen" };
    }

    const productIds = parsed.data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const plan = planOrderReservation(
      parsed.data.items,
      products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        reserved: p.reserved,
        sellingPrice: p.sellingPrice.toNumber(),
        active: p.active,
      })),
    );
    if (!plan.ok) {
      return { ok: false, error: plan.error };
    }

    await prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        const reserved = await reserveProduct(tx, line.productId, line.quantity);
        if (!reserved) {
          const current = await tx.product.findUnique({
            where: { id: line.productId },
            select: { name: true, stock: true, reserved: true },
          });
          const available = current ? current.stock - current.reserved : 0;
          throw new Error(
            `Nedovoljno raspoloživo: ${current?.name ?? line.productName} (traženo ${line.quantity}, raspoloživo ${available})`,
          );
        }
      }

      await tx.order.create({
        data: {
          customerId: parsed.data.customerId,
          createdBy: actor.id,
          status: OrderStatus.NOVA,
          items: {
            create: plan.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              price: line.unitPrice,
            })),
          },
        },
      });
    });

    revalidatePath("/orders");
    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function updateOrderStatus(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
    const parsed = updateOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { items: true },
    });
    if (!order) {
      return { ok: false, error: "Porudžbina nije pronađena" };
    }

    const nextStatus = parsed.data.status as OrderStatus;
    if (!canTransition(order.status, nextStatus)) {
      return {
        ok: false,
        error: `Nedozvoljen prelaz statusa: ${order.status} → ${nextStatus}`,
      };
    }

    await prisma.$transaction(async (tx) => {
      if (transitionShipsStock(order.status, nextStatus)) {
        for (const item of order.items) {
          const shipped = await shipProduct(tx, item.productId, item.quantity);
          if (!shipped) {
            const current = await tx.product.findUnique({
              where: { id: item.productId },
              select: { name: true },
            });
            throw new Error(
              `Otpis nije uspeo: ${current?.name ?? item.productId}`,
            );
          }
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              type: ProductMovementType.PRODAJA,
              quantity: item.quantity,
              orderId: order.id,
              note: "Slanje porudžbine",
              createdBy: actor.id,
            },
          });
        }
      }

      if (transitionReleasesReservation(order.status, nextStatus)) {
        for (const item of order.items) {
          await releaseProductReservation(tx, item.productId, item.quantity);
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${order.id}`);
    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
