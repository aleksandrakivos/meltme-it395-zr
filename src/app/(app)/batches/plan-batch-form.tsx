"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planProductionBatch } from "@/actions/batches";
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
import { formatRsd } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import { previewBatchRequirements } from "@/lib/services/batch-service";
import { planBatchSchema, type PlanBatchInput } from "@/lib/validation/batch";

export type BatchProductOption = {
  id: string;
  name: string;
  recipe: Array<{
    materialId: string;
    materialName: string;
    quantityPerUnit: number;
    stock: number;
    reserved: number;
    avgPurchasePrice: number;
  }>;
};

type PlanBatchFormProps = {
  products: BatchProductOption[];
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

export function PlanBatchForm({
  products,
  onDirtyChange,
  onSuccess,
}: PlanBatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PlanBatchInput>({
    resolver: zodResolver(planBatchSchema) as never,
    defaultValues: { productId: "", plannedQuantity: 1, note: "" },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  const productId = useWatch({ control: form.control, name: "productId" });
  const plannedQuantity = useWatch({
    control: form.control,
    name: "plannedQuantity",
  });

  const selected = products.find((p) => p.id === productId);
  const preview = useMemo(() => {
    if (
      !selected ||
      !Number.isFinite(plannedQuantity) ||
      plannedQuantity <= 0
    ) {
      return [];
    }
    return previewBatchRequirements(selected.recipe, plannedQuantity);
  }, [selected, plannedQuantity]);

  const allSufficient =
    preview.length > 0 && preview.every((line) => line.sufficient);

  function onSubmit(values: PlanBatchInput) {
    startTransition(async () => {
      const result = await planProductionBatch(values);
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess("Serija je planirana", "Sirovine su rezervisane");
      form.reset({ productId: "", plannedQuantity: 1, note: "" });
      onSuccess?.();
      router.push(`/batches/${result.data.batchId}`);
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <FieldGroup>
        <Controller
          name="productId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Proizvod</FieldLabel>
              <Select
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? "")}
                disabled={isPending}
                items={products.map((p) => ({ value: p.id, label: p.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Izaberite proizvod sa recepturom" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
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
          name="plannedQuantity"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="batch-qty">Planirano komada</FieldLabel>
              <Input
                id="batch-qty"
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
        <Controller
          name="note"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="batch-note">Napomena (opciono)</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="batch-note"
                disabled={isPending}
              />
            </Field>
          )}
        />
      </FieldGroup>

      {selected ? (
        <div className="overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Sirovina</th>
                <th className="px-3 py-2 text-right font-medium">
                  Rezerviši
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Raspoloživo
                </th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Unesite broj komada
                  </td>
                </tr>
              ) : (
                preview.map((line) => (
                  <tr key={line.materialId} className="border-t">
                    <td className="px-3 py-2">{line.materialName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.available}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {line.sufficient ? (
                        <span className="text-muted-foreground">OK</span>
                      ) : (
                        <span className="text-destructive">Nedovoljno</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {preview.length > 0 ? (
            <p className="border-t px-3 py-2 text-sm text-muted-foreground">
              Planski trošak serije:{" "}
              {formatRsd(
                preview.reduce(
                  (sum, line) => sum + line.quantity * line.unitPrice,
                  0
                )
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Planiranje samo rezerviše sirovine — stanje se menja tek kada se serija
        započne.
      </p>

      <Button type="submit" disabled={isPending || !allSufficient}>
        {isPending ? "Planiranje…" : "Planiraj seriju"}
      </Button>
    </form>
  );
}
