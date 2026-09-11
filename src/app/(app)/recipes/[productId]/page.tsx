import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { calculatePlannedUnitCost } from "@/lib/services/cogs";
import { prisma } from "@/lib/prisma";
import { RecipeEditor } from "./recipe-editor";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function RecipeDetailPage({ params }: PageProps) {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const { productId } = await params;

  const [product, materials] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        recipeItems: {
          include: { material: true },
          orderBy: { material: { name: "asc" } },
        },
      },
    }),
    prisma.material.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const lines = product.recipeItems.map((item) => {
    const quantity = item.quantity.toNumber();
    const avgPurchasePrice = item.material.avgPurchasePrice.toNumber();
    return {
      id: item.id,
      materialId: item.materialId,
      materialName: item.material.name,
      unit: item.material.unit,
      quantity,
      avgPurchasePrice,
      lineCost: quantity * avgPurchasePrice,
    };
  });

  const unitCost = calculatePlannedUnitCost(
    lines.map((l) => ({
      quantity: l.quantity,
      avgPurchasePrice: l.avgPurchasePrice,
    })),
  );

  return (
    <RecipeEditor
      productId={product.id}
      productName={product.name}
      unitCost={unitCost}
      lines={lines}
      materials={materials}
    />
  );
}
