"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { Role } from "@prisma/client";
import {
  actionErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";
import {
  materialCreateSchema,
  materialUpdateSchema,
} from "@/lib/validation/material";

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

export async function createMaterial(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = materialCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    await prisma.material.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        unit: parsed.data.unit,
        minStock: parsed.data.minStock,
        supplierId: emptyToNull(parsed.data.supplierId),
      },
    });

    revalidatePath("/materials");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function updateMaterial(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = materialUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const existing = await prisma.material.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Sirovina nije pronađena" };
    }

    await prisma.material.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        unit: parsed.data.unit,
        minStock: parsed.data.minStock,
        supplierId: emptyToNull(parsed.data.supplierId),
      },
    });

    revalidatePath("/materials");
    revalidatePath(`/materials/${parsed.data.id}`);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recipeItems: true,
            batchLines: true,
            purchases: true,
            movements: true,
          },
        },
      },
    });
    if (!material) {
      return { ok: false, error: "Sirovina nije pronađena" };
    }
    if (
      material._count.recipeItems > 0 ||
      material._count.batchLines > 0 ||
      material._count.purchases > 0 ||
      material._count.movements > 0
    ) {
      return {
        ok: false,
        error:
          "Sirovina ima istoriju (receptura, serija, nabavka ili kretanje zaliha) i ne može se obrisati",
      };
    }

    await prisma.material.delete({ where: { id } });
    revalidatePath("/materials");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
