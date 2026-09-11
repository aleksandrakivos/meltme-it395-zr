"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import { SupplierForm } from "./supplier-form";

type CreateSupplierSheetProps = {
  variant?: "default" | "outline";
};

export function CreateSupplierSheet({
  variant = "default",
}: CreateSupplierSheetProps = {}) {
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj dobavljača
        </Button>
      }
    >
      <CreateSupplierSheetInner variant={variant} />
    </SearchParamsBoundary>
  );
}

function CreateSupplierSheetInner({
  variant = "default",
}: CreateSupplierSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const primary = variant === "default";
  const open = primary ? openQuery : openLocal;
  const setOpen = primary ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Novi dobavljač"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj dobavljača
        </Button>
      }
    >
      <SupplierForm
        mode="create"
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
