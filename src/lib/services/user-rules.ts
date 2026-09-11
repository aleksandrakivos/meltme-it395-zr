import type { Role } from "@prisma/client";

export type DeactivateDecision = { ok: true } | { ok: false; reason: string };

/**
 * Deaktivacija naloga nije dozvoljena na trenutno aktivnom nalogu i/ili poslednjem aktivnom ADMIN-u.
 */
export function canDeactivateUser(input: {
  actorId: string;
  targetId: string;
  targetRole: Role;
  targetActive: boolean;
  activeOwnerCount: number;
}): DeactivateDecision {
  if (input.actorId === input.targetId) {
    return { ok: false, reason: "Ne možete deaktivirati sopstveni nalog" };
  }

  if (
    input.targetActive &&
    input.targetRole === "ADMIN" &&
    input.activeOwnerCount <= 1
  ) {
    return {
      ok: false,
      reason: "Ne možete deaktivirati poslednjeg aktivnog vlasnika",
    };
  }

  return { ok: true };
}

export function canChangeUserRole(input: {
  actorId: string;
  targetId: string;
}): DeactivateDecision {
  if (input.actorId === input.targetId) {
    return { ok: false, reason: "Ne možete promeniti sopstvenu ulogu" };
  }
  return { ok: true };
}
