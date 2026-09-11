"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomer, updateCustomer } from "@/actions/customers";
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
  customerCreateSchema,
  type CustomerCreateInput,
} from "@/lib/validation/customer";

type CustomerFormCallbacks = {
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

type CustomerFormProps = CustomerFormCallbacks &
  (
    | { mode: "create" }
    | {
        mode: "edit";
        customer: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
        };
      }
  );

export function CustomerForm({
  onDirtyChange,
  onSuccess,
  ...props
}: CustomerFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues:
      props.mode === "edit"
        ? {
            name: props.customer.name,
            email: props.customer.email ?? "",
            phone: props.customer.phone ?? "",
            address: props.customer.address ?? "",
          }
        : {
            name: "",
            email: "",
            phone: "",
            address: "",
          },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: CustomerCreateInput) {
    setFormError(null);
    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateCustomer({ ...values, id: props.customer.id })
          : await createCustomer(values);
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
              <FieldLabel htmlFor={`${id}-name`}>Ime</FieldLabel>
              <Input {...field} id={`${id}-name`} disabled={isPending} />
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
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-address`}>Adresa</FieldLabel>
              <Input {...field} id={`${id}-address`} disabled={isPending} />
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
