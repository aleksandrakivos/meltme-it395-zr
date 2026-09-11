"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupplier, updateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import {
  supplierCreateSchema,
  type SupplierCreateInput,
} from "@/lib/validation/supplier";

type SupplierFormCallbacks = {
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

type SupplierFormProps = SupplierFormCallbacks &
  (
    | { mode: "create" }
    | {
        mode: "edit";
        supplier: {
          id: string;
          name: string;
          contact: string | null;
          phone: string | null;
          email: string | null;
        };
      }
  );

export function SupplierForm({
  onDirtyChange,
  onSuccess,
  ...props
}: SupplierFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SupplierCreateInput>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues:
      props.mode === "edit"
        ? {
            name: props.supplier.name,
            contact: props.supplier.contact ?? "",
            phone: props.supplier.phone ?? "",
            email: props.supplier.email ?? "",
          }
        : {
            name: "",
            contact: "",
            phone: "",
            email: "",
          },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: SupplierCreateInput) {
    setFormError(null);
    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateSupplier({ ...values, id: props.supplier.id })
          : await createSupplier(values);
      if (result && !result.ok) {
        setFormError(result.error);
        return;
      }
      if (result?.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-4"
      noValidate
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-name`}>Naziv</FieldLabel>
              <Input {...field} id={`${id}-name`} disabled={isPending} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="contact"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-contact`}>Kontakt osoba</FieldLabel>
              <Input {...field} id={`${id}-contact`} disabled={isPending} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-phone`}>Telefon</FieldLabel>
              <Input {...field} id={`${id}-phone`} disabled={isPending} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
              <Input
                {...field}
                id={`${id}-email`}
                type="email"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje…" : "Sačuvaj"}
        </Button>
      </FieldGroup>
    </form>
  );
}
