"use client";

import { useMemo, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { recordPurchaseDocument } from "@/actions/purchases";
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
  formatRsd,
  formatUnitPrice,
  fromDisplayPrice,
  fromDisplayQuantity,
  priceUnitLabel,
  quantityUnitLabel,
  toDisplayQuantity,
} from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  purchaseTotalCost,
  weightedAveragePrice,
} from "@/lib/services/material-costing";
import { cn } from "@/lib/utils";
import type { Unit } from "@prisma/client";

export type PurchaseMaterialOption = {
  id: string;
  name: string;
  unit: Unit;
  stock: number;
  avgPurchasePrice: number;
  /** Katalog dobavljač; null = nije dodeljen. */
  supplierId: string | null;
};

export type PurchaseSupplierOption = { id: string; name: string };

/**
 * Forma radi sa količinom i cenom po PRAKTIČNOJ jedinici (kg / l / kom,
 * RSD/kg, RSD/l, RSD/kom); pre slanja se konvertuju u g / ml / kom koje
 * sistem čuva.
 */
const lineFormSchema = z.object({
  materialId: z.string().min(1, "Izaberite sirovinu"),
  quantity: z
    .number({ error: "Unesite količinu" })
    .positive("Količina mora biti veća od nule"),
  displayPrice: z
    .number({ error: "Unesite nabavnu cenu" })
    .nonnegative("Cena ne može biti negativna"),
});

const documentFormSchema = z
  .object({
    supplierId: z.string(),
    purchasedAt: z.string().min(1, "Unesite datum nabavke"),
    documentNo: z.string().trim().max(64, "Najviše 64 karaktera"),
    note: z.string().trim().max(500, "Najviše 500 karaktera"),
    lines: z.array(lineFormSchema).min(1, "Dodajte najmanje jednu stavku"),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.lines.forEach((line, index) => {
      if (line.materialId && seen.has(line.materialId)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "materialId"],
          message: "Ista sirovina je već u dokumentu",
        });
      }
      seen.add(line.materialId);
    });
  });

type PurchaseFormValues = z.infer<typeof documentFormSchema>;

