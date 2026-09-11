"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import {
  actionErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import {
  supplierCreateSchema,
  supplierUpdateSchema,
} from "@/lib/validation/supplier";

function emptyToNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

function toError(error: unknown): string {
  if (error instanceof AuthzError) {
    return error.message;
  }
  return actionErrorMessage(error);
}

export async function createSupplier(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = supplierCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    await prisma.supplier.create({
      data: {
        name: parsed.data.name,
        contact: emptyToNull(parsed.data.contact),
        phone: emptyToNull(parsed.data.phone),
        email: emptyToNull(parsed.data.email),
      },
    });

    revalidatePath("/suppliers");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function updateSupplier(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
    const parsed = supplierUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const existing = await prisma.supplier.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Dobavljač nije pronađen" };
    }

    await prisma.supplier.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        contact: emptyToNull(parsed.data.contact),
        phone: emptyToNull(parsed.data.phone),
        email: emptyToNull(parsed.data.email),
      },
    });

    revalidatePath("/suppliers");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { materials: true } } },
    });
    if (!supplier) {
      return { ok: false, error: "Dobavljač nije pronađen" };
    }
    if (supplier._count.materials > 0) {
      return {
        ok: false,
        error: "Ne možete obrisati dobavljača koji ima vezane sirovine",
      };
    }

    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/suppliers");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
