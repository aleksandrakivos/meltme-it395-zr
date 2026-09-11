import type { Material, Product, Role } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") {
    return value;
  }
  return value.toNumber();
}

export type ProductDTO = {
  id: string;
  name: string;
  waxType: string;
  scent: string | null;
  size: string;
  stock: number;
  reserved: number;
  /** raspoloživo = stock − reserved */
  available: number;
  active: boolean;
  sellingPrice?: number;
};

export type MaterialDTO = {
  id: string;
  name: string;
  type: Material["type"];
  unit: Material["unit"];
  stock: number;
  reserved: number;
  /** raspoloživo = stock − reserved */
  available: number;
  minStock: number;
  supplierId: string | null;
  avgPurchasePrice?: number;
};

type ProductLike = Pick<
  Product,
  | "id"
  | "name"
  | "waxType"
  | "scent"
  | "size"
  | "stock"
  | "reserved"
  | "active"
  | "sellingPrice"
>;

type MaterialLike = Pick<
  Material,
  | "id"
  | "name"
  | "type"
  | "unit"
  | "stock"
  | "reserved"
  | "minStock"
  | "supplierId"
  | "avgPurchasePrice"
>;

/** MENADZER_PROIZVODNJE ne dobija sellingPrice. */
export function toProductDTO(product: ProductLike, role: Role): ProductDTO {
  const dto: ProductDTO = {
    id: product.id,
    name: product.name,
    waxType: product.waxType,
    scent: product.scent,
    size: product.size,
    stock: product.stock,
    reserved: product.reserved,
    available: product.stock - product.reserved,
    active: product.active,
  };

  if (role !== "MENADZER_PROIZVODNJE") {
    dto.sellingPrice = toNumber(product.sellingPrice);
  }

  return dto;
}

/** avgPurchasePrice samo za ADMIN i MENADZER_PROIZVODNJE role. */
export function toMaterialDTO(material: MaterialLike, role: Role): MaterialDTO {
  const stock = toNumber(material.stock);
  const reserved = toNumber(material.reserved);
  const dto: MaterialDTO = {
    id: material.id,
    name: material.name,
    type: material.type,
    unit: material.unit,
    stock,
    reserved,
    available: stock - reserved,
    minStock: toNumber(material.minStock),
    supplierId: material.supplierId,
  };

  if (role === "ADMIN" || role === "MENADZER_PROIZVODNJE") {
    dto.avgPurchasePrice = toNumber(material.avgPurchasePrice);
  }

  return dto;
}