type PurchaseFormProps = {
  materials: PurchaseMaterialOption[];
  suppliers: PurchaseSupplierOption[];
  today: string;
  /** Otvoreno sa detalja sirovine: jedna, zaključana stavka. */
  lockedMaterialId?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

function emptyLine(materialId = ""): PurchaseFormValues["lines"][number] {
  return { materialId, quantity: NaN, displayPrice: NaN };
}

export function PurchaseForm({
  materials,
  suppliers,
  today,
  lockedMaterialId,
  onDirtyChange,
  onSuccess,
}: PurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues: PurchaseFormValues = useMemo(
    () => ({
      supplierId: "",
      purchasedAt: today,
      documentNo: "",
      note: "",
      lines: [emptyLine(lockedMaterialId ?? "")],
    }),
    [lockedMaterialId, today],
  );

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  const selectedSupplierId =
    useWatch({ control: form.control, name: "supplierId" }) ?? "";
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const materialMap = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  const materialsForSupplier = useMemo(() => {
    if (!selectedSupplierId) return materials;
    return materials.filter(
      (m) => m.supplierId === selectedSupplierId || m.supplierId == null,
    );
  }, [materials, selectedSupplierId]);

  function clearLinesNotMatchingSupplier(supplierId: string) {
    const allowed = new Set(
      (supplierId
        ? materials.filter(
            (m) => m.supplierId === supplierId || m.supplierId == null,
          )
        : materials
      ).map((m) => m.id),
    );
    const current = form.getValues("lines");
    current.forEach((line, index) => {
      if (line.materialId && !allowed.has(line.materialId)) {
        form.setValue(`lines.${index}.materialId`, "", {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  }

  const previews = lines.map((line) => {
    const material = line?.materialId
      ? materialMap.get(line.materialId)
      : undefined;
    if (
      !material ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      !Number.isFinite(line.displayPrice) ||
      line.displayPrice < 0
    ) {
      return { material, total: 0, newStock: null, newAvg: null };
    }
    const storedPrice = fromDisplayPrice(line.displayPrice, material.unit);
    const storedQty = fromDisplayQuantity(line.quantity, material.unit);
    return {
      material,
      total: purchaseTotalCost(storedQty, storedPrice),
      newStock: material.stock + storedQty,
      newAvg: weightedAveragePrice(
        material.stock,
        material.avgPurchasePrice,
        storedQty,
        storedPrice,
      ),
    };
  });
  const documentTotal = previews.reduce((sum, p) => sum + p.total, 0);

  function onSubmit(values: PurchaseFormValues) {
    startTransition(async () => {
      const result = await recordPurchaseDocument({
        supplierId: values.supplierId,
        purchasedAt: values.purchasedAt,
        documentNo: values.documentNo,
        note: values.note,
        lines: values.lines.map((line) => {
          const material = materialMap.get(line.materialId);
          return {
            materialId: line.materialId,
            quantity: material
              ? fromDisplayQuantity(line.quantity, material.unit)
              : line.quantity,
            unitPrice: material
              ? fromDisplayPrice(line.displayPrice, material.unit)
              : line.displayPrice,
          };
        }),
      });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess(
        values.lines.length === 1
          ? "Nabavka je evidentirana"
          : `Nabavka je evidentirana (${values.lines.length} stavke)`,
      );
      form.reset(defaultValues);
      onSuccess?.();
      router.refresh();
    });
  }

  const supplierItems = [
    { value: "__none__", label: "— bez dobavljača —" },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ];

  const usedMaterialIds = new Set(lines.map((l) => l?.materialId));
  const canAddLine =
    !lockedMaterialId && usedMaterialIds.size < materialsForSupplier.length;

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="supplierId"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel id="purchase-supplier-label">Dobavljač</FieldLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) => {
                    const next =
                      !value || value === "__none__" ? "" : value;
                    field.onChange(next);
                    if (!lockedMaterialId) {
                      clearLinesNotMatchingSupplier(next);
                    }
                  }}
                  disabled={isPending}
                  items={supplierItems}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-labelledby="purchase-supplier-label"
                  >
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
            )}
          />

          <Controller
            name="purchasedAt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="purchase-date">Datum nabavke</FieldLabel>
                <Input
                  {...field}
                  id="purchase-date"
                  type="date"
                  disabled={isPending}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="documentNo"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="purchase-doc">
                  Broj dokumenta (opciono)
                </FieldLabel>
                <Input
                  {...field}
                  id="purchase-doc"
                  placeholder="npr. OT-2026-14"
                  autoComplete="off"
                  disabled={isPending}
                />
              </Field>
            )}
          />

          <Controller
            name="note"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="purchase-note">
                  Napomena (opciono)
                </FieldLabel>
                <Input
                  {...field}
                  id="purchase-note"
                  autoComplete="off"
                  disabled={isPending}
                />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Stavke
        </p>

        {fields.map((fieldItem, index) => {
          const preview = previews[index];
          const material = preview?.material;
          const usedElsewhere = new Set(
            lines
              .filter((_, i) => i !== index)
              .map((l) => l?.materialId)
              .filter(Boolean),
          );
          const materialItems = materialsForSupplier
            .filter((m) => !usedElsewhere.has(m.id))
            .map((m) => ({ value: m.id, label: m.name }));

          return (
            <div
              key={fieldItem.id}
              className="space-y-3 border bg-wax-cream/30 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  Stavka {index + 1}
                </span>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ukloni stavku ${index + 1}`}
                    disabled={isPending}
                    onClick={() => remove(index)}
                  >
                    <TrashIcon weight="duotone" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>

              {lockedMaterialId ? (
                <p className="text-sm font-medium">{material?.name}</p>
              ) : (
                <Controller
                  name={`lines.${index}.materialId`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel id={`purchase-material-label-${index}`}>
                        Sirovina
                      </FieldLabel>
                      {materialItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground" role="status">
                          Nema sirovina za izabranog dobavljača.
                        </p>
                      ) : (
                        <Select
                          value={field.value || null}
                          onValueChange={(value) => field.onChange(value ?? "")}
                          disabled={isPending}
                          items={materialItems}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-labelledby={`purchase-material-label-${index}`}
                          >
                            <SelectValue placeholder="Izaberite sirovinu" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : null}
                    </Field>
                  )}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Controller
                  name={`lines.${index}.quantity`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`purchase-qty-${index}`}>
                        Količina
                        {material ? ` (${quantityUnitLabel(material.unit)})` : ""}
                      </FieldLabel>
                      <Input
                        id={`purchase-qty-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? NaN
                              : e.target.valueAsNumber,
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

                <Controller
                  name={`lines.${index}.displayPrice`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`purchase-price-${index}`}>
                        Nabavna cena
                        {material ? ` (${priceUnitLabel(material.unit)})` : ""}
                      </FieldLabel>
                      <Input
                        id={`purchase-price-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? NaN
                              : e.target.valueAsNumber,
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
              </div>

              {material ? (
                <p className="text-xs text-muted-foreground">
                  Stanje {toDisplayQuantity(material.stock, material.unit)} →{" "}
                  <span
                    className={cn(
                      preview.newStock !== null && "text-foreground",
                    )}
                  >
                    {preview.newStock !== null
                      ? toDisplayQuantity(preview.newStock, material.unit)
                      : "—"}
                  </span>{" "}
                  {quantityUnitLabel(material.unit)} · prosek{" "}
                  {material.avgPurchasePrice > 0
                    ? formatUnitPrice(material.avgPurchasePrice, material.unit)
                    : "—"}{" "}
                  →{" "}
                  <span
                    className={cn(
                      preview.newAvg !== null && "font-medium text-foreground",
                    )}
                  >
                    {preview.newAvg !== null
                      ? formatUnitPrice(preview.newAvg, material.unit)
                      : "—"}
                  </span>
                  {preview.total > 0
                    ? ` · vrednost ${formatRsd(preview.total)}`
                    : ""}
                </p>
              ) : null}
            </div>
          );
        })}

        {form.formState.errors.lines?.message ||
        form.formState.errors.lines?.root?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.lines?.message ??
              form.formState.errors.lines?.root?.message}
          </p>
        ) : null}

        {canAddLine ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => append(emptyLine())}
          >
            <PlusIcon
              weight="bold"
              aria-hidden="true"
              data-icon="inline-start"
            />
            Dodaj stavku
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <p className="font-heading text-lg font-semibold tabular-nums">
          Ukupno: {formatRsd(documentTotal)}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Evidentiranje…" : "Evidentiraj nabavku"}
        </Button>
      </div>
    </form>
  );
}
