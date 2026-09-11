import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { toProductDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { calculateMargin, calculatePlannedUnitCost } from "@/lib/services/cogs";
import { PageHeader } from "@/components/page-header";
import { CreateProductSheet } from "./create-product-sheet";
import { ProductsTable, type ProductListItem } from "./products-table";

export default async function ProductsPage() {
  const user = await requireRole([
    Role.ADMIN,
    Role.MENADZER_PROIZVODNJE,
    Role.MENADZER_PRODAJE,
  ]);
  const canManage = user.role === Role.ADMIN;
  const showPrice = user.role !== Role.MENADZER_PROIZVODNJE;
  const showCogs = user.role === Role.ADMIN;

  const catalogMaterials = await prisma.material.findMany({
    where: { type: { in: ["VOSAK", "MIRIS"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });
  const waxOptions = catalogMaterials
    .filter((m) => m.type === "VOSAK")
    .map((m) => ({ id: m.id, name: m.name }));
  const scentOptions = catalogMaterials
    .filter((m) => m.type === "MIRIS")
    .map((m) => ({ id: m.id, name: m.name }));

  let rows: ProductListItem[];

  if (showCogs) {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        recipeItems: {
          include: { material: { select: { avgPurchasePrice: true } } },
        },
      },
    });
    rows = products.map((p) => {
      const dto = toProductDTO(p, user.role);
      if (p.recipeItems.length === 0) {
        return {
          ...dto,
          unitCost: null,
          margin: null,
          marginPercent: null,
        };
      }
      const unitCost = calculatePlannedUnitCost(
        p.recipeItems.map((item) => ({
          quantity: item.quantity.toNumber(),
          avgPurchasePrice: item.material.avgPurchasePrice.toNumber(),
        }))
      );
      const { margin, marginPercent } = calculateMargin(
        p.sellingPrice.toNumber(),
        unitCost
      );
      return { ...dto, unitCost, margin, marginPercent };
    });
  } else {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    rows = products.map((p) => toProductDTO(p, user.role));
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Proizvodi"
        actions={
          canManage ? (
            <CreateProductSheet
              waxOptions={waxOptions}
              scentOptions={scentOptions}
            />
          ) : undefined
        }
      />
      <ProductsTable
        products={rows}
        canManage={canManage}
        showPrice={showPrice}
        canShowCogs={showCogs}
        waxOptions={waxOptions}
        scentOptions={scentOptions}
        createAction={
          canManage ? (
            <CreateProductSheet
              waxOptions={waxOptions}
              scentOptions={scentOptions}
              variant="outline"
            />
          ) : undefined
        }
      />
    </div>
  );
}
