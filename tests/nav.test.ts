import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  getNavGroupsForRole,
  getNavItemsForRole,
  navLabelForPath,
} from "@/lib/nav";

describe("getNavGroupsForRole", () => {
  it("hides empty groups for MENADZER_PRODAJE", () => {
    const ids = getNavGroupsForRole(Role.MENADZER_PRODAJE).map((g) => g.id);
    expect(ids).toEqual(["pregled", "prodaja", "nalog"]);
  });

  it("shows every group for ADMIN in display order", () => {
    const ids = getNavGroupsForRole(Role.ADMIN).map((g) => g.id);
    expect(ids).toEqual([
      "pregled",
      "zalihe",
      "proizvodnja",
      "prodaja",
      "administracija",
      "nalog",
    ]);
  });
});

describe("navLabelForPath", () => {
  it("resolves detail routes to their module label", () => {
    expect(navLabelForPath("/materials/abc")).toBe("Sirovine");
    expect(navLabelForPath("/batches")).toBe("Proizvodne serije");
    expect(navLabelForPath("/unknown")).toBeNull();
  });
});

describe("getNavItemsForRole", () => {
  it("shows owner-only modules only for ADMIN", () => {
    const hrefs = getNavItemsForRole(Role.ADMIN).map((i) => i.href);
    expect(hrefs).toContain("/users");
    expect(hrefs).toContain("/reports");
    expect(hrefs).toContain("/materials");
    expect(hrefs).toContain("/orders");
  });

  it("hides sales and owner modules from MENADZER_PROIZVODNJE", () => {
    const hrefs = getNavItemsForRole(Role.MENADZER_PROIZVODNJE).map((i) => i.href);
    expect(hrefs).toContain("/materials");
    expect(hrefs).toContain("/batches");
    expect(hrefs).toContain("/purchases");
    expect(hrefs).toContain("/movements");
    expect(hrefs).not.toContain("/orders");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/reports");
  });

  it("hides production modules from MENADZER_PRODAJE", () => {
    const hrefs = getNavItemsForRole(Role.MENADZER_PRODAJE).map((i) => i.href);
    expect(hrefs).toContain("/orders");
    expect(hrefs).toContain("/customers");
    expect(hrefs).not.toContain("/materials");
    expect(hrefs).not.toContain("/purchases");
    expect(hrefs).not.toContain("/movements");
    expect(hrefs).not.toContain("/recipes");
    expect(hrefs).not.toContain("/users");
  });
});
