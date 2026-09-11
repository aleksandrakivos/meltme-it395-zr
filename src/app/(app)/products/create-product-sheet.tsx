"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import {
  ProductForm,
  type ProductMaterialOption,
} from "./product-form";

type CreateProductSheetProps = {
  waxOptions: ProductMaterialOption[];
  scentOptions: ProductMaterialOption[];
  variant?: "default" | "outline";
};

export function CreateProductSheet({
  waxOptions,
  scentOptions,
  variant = "default",
}: CreateProductSheetProps) {
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj proizvod
        </Button>
      }
    >
      <CreateProductSheetInner
        waxOptions={waxOptions}
        scentOptions={scentOptions}
        variant={variant}
      />
    </SearchParamsBoundary>
  );
}

function CreateProductSheetInner({
  waxOptions,
  scentOptions,
  variant = "default",
}: CreateProductSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const primary = variant === "default";
  const open = primary ? openQuery : openLocal;
  const setOpen = primary ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Novi proizvod"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj proizvod
        </Button>
      }
    >
      <ProductForm
        mode="create"
        waxOptions={waxOptions}
        scentOptions={scentOptions}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
