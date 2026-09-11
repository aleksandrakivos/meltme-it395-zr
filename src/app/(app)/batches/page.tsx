import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateBatchSheet } from "./create-batch-sheet";
import { BatchesTable } from "./batches-table";

export default async function BatchesPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);

  const [batches, products] = await Promise.all([
    prisma.productionBatch.findMany({
      orderBy: { plannedAt: "desc" },
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
        lines: true,
      },
    }),
    prisma.product.findMany({
      where: { recipeItems: { some: {} }, active: true },
      orderBy: { name: "asc" },
      include: { recipeItems: { include: { material: true } } },
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    recipe: p.recipeItems.map((item) => ({
      materialId: item.materialId,
      materialName: item.material.name,
      quantityPerUnit: item.quantity.toNumber(),
      stock: item.material.stock.toNumber(),
      reserved: item.material.reserved.toNumber(),
      avgPurchasePrice: item.material.avgPurchasePrice.toNumber(),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proizvodne serije"
        actions={<CreateBatchSheet products={productOptions} />}
      />
      {products.length === 0 ? (
        <p className="border-l-2 pl-3 text-sm text-muted-foreground">
          Nema aktivnih proizvoda sa recepturom. Prvo popunite recepture da
          biste planirali seriju.
        </p>
      ) : null}
      <BatchesTable
        createAction={
          products.length === 0 ? (
            <Link
              href="/recipes"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Uredi recepture
            </Link>
          ) : (
            <CreateBatchSheet
              products={productOptions}
              variant="outline"
              openFromQuery={false}
            />
          )
        }
        batches={batches.map((b) => ({
          id: b.id,
          plannedAtLabel: formatDateOnly(b.plannedAt),
          productName: b.product.name,
          status: b.status,
          plannedQuantity: b.plannedQuantity,
          producedQuantity: b.producedQuantity,
          scrapQuantity: b.scrapQuantity,
          createdByName: b.user.name,
          batchCost: b.lines.reduce(
            (sum, line) =>
              sum +
              (line.consumedQuantity.toNumber() +
                line.wasteQuantity.toNumber()) *
                line.unitPrice.toNumber(),
            0,
          ),
        }))}
      />
    </div>
  );
}
