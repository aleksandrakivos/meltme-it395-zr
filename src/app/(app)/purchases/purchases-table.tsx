"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Unit } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import {
  FilterBar,
  FilterDate,
  FilterSelect,
  useFilterValue,
} from "@/components/filter-bar";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { formatRsd, formatUnitPrice } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PurchaseListItem = {
  id: string;
  materialId: string;
  materialName: string;
  unit: Unit;
  unitLabel: string;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  documentNo: string | null;
  purchasedAtISO: string;
  purchasedAtLabel: string;
  createdByName: string;
};

type PurchasesTableProps = {
  purchases: PurchaseListItem[];
  materials: Array<{ id: string; name: string }>;
  createAction?: React.ReactNode;
};

/** Stavke istog dokumenta (isti br. dokumenta, datum i dobavljač) se vizuelno grupišu. */
function documentKey(p: PurchaseListItem): string | null {
  if (!p.documentNo) return null;
  return `${p.documentNo}|${p.purchasedAtISO}|${p.supplierName ?? ""}`;
}

export function PurchasesTable(props: PurchasesTableProps) {
  return (
    <SearchParamsBoundary>
      <PurchasesTableInner {...props} />
    </SearchParamsBoundary>
  );
}

function PurchasesTableInner({
  purchases,
  materials,
  createAction,
}: PurchasesTableProps) {
  const materialId = useFilterValue("material");
  const from = useFilterValue("from");
  const to = useFilterValue("to");

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (materialId && p.materialId !== materialId) return false;
      if (from && p.purchasedAtISO < from) return false;
      if (to && p.purchasedAtISO > to) return false;
      return true;
    });
  }, [purchases, materialId, from, to]);

  // Prvi red dokumenta nosi datum / dobavljača / dokument; ostali redovi ih ne ponavljaju.
  const rows = useMemo(
    () =>
      filtered.map((p, index) => {
        const key = documentKey(p);
        const previous = index > 0 ? documentKey(filtered[index - 1]) : null;
        return { ...p, continuation: key !== null && key === previous };
      }),
    [filtered],
  );

  const muted = (row: { continuation: boolean }, value: React.ReactNode) =>
    row.continuation ? (
      <>
        <span className="text-muted-foreground/50" aria-hidden="true">
          ↳
        </span>
        <span className="sr-only">{value}</span>
      </>
    ) : (
      value
    );

  return (
    <div className="space-y-4">
      {purchases.length > 0 ? (
        <FilterBar>
          <FilterSelect
            label="Sirovina"
            param="material"
            allLabel="Sve sirovine"
            options={materials.map((m) => ({ value: m.id, label: m.name }))}
          />
          <FilterDate label="Od" param="from" />
          <FilterDate label="Do" param="to" />
        </FilterBar>
      ) : null}

      <DataTable
        data={rows}
        emptyMessage="Nema nabavki za zadati filter"
        empty={
          purchases.length > 0
            ? undefined
            : {
                title: "Još nema evidentiranih nabavki",
                description:
                  "Nabavka unosi sirovinu na stanje i postavlja njenu prosečnu nabavnu cenu.",
                action: createAction,
              }
        }
        columns={[
          { header: "Datum", cell: (p) => muted(p, p.purchasedAtLabel) },
          {
            header: "Dokument",
            cell: (p) => muted(p, p.documentNo ?? "—"),
          },
          {
            header: "Dobavljač",
            cell: (p) => muted(p, p.supplierName ?? "—"),
          },
          {
            header: "Sirovina",
            cell: (p) => (
              <Link
                href={`/materials/${p.materialId}`}
                className={cn(
                  "underline-offset-4 hover:underline",
                  p.continuation && "pl-3",
                )}
              >
                {p.materialName}
              </Link>
            ),
          },
          {
            header: "Količina",
            align: "right",
            cell: (p) => `${p.quantity} ${p.unitLabel}`,
          },
          {
            header: "Cena",
            align: "right",
            cell: (p) => formatUnitPrice(p.unitPrice, p.unit),
          },
          {
            header: "Ukupno",
            align: "right",
            cell: (p) => formatRsd(p.totalCost),
          },
          { header: "Korisnik", cell: (p) => muted(p, p.createdByName) },
        ]}
      />
    </div>
  );
}
