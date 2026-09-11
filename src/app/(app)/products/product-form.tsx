"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProduct, updateProduct } from "@/actions/products";
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
import {
  productCreateSchema,
  type ProductCreateInput,
} from "@/lib/validation/product";

const MANUAL_VALUE = "__manual__";

export type ProductMaterialOption = { id: string; name: string };

type ProductFormCallbacks = {
  waxOptions: ProductMaterialOption[];
  scentOptions: ProductMaterialOption[];
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

type ProductFormProps = ProductFormCallbacks &
  (
    | { mode: "create" }
    | {
        mode: "edit";
        product: {
          id: string;
          name: string;
          waxType: string;
          scent: string | null;
          size: string;
          sellingPrice: number;
        };
      }
  );

function initialSelectMode(
  value: string,
  options: ProductMaterialOption[],
): "select" | "manual" {
  if (!value) return "select";
  return options.some((o) => o.name === value) ? "select" : "manual";
}

export function ProductForm({
  waxOptions,
  scentOptions,
  onDirtyChange,
  onSuccess,
  ...props
}: ProductFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialWax =
    props.mode === "edit" ? props.product.waxType : "";
  const initialScent =
    props.mode === "edit" ? (props.product.scent ?? "") : "";

  const [waxMode, setWaxMode] = useState<"select" | "manual">(() =>
    initialSelectMode(initialWax, waxOptions),
  );
  const [scentMode, setScentMode] = useState<"select" | "manual">(() =>
    initialSelectMode(initialScent, scentOptions),
  );

  const form = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues:
      props.mode === "edit"
        ? {
            name: props.product.name,
            waxType: props.product.waxType,
            scent: props.product.scent ?? "",
            size: props.product.size,
            sellingPrice: props.product.sellingPrice,
            stock: 0,
          }
        : {
            name: "",
            waxType: "",
            scent: "",
            size: "",
            sellingPrice: 0,
            stock: 0,
          },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  const waxSelectItems = useMemo(
    () => [
      ...waxOptions.map((o) => ({ value: o.name, label: o.name })),
      { value: MANUAL_VALUE, label: "Unesi ručno" },
    ],
    [waxOptions],
  );

  const scentSelectItems = useMemo(
    () => [
      ...scentOptions.map((o) => ({ value: o.name, label: o.name })),
      { value: MANUAL_VALUE, label: "Unesi ručno" },
    ],
    [scentOptions],
  );

  function onSubmit(values: ProductCreateInput) {
    setFormError(null);
    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateProduct({
              id: props.product.id,
              name: values.name,
              waxType: values.waxType,
              scent: values.scent,
              size: values.size,
              sellingPrice: values.sellingPrice,
            })
          : await createProduct(values);
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
          name="waxType"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id={`${id}-wax-label`}>Tip voska</FieldLabel>
              <Select
                value={waxMode === "manual" ? MANUAL_VALUE : field.value || null}
                onValueChange={(value) => {
                  if (value === MANUAL_VALUE) {
                    setWaxMode("manual");
                    if (waxOptions.some((o) => o.name === field.value)) {
                      field.onChange("");
                    }
                    return;
                  }
                  setWaxMode("select");
                  field.onChange(value ?? "");
                }}
                disabled={isPending}
                items={waxSelectItems}
              >
                <SelectTrigger
                  className="w-full"
                  aria-labelledby={`${id}-wax-label`}
                >
                  <SelectValue placeholder="Izaberite tip voska" />
                </SelectTrigger>
                <SelectContent>
                  {waxSelectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {waxMode === "manual" ? (
                <Input
                  {...field}
                  id={`${id}-wax`}
                  className="mt-2"
                  placeholder="Unesite tip voska"
                  disabled={isPending}
                />
              ) : null}
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="scent"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id={`${id}-scent-label`}>Miris</FieldLabel>
              <Select
                value={
                  scentMode === "manual"
                    ? MANUAL_VALUE
                    : field.value
                      ? field.value
                      : null
                }
                onValueChange={(value) => {
                  if (value === MANUAL_VALUE) {
                    setScentMode("manual");
                    if (scentOptions.some((o) => o.name === field.value)) {
                      field.onChange("");
                    }
                    return;
                  }
                  setScentMode("select");
                  field.onChange(value ?? "");
                }}
                disabled={isPending}
                items={scentSelectItems}
              >
                <SelectTrigger
                  className="w-full"
                  aria-labelledby={`${id}-scent-label`}
                >
                  <SelectValue placeholder="Izaberite miris (opciono)" />
                </SelectTrigger>
                <SelectContent>
                  {scentSelectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scentMode === "manual" ? (
                <Input
                  {...field}
                  id={`${id}-scent`}
                  className="mt-2"
                  placeholder="Unesite miris"
                  disabled={isPending}
                />
              ) : null}
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="size"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-size`}>Veličina (g)</FieldLabel>
              <Input
                {...field}
                id={`${id}-size`}
                inputMode="numeric"
                placeholder="npr. 200"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="sellingPrice"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-price`}>Prodajna cena</FieldLabel>
              <Input
                id={`${id}-price`}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={Number.isFinite(field.value) ? field.value : ""}
                disabled={isPending}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? NaN : e.target.valueAsNumber,
                  )
                }
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        {props.mode === "create" ? (
          <Controller
            name="stock"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-stock`}>Početno stanje</FieldLabel>
                <Input
                  id={`${id}-stock`}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  value={Number.isFinite(field.value) ? field.value : ""}
                  disabled={isPending}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber,
                    )
                  }
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        ) : null}
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
