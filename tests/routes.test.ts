import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { ROUTE_ACCESS, canAccessRoute, resolveRouteAccess } from "@/lib/routes";

describe("ROUTE_ACCESS / middleware redirect map", () => {
  it("mapa ruta po ulogama", () => {
    expect(ROUTE_ACCESS["/users"]).toEqual([Role.ADMIN]);
    expect(ROUTE_ACCESS["/reports"]).toEqual([Role.ADMIN]);
    expect(ROUTE_ACCESS["/materials"]).toEqual([
      Role.ADMIN,
      Role.MENADZER_PROIZVODNJE,
    ]);
    expect(ROUTE_ACCESS["/orders"]).toEqual([
      Role.ADMIN,
      Role.MENADZER_PRODAJE,
    ]);
    expect(ROUTE_ACCESS["/purchases"]).toEqual([
      Role.ADMIN,
      Role.MENADZER_PROIZVODNJE,
    ]);
    expect(ROUTE_ACCESS["/movements"]).toEqual([
      Role.ADMIN,
      Role.MENADZER_PROIZVODNJE,
    ]);
  });

  it("allows nested paths via prefix", () => {
    expect(resolveRouteAccess("/users/new")).toEqual([Role.ADMIN]);
    expect(
      canAccessRoute("/materials/abc/edit", Role.MENADZER_PROIZVODNJE),
    ).toBe(true);
  });

  it("denies MENADZER_PRODAJE on production routes (→ dashboard in middleware)", () => {
    expect(canAccessRoute("/recipes", Role.MENADZER_PRODAJE)).toBe(false);
    expect(canAccessRoute("/batches", Role.MENADZER_PRODAJE)).toBe(false);
    expect(canAccessRoute("/materials", Role.MENADZER_PRODAJE)).toBe(false);
    expect(canAccessRoute("/purchases", Role.MENADZER_PRODAJE)).toBe(false);
    expect(canAccessRoute("/movements", Role.MENADZER_PRODAJE)).toBe(false);
  });

  it("denies MENADZER_PROIZVODNJE on sales / owner-only routes", () => {
    expect(canAccessRoute("/orders", Role.MENADZER_PROIZVODNJE)).toBe(false);
    expect(canAccessRoute("/customers", Role.MENADZER_PROIZVODNJE)).toBe(false);
    expect(canAccessRoute("/users", Role.MENADZER_PROIZVODNJE)).toBe(false);
    expect(canAccessRoute("/reports", Role.MENADZER_PROIZVODNJE)).toBe(false);
  });

  it("allows all roles on dashboard and profile", () => {
    for (const role of [
      Role.ADMIN,
      Role.MENADZER_PROIZVODNJE,
      Role.MENADZER_PRODAJE,
    ]) {
      expect(canAccessRoute("/dashboard", role)).toBe(true);
      expect(canAccessRoute("/profile", role)).toBe(true);
    }
  });

  it("restricts product create/edit to ADMIN", () => {
    expect(canAccessRoute("/products/new", Role.ADMIN)).toBe(true);
    expect(canAccessRoute("/products/new", Role.MENADZER_PRODAJE)).toBe(false);
    expect(
      canAccessRoute("/products/abc/edit", Role.MENADZER_PROIZVODNJE),
    ).toBe(false);
    expect(canAccessRoute("/products", Role.MENADZER_PROIZVODNJE)).toBe(true);
  });
});
