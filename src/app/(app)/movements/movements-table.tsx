"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { StockMovementType, Unit } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import {
  FilterBar,
  FilterSelect,
  useFilterValue,
} from "@/components/filter-bar";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { formatUnitPrice, stockMovementTypeLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type MovementListItem = {
  id: string;
  materialId: string;
  materialName: string;
  unit: Unit;
  unitLabel: string;
  type: StockMovementType;
  direction: 1 | -1;
  quantity: number;
  unitPrice: number;
  value: number;
  batchId: string | null;
  note: string | null;
  createdByName: string;
  createdAtLabel: string;
};

const TYPES: StockMovementType[] = [
  "NABAVKA",
  "IZDAVANJE",
  "POVRACAJ",
  "OTPAD",
  "KOREKCIJA",
];

type MovementsTableProps = {
  movements: MovementListItem[];
  materials: Array<{ id: string; name: string }>;
};

export function MovementsTable(props: MovementsTableProps) {
  return (
    <SearchParamsBoundary>
      <MovementsTableInner {...props} />
    </SearchParamsBoundary>
  );
}

function MovementsTableInner({ movements, materials }: MovementsTableProps) {
  const materialId = useFilterValue("material");
  const type = useFilterValue("type");

  const filtered = useMemo(
    () =>
      movements.filter((m) => {
        if (materialId && m.materialId !== materialId) return false;
        if (type && m.type !== type) return false;
        return true;
      }),
    [movements, materialId, type],
  );

  return (
    <div className="space-y-4">
      {movements.length > 0 ? (
        <FilterBar>
          <FilterSelect
            label="Sirovina"
            param="material"
            allLabel="Sve sirovine"
            options={materials.map((m) => ({ value: m.id, label: m.name }))}
          />
          <FilterSelect
            label="Vrsta"
            param="type"
            allLabel="Sve vrste"
            options={TYPES.map((t) => ({
              value: t,
              label: stockMovementTypeLabel(t),
            }))}
          />
        </FilterBar>
      ) : null}

      <DataTable
        data={filtered}
        emptyMessage="Nema kretanja za zadati filter"
        empty={
          movements.length > 0
            ? undefined
            : {
                title: "Još nema kretanja zaliha",
                description:
                  "Redovi nastaju automatski: nabavka, izdavanje u proizvodnju, povraćaj, otpad i korekcija.",
                action: { href: "/purchases?new=1", label: "Nova nabavka" },
              }
        }
        columns={[
          { header: "Vreme", cell: (m) => m.createdAtLabel },
          {
            header: "Sirovina",
            cell: (m) => (
              <Link
                href={`/materials/${m.materialId}`}
                className="underline-offset-4 hover:underline"
              >
                {m.materialName}
              </Link>
            ),
          },
          { header: "Vrsta", cell: (m) => stockMovementTypeLabel(m.type) },
          {
            header: "Količina",
            align: "right",
            cell: (m) => (
              <span
                className={cn(
                  "tabular-nums",
                  m.direction > 0
                    ? "text-wax-sage-foreground"
                    : "text-destructive",
                )}
              >
                {m.direction > 0 ? "+" : "−"}
                {m.quantity} {m.unitLabel}
              </span>
            ),
          },
          {
            header: "Cena",
            align: "right",
            cell: (m) =>
              m.unitPrice > 0 ? formatUnitPrice(m.unitPrice, m.unit) : "—",
          },
          {
            header: "Dokument",
            cell: (m) =>
              m.batchId ? (
                <Link
                  href={`/batches/${m.batchId}`}
                  className="underline-offset-4 hover:underline"
                >
                  Serija
                </Link>
              ) : (
                (m.note ?? "—")
              ),
          },
          { header: "Korisnik", cell: (m) => m.createdByName },
        ]}
      />
    </div>
  );
}
