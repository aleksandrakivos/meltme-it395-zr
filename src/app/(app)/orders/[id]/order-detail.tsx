"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { XCircleIcon } from "@phosphor-icons/react";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/actions/orders";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { Button } from "@/components/ui/button";
import { formatRsd, orderStatusLabel } from "@/lib/labels";
import { allowedTransitions } from "@/lib/services/order-status";

export type OrderDetailItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type OrderDetailProps = {
  order: {
    id: string;
    dateLabel: string;
    customerName: string;
    createdByName: string;
    status: OrderStatus;
    total: number;
    items: OrderDetailItem[];
  };
};

export function OrderDetail({ order }: OrderDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextStatuses = allowedTransitions(order.status);

  function changeStatus(status: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus({
        orderId: order.id,
        status,
      });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess(`Status: ${orderStatusLabel(status)}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Porudžbina"
        description={`${order.dateLabel} · ${order.customerName} · ${order.createdByName}`}
        backHref="/orders"
        backLabel="Porudžbine"
        actions={<StatusBadge status={order.status} />}
      />

      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Proizvod</AppTableHead>
            <AppTableHead align="right">Količina</AppTableHead>
            <AppTableHead align="right">Cena</AppTableHead>
            <AppTableHead align="right">Iznos</AppTableHead>
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {order.items.map((item) => (
            <AppTableRow key={item.id}>
              <AppTableCell>{item.productName}</AppTableCell>
              <AppTableCell align="right" className="tabular-nums">
                {item.quantity}
              </AppTableCell>
              <AppTableCell align="right" className="tabular-nums">
                {formatRsd(item.unitPrice)}
              </AppTableCell>
              <AppTableCell align="right" className="tabular-nums">
                {formatRsd(item.lineTotal)}
              </AppTableCell>
            </AppTableRow>
          ))}
        </AppTableBody>
      </AppTable>

      <p className="border-t pt-4 font-heading text-lg font-semibold tabular-nums">
        Ukupno: {formatRsd(order.total)}
      </p>

      {nextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) =>
            status === "OTKAZANA" ? (
              <ConfirmDialog
                key={status}
                triggerLabel="Otkaži"
                triggerIcon={
                  <XCircleIcon weight="duotone" data-icon="inline-start" />
                }
                title="Otkazati porudžbinu?"
                description="Stanje proizvoda biće vraćeno na zalihe."
                confirmLabel="Otkaži porudžbinu"
                onConfirm={async () => {
                  const result = await updateOrderStatus({
                    orderId: order.id,
                    status: "OTKAZANA",
                  });
                  if (!result.ok) {
                    notifyError(result.error);
                    return;
                  }
                  notifySuccess("Porudžbina otkazana");
                  router.refresh();
                }}
              />
            ) : (
              <Button
                key={status}
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => changeStatus(status)}
              >
                {orderStatusLabel(status)}
              </Button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
