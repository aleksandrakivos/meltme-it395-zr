"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import type { OrderStatus } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import { FilterChips } from "@/components/filter-bar";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatRsd, orderStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type OrderListItem = {
  id: string;
  dateLabel: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
};

const STATUSES: OrderStatus[] = [
  "NOVA",
  "U_PRIPREMI",
  "POSLATA",
  "ZAVRSENA",
  "OTKAZANA",
];

type OrdersTableProps = {
  orders: OrderListItem[];
  hasAnyOrders: boolean;
  createAction?: React.ReactNode;
};

export function OrdersTable(props: OrdersTableProps) {
  return (
    <SearchParamsBoundary>
      <OrdersTableInner {...props} />
    </SearchParamsBoundary>
  );
}

function OrdersTableInner({
  orders,
  hasAnyOrders,
  createAction,
}: OrdersTableProps) {
  return (
    <div className="space-y-4">
      {hasAnyOrders ? (
        <FilterChips
          param="status"
          ariaLabel="Filter po statusu porudžbine"
          options={STATUSES.map((s) => ({
            value: s,
            label: orderStatusLabel(s),
          }))}
        />
      ) : null}

      <DataTable
        data={orders}
        searchKey="customerName"
        searchPlaceholder="Pretraga po kupcu…"
        emptyMessage="Nema porudžbina za zadati filter"
        empty={
          hasAnyOrders
            ? undefined
            : {
                title: "Još nema porudžbina",
                description:
                  "Kreirajte prvu porudžbinu — proizvodi se rezervišu odmah, a skidaju sa stanja tek kada porudžbina bude poslata.",
                action: createAction,
              }
        }
        columns={[
          { header: "Datum", cell: (o) => o.dateLabel },
          { header: "Kupac", cell: (o) => o.customerName },
          {
            header: "Status",
            cell: (o) => <StatusBadge status={o.status} />,
          },
          {
            header: "Stavki",
            align: "right",
            cell: (o) => o.itemCount,
          },
          {
            header: "Ukupno",
            align: "right",
            cell: (o) => formatRsd(o.total),
          },
          {
            header: "",
            className: "w-[1%] whitespace-nowrap",
            cell: (o) => (
              <Link
                href={`/orders/${o.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Detalj
                <ArrowRightIcon
                  weight="bold"
                  aria-hidden="true"
                  data-icon="inline-end"
                />
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
