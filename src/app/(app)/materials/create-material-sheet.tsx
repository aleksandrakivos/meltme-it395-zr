"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import { MaterialForm } from "./material-form";

type SupplierOption = { id: string; name: string };

type CreateMaterialSheetProps = {
  suppliers: SupplierOption[];
  variant?: "default" | "outline";
};

export function CreateMaterialSheet({
  suppliers,
  variant = "default",
}: CreateMaterialSheetProps) {
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj sirovinu
        </Button>
      }
    >
      <CreateMaterialSheetInner suppliers={suppliers} variant={variant} />
    </SearchParamsBoundary>
  );
}

function CreateMaterialSheetInner({
  suppliers,
  variant = "default",
}: CreateMaterialSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const primary = variant === "default";
  const open = primary ? openQuery : openLocal;
  const setOpen = primary ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Nova sirovina"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj sirovinu
        </Button>
      }
    >
      <MaterialForm
        mode="create"
        suppliers={suppliers}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
