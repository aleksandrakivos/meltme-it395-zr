import type { Role } from "@prisma/client";
import { ROUTE_ACCESS } from "@/lib/routes";

export type NavGroupId =
  | "pregled"
  | "zalihe"
  | "proizvodnja"
  | "prodaja"
  | "administracija"
  | "nalog";

export type NavItem = {
  href: string;
  label: string;
  group: NavGroupId;
};

export type NavGroup = {
  id: NavGroupId;
  label: string | null;
  items: NavItem[];
};

export const NAV_LABELS: Record<keyof typeof ROUTE_ACCESS, string> = {
  "/dashboard": "Kontrolna tabla",
  "/materials": "Sirovine",
  "/purchases": "Nabavke",
  "/movements": "Kretanje zaliha",
  "/suppliers": "Dobavljači",
  "/recipes": "Recepture",
  "/batches": "Proizvodne serije",
  "/products": "Proizvodi",
  "/customers": "Kupci",
  "/orders": "Porudžbine",
  "/users": "Korisnici",
  "/reports": "Izveštaji",
  "/profile": "Profil",
};

const NAV_GROUPS: ReadonlyArray<{
  id: NavGroupId;
  label: string | null;
  hrefs: Array<keyof typeof ROUTE_ACCESS>;
}> = [
  { id: "pregled", label: null, hrefs: ["/dashboard"] },
  {
    id: "zalihe",
    label: "Zalihe",
    hrefs: ["/materials", "/purchases", "/movements", "/suppliers"],
  },
  { id: "proizvodnja", label: "Proizvodnja", hrefs: ["/recipes", "/batches"] },
  {
    id: "prodaja",
    label: "Prodaja",
    hrefs: ["/products", "/customers", "/orders"],
  },
  {
    id: "administracija",
    label: "Administracija",
    hrefs: ["/users", "/reports"],
  },
  { id: "nalog", label: null, hrefs: ["/profile"] },
];

export function getNavGroupsForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.hrefs
      .filter((href) => ROUTE_ACCESS[href].includes(role))
      .map((href) => ({ href, label: NAV_LABELS[href], group: group.id })),
  })).filter((group) => group.items.length > 0);
}

export function getNavItemsForRole(role: Role): NavItem[] {
  return getNavGroupsForRole(role).flatMap((group) => group.items);
}

export function navLabelForPath(pathname: string): string | null {
  const match = (Object.keys(NAV_LABELS) as Array<keyof typeof NAV_LABELS>)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? NAV_LABELS[match] : null;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "MENADZER_PROIZVODNJE":
      return "Menadžer proizvodnje";
    case "MENADZER_PRODAJE":
      return "Menadžer prodaje";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
