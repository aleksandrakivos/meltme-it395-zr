"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XCircleIcon } from "@phosphor-icons/react";
import { cancelProductionBatch } from "@/actions/batches";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { formatRsd } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import { planCancellation } from "@/lib/services/batch-service";
import { cancelBatchSchema } from "@/lib/validation/batch";

export type CancelLine = {
  materialId: string;
  materialName: string;
  unitLabel: string;
  issuedQuantity: number;
  unitPrice: number;
  reservedQuantity: number;
};

type FormValues = {
  reason: string;
  lines: Array<{
    materialId: string;
    consumedQuantity: number;
    wasteQuantity: number;
  }>;
};

export function CancelBatchDialog({
  batchId,
  hint,
  mode,
  lines = [],
}: {
  batchId: string;
  hint: string;
  mode: "planned" | "started";
  lines?: CancelLine[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults: FormValues = useMemo(
    () => ({
      reason: "",
      lines: lines.map((l) => ({
        materialId: l.materialId,
        consumedQuantity: 0,
        wasteQuantity: 0,
      })),
    }),
    [lines],
  );

  const form = useForm<FormValues>({
    resolver:
      mode === "planned"
        ? (zodResolver(cancelBatchSchema.pick({ reason: true })) as never)
        : undefined,
    defaultValues: defaults,
  });
  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  useReportDirty(form.formState.isDirty, setDirty);

  const values = useWatch({ control: form.control });

  const preview = useMemo(() => {
    if (mode !== "started") return null;
    const report = (values?.lines ?? []).map((line) => ({
      materialId: line?.materialId ?? "",
      consumedQuantity: Number.isFinite(Number(line?.consumedQuantity))
        ? Number(line?.consumedQuantity)
        : 0,
      wasteQuantity: Number.isFinite(Number(line?.wasteQuantity))
        ? Number(line?.wasteQuantity)
        : 0,
    }));
    return planCancellation(
      "ZAPOCETA",
      lines.map((l) => ({
        materialId: l.materialId,
        materialName: l.materialName,
        reservedQuantity: l.reservedQuantity,
        issuedQuantity: l.issuedQuantity,
        unitPrice: l.unitPrice,
      })),
      report,
    );
  }, [lines, mode, values]);

  function onSubmit(formValues: FormValues) {
    startTransition(async () => {
      const result = await cancelProductionBatch(
        mode === "planned"
          ? { batchId, reason: formValues.reason }
          : {
              batchId,
              reason: formValues.reason,
              lines: formValues.lines,
            },
      );
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess("Serija je otkazana");
      form.reset(defaults);
      setOpen(false);
      router.refresh();
    });
  }

  const reasonOk = (values?.reason ?? "").trim().length >= 3;
  const submitDisabled =
    isPending ||
    (mode === "started" && (!preview?.ok || !reasonOk));

  return (
    <FormDialog
      title="Otkaži seriju"
      description={hint}
      dirty={dirty}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        form.reset(defaults);
        if (!next) setDirty(false);
      }}
      className={mode === "started" ? "sm:max-w-2xl" : undefined}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <XCircleIcon
            weight="duotone"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Otkaži seriju
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {mode === "started" ? (
          <div className="max-h-72 overflow-y-auto border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Sirovina</th>
                  <th className="px-2 py-2 text-right font-medium">Izdato</th>
                  <th className="px-2 py-2 text-right font-medium">Utrošeno</th>
                  <th className="px-2 py-2 text-right font-medium">Otpad</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const line = lines[index];
                  return (
                    <tr key={field.id} className="border-t">
                      <td className="px-2 py-2">{line.materialName}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {line.issuedQuantity} {line.unitLabel}
                      </td>
                      <td className="px-2 py-1">
                        <Controller
                          name={`lines.${index}.consumedQuantity`}
                          control={form.control}
                          render={({ field: input }) => (
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              className="h-8 text-right"
                              value={
                                Number.isFinite(input.value) ? input.value : ""
                              }
                              onChange={(e) =>
                                input.onChange(
                                  e.target.value === ""
                                    ? NaN
                                    : e.target.valueAsNumber,
                                )
                              }
                              disabled={isPending}
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Controller
                          name={`lines.${index}.wasteQuantity`}
                          control={form.control}
                          render={({ field: input }) => (
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              className="h-8 text-right"
                              value={
                                Number.isFinite(input.value) ? input.value : ""
                              }
                              onChange={(e) =>
                                input.onChange(
                                  e.target.value === ""
                                    ? NaN
                                    : e.target.valueAsNumber,
                                )
                              }
                              disabled={isPending}
                            />
                          )}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="cancel-reason">Razlog otkazivanja</FieldLabel>
              <Input
                {...field}
                id="cancel-reason"
                placeholder="npr. Pukla je serija teglica"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        {mode === "started" && preview ? (
          <div className="space-y-1 border p-3 text-xs">
            {preview.ok ? (
              <>
                <p>
                  Otpisano (utrošak + otpad):{" "}
                  {formatRsd(preview.writtenOffCost)}
                </p>
                <p>
                  Povraćaj na zalihe:{" "}
                  {preview.lines
                    .filter((l) => l.returnToStock > 0)
                    .map((l) => `${l.materialName} ${l.returnToStock}`)
                    .join(", ") || "—"}
                </p>
                <p className="text-muted-foreground">
                  Gotovi proizvodi se ne knjiže. Za ispravne komade završite
                  seriju ili je označite kao u toku.
                </p>
                {preview.warnings.map((warning) => (
                  <p key={warning} className="text-muted-foreground">
                    {warning}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-destructive">{preview.error}</p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="destructive"
            disabled={submitDisabled}
          >
            {isPending ? "…" : "Otkaži seriju"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
