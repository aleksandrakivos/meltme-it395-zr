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
  customerCreateSchema,
  customerUpdateSchema,
} from "@/lib/validation/customer";

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

export async function createCustomer(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
    const parsed = customerCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    await prisma.customer.create({
      data: {
        name: parsed.data.name,
        email: emptyToNull(parsed.data.email),
        phone: emptyToNull(parsed.data.phone),
        address: emptyToNull(parsed.data.address),
      },
    });

    revalidatePath("/customers");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function updateCustomer(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
    const parsed = customerUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const existing = await prisma.customer.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Kupac nije pronađen" };
    }

    await prisma.customer.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        email: emptyToNull(parsed.data.email),
        phone: emptyToNull(parsed.data.phone),
        address: emptyToNull(parsed.data.address),
      },
    });

    revalidatePath("/customers");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toError(error) };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) {
      return { ok: false, error: "Kupac nije pronađen" };
    }
    if (customer._count.orders > 0) {
      return {
        ok: false,
        error: "Ne možete obrisati kupca koji ima porudžbine",
      };
    }

    await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
