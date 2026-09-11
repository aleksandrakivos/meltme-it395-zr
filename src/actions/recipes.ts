"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import {
  actionErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";
import {
  recipeItemDeleteSchema,
  recipeItemUpsertSchema,
} from "@/lib/validation/recipe";

function toError(error: unknown): string {
  if (error instanceof AuthzError) {
    return error.message;
  }
  return actionErrorMessage(error);
}

export async function upsertRecipeItem(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = recipeItemUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
    });
    if (!product) {
      return { ok: false, error: "Proizvod nije pronađen" };
    }

    const material = await prisma.material.findUnique({
      where: { id: parsed.data.materialId },
    });
    if (!material) {
      return { ok: false, error: "Sirovina nije pronađena" };
    }

    await prisma.recipeItem.upsert({
      where: {
        productId_materialId: {
          productId: parsed.data.productId,
          materialId: parsed.data.materialId,
        },
      },
      update: { quantity: parsed.data.quantity },
      create: {
        productId: parsed.data.productId,
        materialId: parsed.data.materialId,
        quantity: parsed.data.quantity,
      },
    });

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${parsed.data.productId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function deleteRecipeItem(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = recipeItemDeleteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Neispravni podaci" };
    }

    const item = await prisma.recipeItem.findUnique({
      where: { id: parsed.data.id },
    });
    if (!item) {
      return { ok: false, error: "Stavka nije pronađena" };
    }

    await prisma.recipeItem.delete({ where: { id: parsed.data.id } });
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${item.productId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
