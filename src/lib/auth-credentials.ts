import type { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type CredentialsUserRecord = AuthUser & {
  passwordHash: string;
  active: boolean;
};

export async function authorizeWithPassword(
  user: CredentialsUserRecord | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<AuthUser | null> {
  if (!user) {
    return null;
  }
  if (!user.active) {
    return null;
  }
  const matches = await compare(password, user.passwordHash);
  if (!matches) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
