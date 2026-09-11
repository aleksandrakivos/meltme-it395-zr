"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { AuthzError } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation/profile";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    const parsed = profileUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Neispravni podaci",
      };
    }

    const data: { name: string; passwordHash?: string } = {
      name: parsed.data.name,
    };

    const wantsPasswordChange = Boolean(
      parsed.data.currentPassword ||
        parsed.data.newPassword ||
        parsed.data.confirmPassword,
    );

    if (wantsPasswordChange) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { passwordHash: true },
      });
      if (!user) {
        return { ok: false, error: "Korisnik nije pronađen" };
      }

      const matches = await bcrypt.compare(
        parsed.data.currentPassword ?? "",
        user.passwordHash,
      );
      if (!matches) {
        return { ok: false, error: "Trenutna lozinka nije ispravna" };
      }

      data.passwordHash = await bcrypt.hash(parsed.data.newPassword!, 10);
    }

    await prisma.user.update({
      where: { id: actor.id },
      data,
    });

    revalidatePath("/profile");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Došlo je do greške" };
  }
}
