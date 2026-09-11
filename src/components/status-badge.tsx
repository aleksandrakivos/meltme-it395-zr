import type { BatchStatus, OrderStatus } from "@prisma/client";
import { batchStatusLabel, orderStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const orderDotClass: Record<OrderStatus, string> = {
  NOVA: "bg-status-nova",
  U_PRIPREMI: "bg-status-u-pripremi",
  POSLATA: "bg-status-poslata",
  ZAVRSENA: "bg-status-zavrsena",
  OTKAZANA: "bg-status-otkazana",
};

const batchDotClass: Record<BatchStatus, string> = {
  PLANIRANA: "bg-status-planirana",
  ZAPOCETA: "bg-status-zapoceta",
  U_TOKU: "bg-status-u-toku",
  ZAVRSENA: "bg-status-zavrsena",
  DELIMICNO_USPESNA: "bg-status-delimicno",
  OTKAZANA: "bg-status-otkazana",
};

function Badge({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-xs whitespace-nowrap">
      <span className={cn("size-2", dotClass)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge dotClass={orderDotClass[status]} label={orderStatusLabel(status)} />
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <Badge dotClass={batchDotClass[status]} label={batchStatusLabel(status)} />
  );
}
