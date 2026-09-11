"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { BatchStatus } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import { FilterChips, useFilterValue } from "@/components/filter-bar";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { BatchStatusBadge } from "@/components/status-badge";
import { batchStatusLabel, formatRsd } from "@/lib/labels";

export type BatchListItem = {
  id: string;
  plannedAtLabel: string;
  productName: string;
  status: BatchStatus;
  plannedQuantity: number;
  producedQuantity: number | null;
  scrapQuantity: number;
  createdByName: string;
  batchCost: number;
};

const STATUSES: BatchStatus[] = [
  "PLANIRANA",
  "ZAPOCETA",
  "U_TOKU",
  "ZAVRSENA",
  "DELIMICNO_USPESNA",
  "OTKAZANA",
];

type BatchesTableProps = {
  batches: BatchListItem[];
  createAction?: React.ReactNode;
};

export function BatchesTable(props: BatchesTableProps) {
  return (
    <SearchParamsBoundary>
      <BatchesTableInner {...props} />
    </SearchParamsBoundary>
  );
}

function BatchesTableInner({ batches, createAction }: BatchesTableProps) {
  const status = useFilterValue("status");

  const filtered = useMemo(
    () => (status ? batches.filter((b) => b.status === status) : batches),
    [batches, status],
  );

  return (
    <div className="space-y-4">
      {batches.length > 0 ? (
        <FilterChips
          param="status"
          ariaLabel="Filter po statusu serije"
          options={STATUSES.map((s) => ({
            value: s,
            label: batchStatusLabel(s),
          }))}
        />
      ) : null}

      <DataTable
        data={filtered}
        searchKey="productName"
        searchPlaceholder="Pretraga po proizvodu…"
        emptyMessage="Nema serija za zadati filter"
        empty={
          batches.length > 0
            ? undefined
            : {
                title: "Još nema proizvodnih serija",
                description:
                  "Planiranje serije rezerviše sirovine po recepturi; stanje se menja tek kada proizvodnju započnete.",
                action: createAction,
              }
        }
        columns={[
          { header: "Planirano", cell: (b) => b.plannedAtLabel },
          {
            header: "Proizvod",
            cell: (b) => (
              <Link
                href={`/batches/${b.id}`}
                className="underline-offset-4 hover:underline"
              >
                {b.productName}
              </Link>
            ),
          },
          {
            header: "Status",
            cell: (b) => <BatchStatusBadge status={b.status} />,
          },
          {
            header: "Planirano kom.",
            align: "right",
            cell: (b) => b.plannedQuantity,
          },
          {
            header: "Proizvedeno",
            align: "right",
            cell: (b) => b.producedQuantity ?? "—",
          },
          {
            header: "Škart",
            align: "right",
            cell: (b) => (b.scrapQuantity > 0 ? b.scrapQuantity : "—"),
          },
          { header: "Autor", cell: (b) => b.createdByName },
          {
            header: "Trošak serije",
            align: "right",
            cell: (b) => (b.batchCost > 0 ? formatRsd(b.batchCost) : "—"),
          },
        ]}
      />
    </div>
  );
}
