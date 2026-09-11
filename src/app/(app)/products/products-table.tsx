"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  PencilSimpleIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { setProductActive } from "@/actions/products";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { FormSheet } from "@/components/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatRsd } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  ProductForm,
  type ProductMaterialOption,
} from "./product-form";

export type ProductListItem = {
  id: string;
  name: string;
  waxType: string;
  scent: string | null;
  size: string;
  stock: number;
  reserved: number;
  available: number;
  active: boolean;
  sellingPrice?: number;
  unitCost?: number | null;
  margin?: number | null;
  marginPercent?: number | null;
};

function EditProductSheet({
  product,
  waxOptions,
  scentOptions,
}: {
  product: ProductListItem;
  waxOptions: ProductMaterialOption[];
  scentOptions: ProductMaterialOption[];
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  if (product.sellingPrice === undefined) {
    return null;
  }

  return (
    <FormSheet
      title="Izmena proizvoda"
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
      <ProductForm
        mode="edit"
        product={{
          id: product.id,
          name: product.name,
          waxType: product.waxType,
          scent: product.scent,
          size: product.size,
          sellingPrice: product.sellingPrice,
        }}
        waxOptions={waxOptions}
        scentOptions={scentOptions}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}

type ProductsTableProps = {
  products: ProductListItem[];
  canManage: boolean;
  showPrice: boolean;
  /** ADMIN: kolone troška i marže su dostupne iza prekidača. */
  canShowCogs: boolean;
  waxOptions: ProductMaterialOption[];
  scentOptions: ProductMaterialOption[];
  createAction?: React.ReactNode;
};

export function ProductsTable({
  products,
  canManage,
  showPrice,
  canShowCogs,
  waxOptions,
  scentOptions,
  createAction,
}: ProductsTableProps) {
  const router = useRouter();
  const [showCogs, setShowCogs] = useState(false);

  return (
    <DataTable
      data={products}
      searchKey="name"
      searchPlaceholder="Pretraga po nazivu…"
      emptyMessage="Nema proizvoda za zadatu pretragu"
      empty={{
        title: "Još nema proizvoda",
        description: canManage
          ? "Dodajte prvi proizvod u katalog; recepturu i seriju definišete kasnije."
          : "Proizvode u katalog dodaje administrator.",
        action: canManage ? createAction : undefined,
      }}
      toolbar={
        canShowCogs ? (
          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="products-show-cogs"
              checked={showCogs}
              onCheckedChange={setShowCogs}
            />
            <Label
              htmlFor="products-show-cogs"
              className="text-sm font-normal"
            >
              Prikaži troškove
            </Label>
          </div>
        ) : undefined
      }
      columns={[
        { header: "Naziv", cell: (p) => p.name },
        { header: "Vosak", cell: (p) => p.waxType },
        { header: "Miris", cell: (p) => p.scent ?? "—" },
        { header: "Veličina (g)", cell: (p) => p.size, align: "right" },
        {
          header: "Stanje",
          align: "right",
          cell: (p) => p.stock,
        },
        {
          header: "Rezervisano",
          align: "right",
          cell: (p) => (p.reserved > 0 ? p.reserved : "—"),
        },
        {
          header: "Raspoloživo",
          align: "right",
          cell: (p) => p.available,
        },
        ...(showPrice
          ? [
              {
                header: "Prodajna cena",
                align: "right" as const,
                cell: (p: ProductListItem) =>
                  p.sellingPrice !== undefined
                    ? formatRsd(p.sellingPrice)
                    : "—",
              },
            ]
          : []),
        ...(canShowCogs && showCogs
          ? [
              {
                header: "Planska cena koštanja",
                align: "right" as const,
                cell: (p: ProductListItem) =>
                  p.unitCost == null ? "—" : formatRsd(p.unitCost),
              },
              {
                header: "Marža",
                align: "right" as const,
                cell: (p: ProductListItem) =>
                  p.margin == null || p.marginPercent == null ? (
                    "—"
                  ) : (
                    <span
                      className={cn(
                        "tabular-nums",
                        p.margin > 0 && "text-wax-sage-foreground",
                        p.margin < 0 && "text-destructive",
                      )}
                    >
                      {formatRsd(p.margin)} ({p.marginPercent.toFixed(1)}%)
                    </span>
                  ),
              },
            ]
          : []),
        {
          header: "Status",
          cell: (p) =>
            p.active ? (
              <Badge variant="secondary">Aktivan</Badge>
            ) : (
              <Badge variant="outline">Neaktivan</Badge>
            ),
        },
        ...(canManage
          ? [
              {
                header: "",
                className: "w-[1%] whitespace-nowrap",
                cell: (p: ProductListItem) => (
                  <div className="flex items-center justify-end gap-2">
                    <EditProductSheet
                      product={p}
                      waxOptions={waxOptions}
                      scentOptions={scentOptions}
                    />
                    {p.active ? (
                      <ConfirmDialog
                        triggerLabel="Deaktiviraj"
                        triggerIcon={
                          <ProhibitIcon
                            weight="duotone"
                            data-icon="inline-start"
                          />
                        }
                        title="Deaktivirati proizvod?"
                        description={`${p.name} više neće biti u aktivnom katalogu.`}
                        confirmLabel="Deaktiviraj"
                        onConfirm={async () => {
                          const result = await setProductActive({
                            id: p.id,
                            active: false,
                          });
                          if (!result.ok) {
                            notifyError(result.error);
                            return;
                          }
                          notifySuccess("Proizvod je deaktiviran");
                          router.refresh();
                        }}
                      />
                    ) : (
                      <ConfirmDialog
                        triggerLabel="Aktiviraj"
                        triggerIcon={
                          <CheckCircleIcon
                            weight="duotone"
                            data-icon="inline-start"
                          />
                        }
                        title="Aktivirati proizvod?"
                        description={`${p.name} će ponovo biti aktivan.`}
                        confirmLabel="Aktiviraj"
                        variant="outline"
                        onConfirm={async () => {
                          const result = await setProductActive({
                            id: p.id,
                            active: true,
                          });
                          if (!result.ok) {
                            notifyError(result.error);
                            return;
                          }
                          notifySuccess("Proizvod je aktiviran");
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
