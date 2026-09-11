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
  productCreateSchema,
  productSetActiveSchema,
  productUpdateSchema,
} from "@/lib/validation/product";

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

export async function createProduct(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN]);
    const parsed = productCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    await prisma.product.create({
      data: {
        name: parsed.data.name,
        waxType: parsed.data.waxType,
        scent: emptyToNull(parsed.data.scent),
        size: parsed.data.size,
        sellingPrice: parsed.data.sellingPrice,
        stock: parsed.data.stock,
        active: true,
      },
    });

    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function updateProduct(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN]);
    const parsed = productUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const existing = await prisma.product.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Proizvod nije pronađen" };
    }

    await prisma.product.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        waxType: parsed.data.waxType,
        scent: emptyToNull(parsed.data.scent),
        size: parsed.data.size,
        sellingPrice: parsed.data.sellingPrice,
      },
    });

    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function setProductActive(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN]);
    const parsed = productSetActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Neispravni podaci" };
    }

    const existing = await prisma.product.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Proizvod nije pronađen" };
    }

    await prisma.product.update({
      where: { id: parsed.data.id },
      data: { active: parsed.data.active },
    });

    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
