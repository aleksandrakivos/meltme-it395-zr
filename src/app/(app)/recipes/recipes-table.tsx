"use client";

import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { cn } from "@/lib/utils";

type RecipeProductRow = {
  id: string;
  name: string;
  itemCount: number;
};

export function RecipesTable({ products }: { products: RecipeProductRow[] }) {
  return (
    <DataTable
      data={products}
      searchKey="name"
      searchPlaceholder="Pretraga proizvoda…"
      emptyMessage="Nema proizvoda"
      empty={{
        title: "Još nema proizvoda",
        description:
          "Recepture se definišu po proizvodu. Proizvode u katalog dodaje administrator.",
      }}
      columns={[
        { header: "Proizvod", cell: (r) => r.name },
        {
          header: "Receptura",
          cell: (r) =>
            r.itemCount > 0 ? (
              <Badge variant="secondary">Kompletna</Badge>
            ) : (
              <Badge variant="outline">Bez recepture</Badge>
            ),
        },
        {
          header: "Stavki",
          align: "right",
          cell: (r) => r.itemCount,
        },
        {
          header: "",
          className: "w-[1%] whitespace-nowrap",
          cell: (r) => (
            <Link
              href={`/recipes/${r.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <PencilSimpleIcon
                weight="duotone"
                aria-hidden="true"
                data-icon="inline-start"
              />
              Izmeni recepturu
            </Link>
          ),
        },
      ]}
    />
  );
}
