import type { Role } from "@prisma/client";

/**
 * Mapa ruta i dozvoljenih uloga.
 */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["ADMIN", "MENADZER_PROIZVODNJE", "MENADZER_PRODAJE"],
  "/materials": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/purchases": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/movements": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/suppliers": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/recipes": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/batches": ["ADMIN", "MENADZER_PROIZVODNJE"],
  "/products": ["ADMIN", "MENADZER_PROIZVODNJE", "MENADZER_PRODAJE"],
  "/customers": ["ADMIN", "MENADZER_PRODAJE"],
  "/orders": ["ADMIN", "MENADZER_PRODAJE"],
  "/users": ["ADMIN"],
  "/reports": ["ADMIN"],
  "/profile": ["ADMIN", "MENADZER_PROIZVODNJE", "MENADZER_PRODAJE"],
};

export const APP_ROUTE_PREFIXES = Object.keys(ROUTE_ACCESS);

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isLoginRoute(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** Najduži prefiks iz ROUTE_ACCESS koji odgovara pathname-u. */
export function resolveRouteAccess(pathname: string): Role[] | null {
  const match = APP_ROUTE_PREFIXES.filter(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ).sort((a, b) => b.length - a.length)[0];

  if (!match) {
    return null;
  }
  return ROUTE_ACCESS[match] ?? null;
}

export function canAccessRoute(pathname: string, role: Role): boolean {
  if (
    pathname === "/products/new" ||
    /^\/products\/[^/]+\/edit$/.test(pathname)
  ) {
    return role === "ADMIN";
  }

  const allowed = resolveRouteAccess(pathname);
  if (!allowed) {
    return false;
  }
  return allowed.includes(role);
}
