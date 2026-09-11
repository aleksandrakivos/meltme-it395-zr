import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { Role } from "@prisma/client";
import { toMaterialDTO, toProductDTO } from "@/lib/dto";

const product = {
  id: "p1",
  name: "Lavanda 200ml",
  waxType: "soja",
  scent: "lavanda",
  size: "200ml",
  stock: 8,
  reserved: 2,
  active: true,
  sellingPrice: new Decimal("890.00"),
};

const material = {
  id: "m1",
  name: "Soja vosak",
  type: "VOSAK" as const,
  unit: "G" as const,
  stock: new Decimal("5000.000"),
  reserved: new Decimal("360.000"),
  minStock: new Decimal("1000.000"),
  supplierId: "s1",
  avgPurchasePrice: new Decimal("0.0975"),
};

describe("toProductDTO", () => {
  it("omits sellingPrice for MENADZER_PROIZVODNJE", () => {
    const dto = toProductDTO(product, Role.MENADZER_PROIZVODNJE);
    expect(dto).not.toHaveProperty("sellingPrice");
    expect(dto.name).toBe("Lavanda 200ml");
  });

  it("includes sellingPrice as number for ADMIN and MENADZER_PRODAJE", () => {
    expect(toProductDTO(product, Role.ADMIN).sellingPrice).toBe(890);
    expect(toProductDTO(product, Role.MENADZER_PRODAJE).sellingPrice).toBe(890);
  });

  it("izvodi raspoloživo stanje kao stock - reserved", () => {
    const dto = toProductDTO(product, Role.ADMIN);
    expect(dto.reserved).toBe(2);
    expect(dto.available).toBe(6);
  });
});

describe("toMaterialDTO", () => {
  it("includes avgPurchasePrice for ADMIN and MENADZER_PROIZVODNJE", () => {
    expect(toMaterialDTO(material, Role.ADMIN).avgPurchasePrice).toBe(0.0975);
    expect(
      toMaterialDTO(material, Role.MENADZER_PROIZVODNJE).avgPurchasePrice,
    ).toBe(0.0975);
  });

  it("strips avgPurchasePrice for MENADZER_PRODAJE", () => {
    const dto = toMaterialDTO(material, Role.MENADZER_PRODAJE);
    expect(dto).not.toHaveProperty("avgPurchasePrice");
    expect(dto.stock).toBe(5000);
  });

  it("izvodi raspoloživo stanje kao stock - reserved", () => {
    const dto = toMaterialDTO(material, Role.ADMIN);
    expect(dto.reserved).toBe(360);
    expect(dto.available).toBe(4640);
  });
});
