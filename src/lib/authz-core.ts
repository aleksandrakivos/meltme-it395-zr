import type { Role } from "@prisma/client";

export class AuthzError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "INACTIVE";

  constructor(code: AuthzError["code"], message: string) {
    super(message);
    this.name = "AuthzError";
    this.code = code;
  }
}

export function assertRole(userRole: Role, allowed: readonly Role[]): void {
  if (!allowed.includes(userRole)) {
    throw new AuthzError("FORBIDDEN", "Nemate dozvolu za ovu akciju");
  }
}
