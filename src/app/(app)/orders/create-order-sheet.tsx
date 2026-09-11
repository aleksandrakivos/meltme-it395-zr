"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import {
  NewOrderForm,
  type CustomerOption,
  type ProductOption,
} from "./new/new-order-form";

type CreateOrderSheetProps = {
  customers: CustomerOption[];
  products: ProductOption[];
  variant?: "default" | "outline";
  openFromQuery?: boolean;
};

export function CreateOrderSheet(props: CreateOrderSheetProps) {
  const { variant = "default" } = props;
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Nova porudžbina
        </Button>
      }
    >
      <CreateOrderSheetInner {...props} />
    </SearchParamsBoundary>
  );
}

function CreateOrderSheetInner({
  customers,
  products,
  variant = "default",
  openFromQuery = true,
}: CreateOrderSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const open = openFromQuery ? openQuery : openLocal;
  const setOpen = openFromQuery ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Nova porudžbina"
      description="Dodajte stavke; proizvodi se rezervišu odmah po kreiranju."
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      className="sm:max-w-xl"
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Nova porudžbina
        </Button>
      }
    >
      <NewOrderForm
        customers={customers}
        products={products}
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
