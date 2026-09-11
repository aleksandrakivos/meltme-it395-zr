import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  stockMovementDirection,
  unitLabel,
} from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { MovementsTable } from "./movements-table";

export default async function MovementsPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);

  const [movements, materials] = await Promise.all([
    prisma.stockMovement.findMany({
      take: 300,
      orderBy: { createdAt: "desc" },
      include: {
        material: { select: { id: true, name: true, unit: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.material.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kretanje zaliha" />
      <MovementsTable
        materials={materials}
        movements={movements.map((m) => {
          const quantity = m.quantity.toNumber();
          const unitPrice = m.unitPrice.toNumber();
          return {
            id: m.id,
            materialId: m.materialId,
            materialName: m.material.name,
            unit: m.material.unit,
            unitLabel: unitLabel(m.material.unit),
            type: m.type,
            direction: stockMovementDirection(m.type),
            quantity,
            unitPrice,
            value: quantity * unitPrice,
            batchId: m.batchId,
            note: m.note,
            createdByName: m.user.name,
            createdAtLabel: formatDate(m.createdAt),
          };
        })}
      />
    </div>
  );
}
