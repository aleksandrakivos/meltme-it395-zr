import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { toMaterialDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CreateMaterialSheet } from "./create-material-sheet";
import { MaterialsTable } from "./materials-table";

export default async function MaterialsPage() {
  const user = await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const [materials, suppliers] = await Promise.all([
    prisma.material.findMany({
      orderBy: { name: "asc" },
      include: {
        supplier: { select: { name: true } },
        _count: {
          select: {
            recipeItems: true,
            batchLines: true,
            purchases: true,
            movements: true,
          },
        },
      },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sirovine"
        actions={<CreateMaterialSheet suppliers={suppliers} />}
      />
      <MaterialsTable
        suppliers={suppliers}
        canAdjustStock={user.role === Role.ADMIN}
        createAction={
          <CreateMaterialSheet suppliers={suppliers} variant="outline" />
        }
        materials={materials.map((m) => {
          const dto = toMaterialDTO(m, user.role);
          return {
            id: dto.id,
            name: dto.name,
            type: dto.type,
            unit: dto.unit,
            stock: dto.stock,
            reserved: dto.reserved,
            available: dto.available,
            minStock: dto.minStock,
            avgPurchasePrice: dto.avgPurchasePrice ?? 0,
            supplierId: m.supplierId,
            supplierName: m.supplier?.name ?? null,
            canDelete:
              m._count.recipeItems === 0 &&
              m._count.batchLines === 0 &&
              m._count.purchases === 0 &&
              m._count.movements === 0,
          };
        })}
      />
    </div>
  );
}
