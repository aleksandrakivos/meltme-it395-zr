"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { completeProductionBatch } from "@/actions/batches";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { batchStatusLabel, formatRsd } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import { planCompletion } from "@/lib/services/batch-service";

export type CompleteLine = {
  materialId: string;
  materialName: string;
  unitLabel: string;
  plannedQuantity: number;
  issuedQuantity: number;
  unitPrice: number;
};

type FormValues = {
  producedQuantity: number;
  scrapQuantity: number;
  note: string;
  lines: Array<{
    materialId: string;
    consumedQuantity: number;
    wasteQuantity: number;
  }>;
};

export function CompleteBatchDialog({
  batchId,
  plannedQuantity,
  lines,
  variant = "default",
}: {
  batchId: string;
  plannedQuantity: number;
  lines: CompleteLine[];
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults: FormValues = {
    producedQuantity: plannedQuantity,
    scrapQuantity: 0,
    note: "",
    lines: lines.map((l) => ({
      materialId: l.materialId,
      consumedQuantity: l.issuedQuantity,
      wasteQuantity: 0,
    })),
  };

  const form = useForm<FormValues>({ defaultValues: defaults });
  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  useReportDirty(form.formState.isDirty, setDirty);

  const values = useWatch({ control: form.control });

  const preview = useMemo(() => {
    const produced = Number(values?.producedQuantity);
    const scrap = Number(values?.scrapQuantity);
    const report = (values?.lines ?? []).map((line) => ({
      materialId: line?.materialId ?? "",
      consumedQuantity: Number.isFinite(Number(line?.consumedQuantity))
        ? Number(line?.consumedQuantity)
        : 0,
      wasteQuantity: Number.isFinite(Number(line?.wasteQuantity))
        ? Number(line?.wasteQuantity)
        : 0,
    }));
    return planCompletion(
      lines,
      report,
      Number.isFinite(produced) ? produced : NaN,
      Number.isFinite(scrap) ? scrap : NaN,
      plannedQuantity,
    );
  }, [lines, plannedQuantity, values]);

  function onSubmit(formValues: FormValues) {
    startTransition(async () => {
      const result = await completeProductionBatch({
        batchId,
        producedQuantity: formValues.producedQuantity,
        scrapQuantity: formValues.scrapQuantity,
        note: formValues.note,
        lines: formValues.lines,
      });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess("Serija je završena");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <FormDialog
      title="Završi seriju"
      description="Ispravni komadi ulaze na stanje proizvoda. Utrošak po sirovini mora biti najmanje srazmeran receptu za proizvedenu količinu; višak iznad toga (ako je izdat) vraća se na zalihe, otpad ostaje u trošku serije."
      dirty={dirty}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
      className="sm:max-w-2xl"
      trigger={
        <Button type="button" size="sm" variant={variant}>
          <CheckCircleIcon
            weight="duotone"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Završi seriju
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="producedQuantity"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="complete-produced">
                  Ispravnih komada
                </FieldLabel>
                <Input
                  id="complete-produced"
                  type="number"
                  min="0"
                  step="1"
                  value={Number.isFinite(field.value) ? field.value : ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber
                    )
                  }
                  disabled={isPending}
                />
              </Field>
            )}
          />
          <Controller
            name="scrapQuantity"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="complete-scrap">Škart (komada)</FieldLabel>
                <Input
                  id="complete-scrap"
                  type="number"
                  min="0"
                  step="1"
                  value={Number.isFinite(field.value) ? field.value : ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber
                    )
                  }
                  disabled={isPending}
                />
              </Field>
            )}
          />
        </div>

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
                                  : e.target.valueAsNumber
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
                                  : e.target.valueAsNumber
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

        <Controller
          name="note"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="complete-note">
                Napomena (opciono)
              </FieldLabel>
              <Input {...field} id="complete-note" disabled={isPending} />
            </Field>
          )}
        />

        <div className="space-y-1 border p-3 text-xs">
          {preview.ok ? (
            <>
              <p>Trošak serije: {formatRsd(preview.batchCost)}</p>
              <p>
                Stvarna cena koštanja po komadu:{" "}
                {preview.actualUnitCost === null
                  ? "—"
                  : formatRsd(preview.actualUnitCost)}
              </p>
              <p>Status po završetku: {batchStatusLabel(preview.status)}</p>
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

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !preview.ok}>
            {isPending ? "…" : "Završi seriju"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
