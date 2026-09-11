import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { authorizeWithPassword } from "@/lib/auth-credentials";

const baseUser = {
  id: "user_1",
  email: "test@meltme.local",
  name: "Test",
  role: Role.ADMIN,
  passwordHash: "hashed",
  active: true,
};

describe("authorizeWithPassword", () => {
  it("rejects wrong password", async () => {
    const result = await authorizeWithPassword(
      baseUser,
      "wrong",
      async () => false,
    );
    expect(result).toBeNull();
  });

  it("rejects deactivated account even with correct password", async () => {
    const result = await authorizeWithPassword(
      { ...baseUser, active: false },
      "Lozinka!123",
      async () => true,
    );
    expect(result).toBeNull();
  });

  it("rejects missing user", async () => {
    const result = await authorizeWithPassword(null, "Lozinka!123", async () => true);
    expect(result).toBeNull();
  });

  it("returns auth user on success", async () => {
    const result = await authorizeWithPassword(
      baseUser,
      "Lozinka!123",
      async () => true,
    );
    expect(result).toEqual({
      id: baseUser.id,
      email: baseUser.email,
      name: baseUser.name,
      role: Role.ADMIN,
    });
  });
});
