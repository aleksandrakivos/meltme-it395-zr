"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import {
  PurchaseForm,
  type PurchaseMaterialOption,
  type PurchaseSupplierOption,
} from "./purchase-form";

type CreatePurchaseSheetProps = {
  materials: PurchaseMaterialOption[];
  suppliers: PurchaseSupplierOption[];
  today: string;
  lockedMaterialId?: string;
  triggerLabel?: string;
  variant?: "default" | "outline";
  openFromQuery?: boolean;
};

export function CreatePurchaseSheet(props: CreatePurchaseSheetProps) {
  const {
    materials,
    variant = "default",
    triggerLabel = "Nova nabavka",
  } = props;
  if (materials.length === 0) {
    return null;
  }
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          {triggerLabel}
        </Button>
      }
    >
      <CreatePurchaseSheetInner {...props} />
    </SearchParamsBoundary>
  );
}

function CreatePurchaseSheetInner({
  materials,
  suppliers,
  today,
  lockedMaterialId,
  triggerLabel = "Nova nabavka",
  variant = "default",
  openFromQuery = true,
}: CreatePurchaseSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const useQuery = openFromQuery && !lockedMaterialId;
  const open = useQuery ? openQuery : openLocal;
  const setOpen = useQuery ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Nova nabavka"
      description={
        lockedMaterialId
          ? "Zapis o nabavci je nepromenljiv — čuva istorijsku cenu i pomera ponderisani prosek."
          : undefined
      }
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      className="sm:max-w-2xl"
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          {triggerLabel}
        </Button>
      }
    >
      <PurchaseForm
        materials={materials}
        suppliers={suppliers}
        today={today}
        lockedMaterialId={lockedMaterialId}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
