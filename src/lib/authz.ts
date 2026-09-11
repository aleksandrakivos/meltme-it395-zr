import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { AuthzError, assertRole } from "@/lib/authz-core";
import { prisma } from "@/lib/prisma";

export { AuthzError, assertRole } from "@/lib/authz-core";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    throw new AuthzError("UNAUTHENTICATED", "Morate biti prijavljeni");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    throw new AuthzError("INACTIVE", "Nalog je deaktiviran");
  }

  return user;
}

export async function requireRole(
  roles: readonly Role[],
): Promise<SessionUser> {
  const user = await requireUser();
  assertRole(user.role, roles);
  return user;
}
