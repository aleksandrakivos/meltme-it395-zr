"use client";

import { useState } from "react";
import { FormSheet } from "@/components/form-sheet";
import { SearchParamsBoundary } from "@/components/search-params-boundary";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOpenFromQuery } from "@/hooks/use-open-from-query";
import { UserCreateForm } from "./new/user-create-form";

type CreateUserSheetProps = {
  variant?: "default" | "outline";
};

export function CreateUserSheet({
  variant = "default",
}: CreateUserSheetProps = {}) {
  return (
    <SearchParamsBoundary
      fallback={
        <Button type="button" variant={variant} disabled>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj korisnika
        </Button>
      }
    >
      <CreateUserSheetInner variant={variant} />
    </SearchParamsBoundary>
  );
}

function CreateUserSheetInner({ variant = "default" }: CreateUserSheetProps) {
  const [openLocal, setOpenLocal] = useState(false);
  const [openQuery, setOpenQuery] = useOpenFromQuery();
  const primary = variant === "default";
  const open = primary ? openQuery : openLocal;
  const setOpen = primary ? setOpenQuery : setOpenLocal;
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Novi korisnik"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant={variant}>
          <PlusIcon weight="bold" aria-hidden="true" data-icon="inline-start" />
          Dodaj korisnika
        </Button>
      }
    >
      <UserCreateForm
        onDirtyChange={setDirty}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
