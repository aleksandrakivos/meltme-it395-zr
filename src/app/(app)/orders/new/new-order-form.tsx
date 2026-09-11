"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/section-title";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
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
import { formatRsd } from "@/lib/labels";
import { notifyError } from "@/lib/notify";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "@/lib/validation/order";

export type CustomerOption = { id: string; name: string };
export type ProductOption = {
  id: string;
  name: string;
  /** stock − reserved: jedino što se sme obećati kupcu */
  available: number;
  sellingPrice: number;
};

const addItemSchema = z.object({
  productId: z.string().min(1, "Izaberite proizvod"),
  quantity: z
    .number({ error: "Unesite količinu" })
    .int("Količina mora biti ceo broj")
    .positive("Količina mora biti veća od nule"),
});

type AddItemInput = z.infer<typeof addItemSchema>;

type NewOrderFormProps = {
  customers: CustomerOption[];
  products: ProductOption[];
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

export function NewOrderForm({
  customers,
  products,
  onDirtyChange,
  onSuccess,
}: NewOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: "",
      items: [],
    },
  });

  const addForm = useForm<AddItemInput>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const isDirty = form.formState.isDirty || addForm.formState.isDirty;
  useReportDirty(isDirty, onDirtyChange);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const availableProducts = products.filter(
    (p) => !items.some((item) => item.productId === p.id)
  );

  const total = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    if (!product) return sum;
    return sum + product.sellingPrice * item.quantity;
  }, 0);

  function onAddItem(values: AddItemInput) {
    const product = productMap.get(values.productId);
    if (!product) {
      notifyError("Proizvod nije pronađen");
      return;
    }
    if (values.quantity > product.available) {
      notifyError(
        `Nedovoljno raspoloživo: ${product.name} (traženo ${values.quantity}, raspoloživo ${product.available})`
      );
      return;
    }
    append({ productId: values.productId, quantity: values.quantity });
    addForm.reset({ productId: "", quantity: 1 });
  }

  function onSubmit(values: CreateOrderInput) {
    startTransition(async () => {
      const result = await createOrder(values);
      if (result && !result.ok) {
        notifyError(result.error);
        return;
      }
      form.reset({ customerId: "", items: [] });
      addForm.reset({ productId: "", quantity: 1 });
      onSuccess?.();
      router.refresh();
    });
  }

  useEffect(() => {
    form.clearErrors("items");
  }, [fields.length, form]);

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <FieldGroup>
        <Controller
          name="customerId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Kupac</FieldLabel>
              <Select
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
                disabled={isPending}
                items={customers.map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Izaberite kupca" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Proizvod</AppTableHead>
            <AppTableHead align="right">Količina</AppTableHead>
            <AppTableHead align="right">Cena</AppTableHead>
            <AppTableHead align="right">Iznos</AppTableHead>
            <AppTableHead />
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {fields.length === 0 ? (
            <AppTableRow>
              <AppTableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                Još nema stavki
              </AppTableCell>
            </AppTableRow>
          ) : (
            fields.map((field, index) => {
              const item = items[index];
              const product = item ? productMap.get(item.productId) : undefined;
              const price = product?.sellingPrice ?? 0;
              const qty = item?.quantity ?? 0;
              return (
                <AppTableRow key={field.id}>
                  <AppTableCell>{product?.name ?? "—"}</AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {qty}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {formatRsd(price)}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {formatRsd(price * qty)}
                  </AppTableCell>
                  <AppTableCell align="right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => remove(index)}
                    >
                      Ukloni
                    </Button>
                  </AppTableCell>
                </AppTableRow>
              );
            })
          )}
        </AppTableBody>
      </AppTable>
      {form.formState.errors.items?.message ||
      form.formState.errors.items?.root?.message ? (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.items?.message ??
            form.formState.errors.items?.root?.message}
        </p>
      ) : null}

      <div className="space-y-3 border p-4">
        <SectionTitle>Dodaj stavku</SectionTitle>
        <FieldGroup>
          <Controller
            name="productId"
            control={addForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Proizvod</FieldLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  disabled={isPending || availableProducts.length === 0}
                  items={availableProducts.map((p) => ({
                    value: p.id,
                    label: `${p.name} (raspoloživo: ${p.available})`,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Izaberite proizvod" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (raspoloživo: {p.available})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            name="quantity"
            control={addForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="order-qty">Količina</FieldLabel>
                <Input
                  id="order-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={Number.isFinite(field.value) ? field.value : ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber
                    )
                  }
                  disabled={isPending}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={addForm.handleSubmit(onAddItem)}
          >
            Dodaj u porudžbinu
          </Button>
        </FieldGroup>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <p className="font-heading text-lg font-semibold tabular-nums">
          Ukupno: {formatRsd(total)}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kreiranje…" : "Kreiraj porudžbinu"}
        </Button>
      </div>
    </form>
  );
}
