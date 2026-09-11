"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";
import {
  canChangeUserRole,
  canDeactivateUser,
} from "@/lib/services/user-rules";
import {
  userCreateSchema,
  userSetActiveSchema,
  userUpdateSchema,
} from "@/lib/validation/user";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toErrorMessage(error: unknown): string {
  if (error instanceof AuthzError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Došlo je do greške";
}

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    await requireRole([Role.ADMIN]);
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "Email je već u upotrebi" };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        role: parsed.data.role,
        passwordHash,
        active: true,
      },
    });

    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateUser(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN]);
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.id },
    });
    if (!target) {
      return { ok: false, error: "Korisnik nije pronađen" };
    }

    if (parsed.data.role !== target.role) {
      const roleGate = canChangeUserRole({
        actorId: actor.id,
        targetId: target.id,
      });
      if (!roleGate.ok) {
        return { ok: false, error: roleGate.reason };
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
      },
    });

    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function setUserActive(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole([Role.ADMIN]);
    const parsed = userSetActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Neispravni podaci" };
    }

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.id },
    });
    if (!target) {
      return { ok: false, error: "Korisnik nije pronađen" };
    }

    if (!parsed.data.active) {
      const activeOwnerCount = await prisma.user.count({
        where: { role: Role.ADMIN, active: true },
      });
      const decision = canDeactivateUser({
        actorId: actor.id,
        targetId: target.id,
        targetRole: target.role,
        targetActive: target.active,
        activeOwnerCount,
      });
      if (!decision.ok) {
        return { ok: false, error: decision.reason };
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { active: parsed.data.active },
    });

    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
