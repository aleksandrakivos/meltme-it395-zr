"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialType, Unit } from "@prisma/client";
import { createMaterial, updateMaterial } from "@/actions/materials";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { materialTypeLabel, unitLabel } from "@/lib/labels";
import {
  materialCreateSchema,
  type MaterialCreateInput,
} from "@/lib/validation/material";

const TYPES = Object.values(MaterialType);
const UNITS = Object.values(Unit);

type SupplierOption = { id: string; name: string };

type MaterialFormCallbacks = {
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

type MaterialFormProps = MaterialFormCallbacks &
  (
    | {
        mode: "create";
        suppliers: SupplierOption[];
      }
    | {
        mode: "edit";
        suppliers: SupplierOption[];
        material: {
          id: string;
          name: string;
          type: MaterialType;
          unit: Unit;
          minStock: number;
          supplierId: string | null;
        };
      }
  );

export function MaterialForm({
  onDirtyChange,
  onSuccess,
  ...props
}: MaterialFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<MaterialCreateInput>({
    resolver: zodResolver(materialCreateSchema),
    defaultValues:
      props.mode === "edit"
        ? {
            name: props.material.name,
            type: props.material.type,
            unit: props.material.unit,
            minStock: props.material.minStock,
            supplierId: props.material.supplierId ?? "",
          }
        : {
            name: "",
            type: MaterialType.VOSAK,
            unit: Unit.G,
            minStock: 0,
            supplierId: "",
          },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: MaterialCreateInput) {
    setFormError(null);
    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateMaterial({
              id: props.material.id,
              name: values.name,
              type: values.type,
              unit: values.unit,
              minStock: values.minStock,
              supplierId: values.supplierId,
            })
          : await createMaterial(values);
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
          name="type"
          control={form.control}
          render={({ field }) => {
            const typeItems = TYPES.map((type) => ({
              value: type,
              label: materialTypeLabel(type),
            }));
            return (
              <Field>
                <FieldLabel>Tip</FieldLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={typeItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        />
        <Controller
          name="unit"
          control={form.control}
          render={({ field }) => {
            const unitItems = UNITS.map((unit) => ({
              value: unit,
              label: unitLabel(unit),
            }));
            return (
              <Field>
                <FieldLabel>Jedinica</FieldLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={unitItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        />
        <Controller
          name="minStock"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-min`}>Minimalna zaliha</FieldLabel>
              <Input
                {...field}
                id={`${id}-min`}
                type="number"
                step="any"
                disabled={isPending}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="supplierId"
          control={form.control}
          render={({ field }) => {
            const supplierItems = [
              { value: "__none__", label: "— bez dobavljača —" },
              ...props.suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
              })),
            ];
            return (
              <Field>
                <FieldLabel>Dobavljač</FieldLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) =>
                    field.onChange(value === "__none__" ? "" : value)
                  }
                  disabled={isPending}
                  items={supplierItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          Stanje i prosečna nabavna cena se ne unose ovde — u sistem ulaze
          isključivo kroz nabavku ili korekciju zaliha.
        </p>
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
