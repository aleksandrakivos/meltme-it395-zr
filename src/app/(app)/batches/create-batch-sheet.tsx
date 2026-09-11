"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import { PlanBatchForm, type BatchProductOption } from "./plan-batch-form";

type CreateBatchSheetProps = {
  products: BatchProductOption[];
  variant?: "default" | "outline";
  openFromQuery?: boolean;
};

export function CreateBatchSheet(props: CreateBatchSheetProps) {
  const { products, variant = "default" } = props;
  if (products.length === 0) {
    return null;
  }
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Planiraj seriju
        </Button>
      }
    >
      <CreateBatchSheetInner {...props} />
    </SearchParamsBoundary>
  );
}

function CreateBatchSheetInner({
  products,
  variant = "default",
  openFromQuery = true,
}: CreateBatchSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const open = openFromQuery ? openQuery : openLocal;
  const setOpen = openFromQuery ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Nova proizvodna serija"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      className="sm:max-w-xl"
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Planiraj seriju
        </Button>
      }
    >
      <PlanBatchForm
        products={products}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
