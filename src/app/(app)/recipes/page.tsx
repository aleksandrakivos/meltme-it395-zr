import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { RecipesTable } from "./recipes-table";

export default async function RecipesPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { recipeItems: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Recepture" />
      <RecipesTable
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          itemCount: p._count.recipeItems,
        }))}
      />
    </div>
  );
}
