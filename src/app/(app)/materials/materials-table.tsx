"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { MaterialType, Unit } from "@prisma/client";
import { deleteMaterial } from "@/actions/materials";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { FormSheet } from "@/components/form-sheet";
import { MaterialForm } from "./material-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUnitPrice, materialTypeLabel, unitLabel } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";

export type MaterialListItem = {
  id: string;
  name: string;
  type: MaterialType;
  unit: Unit;
  stock: number;
  reserved: number;
  available: number;
  minStock: number;
  avgPurchasePrice: number;
  supplierId: string | null;
  supplierName: string | null;
  canDelete: boolean;
};

type SupplierOption = { id: string; name: string };

function EditMaterialSheet({
  material,
  suppliers,
}: {
  material: MaterialListItem;
  suppliers: SupplierOption[];
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Izmena sirovine"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <PencilSimpleIcon
            weight="duotone"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Izmeni
        </Button>
      }
    >
      <MaterialForm
        mode="edit"
        suppliers={suppliers}
        material={{
          id: material.id,
          name: material.name,
          type: material.type,
          unit: material.unit,
          minStock: material.minStock,
          supplierId: material.supplierId,
        }}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}

type MaterialsTableProps = {
  materials: MaterialListItem[];
  suppliers: SupplierOption[];
  /** ADMIN može da koriguje stanje direktno iz tabele. */
  canAdjustStock?: boolean;
  createAction?: React.ReactNode;
};

export function MaterialsTable({
  materials,
  suppliers,
  canAdjustStock = false,
  createAction,
}: MaterialsTableProps) {
  const router = useRouter();

  return (
    <DataTable
      data={materials}
      searchKey="name"
      searchPlaceholder="Pretraga po nazivu…"
      emptyMessage="Nema sirovina za zadatu pretragu"
      empty={{
        title: "Još nema sirovina",
        description:
          "Sirovina se prvo definiše (naziv, tip, jedinica, minimum), a stanje i cena ulaze kroz nabavku.",
        action: createAction,
      }}
      columns={[
        {
          header: "Naziv",
          cell: (m) => (
            <Link href={`/materials/${m.id}`} className="underline-offset-4 hover:underline">
              {m.name}
            </Link>
          ),
        },
        { header: "Tip", cell: (m) => materialTypeLabel(m.type) },
        {
          header: "Stanje",
          align: "right",
          cell: (m) => `${m.stock} ${unitLabel(m.unit)}`,
        },
        {
          header: "Rezervisano",
          align: "right",
          cell: (m) => (m.reserved > 0 ? m.reserved : "—"),
        },
        {
          header: "Raspoloživo",
          align: "right",
          cell: (m) => (
            <span className="inline-flex items-center justify-end gap-2 tabular-nums">
              <span
                className={
                  m.available < m.minStock
                    ? "text-destructive"
                    : "text-wax-sage-foreground"
                }
              >
                {m.available}
              </span>
              {m.available < m.minStock ? (
                <Badge variant="destructive">Niska zaliha</Badge>
              ) : null}
            </span>
          ),
        },
        {
          header: "Prosečna nab. cena",
          align: "right",
          cell: (m) =>
            m.avgPurchasePrice > 0
              ? formatUnitPrice(m.avgPurchasePrice, m.unit)
              : "—",
        },
        { header: "Dobavljač", cell: (m) => m.supplierName ?? "—" },
        {
          header: "",
          className: "w-[1%] whitespace-nowrap",
          cell: (m) => (
            <div className="flex items-center justify-end gap-2">
              {canAdjustStock ? (
                <AdjustStockDialog
                  materialId={m.id}
                  materialName={m.name}
                  unit={m.unit}
                  stock={m.stock}
                  triggerLabel="Korekcija"
                />
              ) : null}
              <EditMaterialSheet material={m} suppliers={suppliers} />
              {m.canDelete ? (
                <ConfirmDialog
                  triggerLabel="Obriši"
                  triggerIcon={
                    <TrashIcon weight="duotone" data-icon="inline-start" />
                  }
                  title="Obrisati sirovinu?"
                  description={`Trajno brišete ${m.name}.`}
                  confirmLabel="Obriši"
                  onConfirm={async () => {
                    const result = await deleteMaterial(m.id);
                    if (!result.ok) {
                      notifyError(result.error);
                      return;
                    }
                    notifySuccess("Sirovina je obrisana");
                    router.refresh();
                  }}
                />
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
