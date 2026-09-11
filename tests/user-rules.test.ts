import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  canChangeUserRole,
  canDeactivateUser,
} from "@/lib/services/user-rules";

describe("canDeactivateUser — last owner rule", () => {
  it("blocks deactivating the last active ADMIN", () => {
    const result = canDeactivateUser({
      actorId: "owner_a",
      targetId: "owner_b",
      targetRole: Role.ADMIN,
      targetActive: true,
      activeOwnerCount: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/poslednjeg aktivnog vlasnika/);
    }
  });

  it("allows deactivating a ADMIN when another active owner exists", () => {
    const result = canDeactivateUser({
      actorId: "owner_a",
      targetId: "owner_b",
      targetRole: Role.ADMIN,
      targetActive: true,
      activeOwnerCount: 2,
    });
    expect(result).toEqual({ ok: true });
  });

  it("blocks self-deactivation", () => {
    const result = canDeactivateUser({
      actorId: "u1",
      targetId: "u1",
      targetRole: Role.MENADZER_PRODAJE,
      targetActive: true,
      activeOwnerCount: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("canChangeUserRole", () => {
  it("blocks changing own role", () => {
    expect(
      canChangeUserRole({ actorId: "u1", targetId: "u1" }).ok,
    ).toBe(false);
  });
});
