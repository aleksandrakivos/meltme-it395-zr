"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import { CustomerForm } from "./customer-form";

type CreateCustomerSheetProps = {
  variant?: "default" | "outline";
};

export function CreateCustomerSheet({
  variant = "default",
}: CreateCustomerSheetProps = {}) {
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj kupca
        </Button>
      }
    >
      <CreateCustomerSheetInner variant={variant} />
    </SearchParamsBoundary>
  );
}

function CreateCustomerSheetInner({
  variant = "default",
}: CreateCustomerSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const primary = variant === "default";
  const open = primary ? openQuery : openLocal;
  const setOpen = primary ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Novi kupac"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj kupca
        </Button>
      }
    >
      <CustomerForm
        mode="create"
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
