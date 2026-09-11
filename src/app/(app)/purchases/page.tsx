import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateOnly, unitLabel } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { CreatePurchaseSheet } from "./create-purchase-sheet";
import { PurchasesTable } from "./purchases-table";

export default async function PurchasesPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);

  const [purchases, materials, suppliers] = await Promise.all([
    prisma.materialPurchase.findMany({
      orderBy: [
        { purchasedAt: "desc" },
        { documentNo: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        material: { select: { id: true, name: true, unit: true } },
        supplier: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.material.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        stock: true,
        avgPurchasePrice: true,
        supplierId: true,
      },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    stock: m.stock.toNumber(),
    avgPurchasePrice: m.avgPurchasePrice.toNumber(),
    supplierId: m.supplierId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nabavke"
        actions={
          <CreatePurchaseSheet
            materials={materialOptions}
            suppliers={suppliers}
            today={today}
          />
        }
      />

      <p className="border-l-2 pl-3 text-xs text-muted-foreground">
        Zapisi o nabavci su nepromenljivi. Ispravka se evidentira kao korekcija
        zaliha, da promena cene ne bi retroaktivno menjala već obračunate
        troškove proizvodnih serija.
      </p>

      <PurchasesTable
        materials={materials.map((m) => ({ id: m.id, name: m.name }))}
        createAction={
          materials.length > 0 ? (
            <CreatePurchaseSheet
              materials={materialOptions}
              suppliers={suppliers}
              today={today}
              variant="outline"
              openFromQuery={false}
            />
          ) : undefined
        }
        purchases={purchases.map((p) => ({
          id: p.id,
          materialId: p.materialId,
          materialName: p.material.name,
          unit: p.material.unit,
          unitLabel: unitLabel(p.material.unit),
          supplierName: p.supplier?.name ?? null,
          quantity: p.quantity.toNumber(),
          unitPrice: p.unitPrice.toNumber(),
          totalCost: p.totalCost.toNumber(),
          documentNo: p.documentNo,
          purchasedAtISO: p.purchasedAt.toISOString().slice(0, 10),
          purchasedAtLabel: formatDateOnly(p.purchasedAt),
          createdByName: p.user.name,
        }))}
      />
    </div>
  );
}
