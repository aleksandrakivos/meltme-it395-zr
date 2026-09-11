import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { AuthzError, assertRole } from "@/lib/authz-core";

describe("assertRole / requireRole gate", () => {
  it("rejects wrong role", () => {
    expect(() => assertRole(Role.MENADZER_PRODAJE, [Role.ADMIN])).toThrow(AuthzError);
    expect(() => assertRole(Role.MENADZER_PRODAJE, [Role.ADMIN])).toThrow(
      /Nemate dozvolu/,
    );
  });

  it("allows matching role", () => {
    expect(() =>
      assertRole(Role.MENADZER_PROIZVODNJE, [Role.ADMIN, Role.MENADZER_PROIZVODNJE]),
    ).not.toThrow();
  });
});
