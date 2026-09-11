"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { PlayIcon } from "@phosphor-icons/react";
import { startProductionBatch } from "@/actions/batches";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { formatRsd } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import { planIssue } from "@/lib/services/batch-service";

export type StartLine = {
  materialId: string;
  materialName: string;
  unitLabel: string;
  plannedQuantity: number;
  reservedQuantity: number;
  stock: number;
  avgPrice: number;
};

type FormValues = {
  lines: Array<{ materialId: string; issuedQuantity: number }>;
};

export function StartBatchDialog({
  batchId,
  lines,
}: {
  batchId: string;
  lines: StartLine[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults: FormValues = {
    lines: lines.map((l) => ({
      materialId: l.materialId,
      issuedQuantity: l.plannedQuantity,
    })),
  };

  const form = useForm<FormValues>({ defaultValues: defaults });
  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  useReportDirty(form.formState.isDirty, setDirty);

  const watched = useWatch({ control: form.control, name: "lines" });

  const preview = useMemo(() => {
    const overrides = (watched ?? []).map((line) => ({
      materialId: line.materialId,
      quantity: Number.isFinite(line.issuedQuantity) ? line.issuedQuantity : 0,
    }));
    return planIssue(lines, overrides);
  }, [lines, watched]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await startProductionBatch({ batchId, lines: values.lines });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess("Serija je započeta", "Sirovine su izdate u proizvodnju");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <FormDialog
      title="Započni proizvodnju"
      description="Rezervisane sirovine se izdaju u proizvodnju i skidaju sa stanja. Količine se mogu ručno korigovati."
      dirty={dirty}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
      className="sm:max-w-lg"
      trigger={
        <Button type="button" size="sm">
          <PlayIcon weight="duotone" data-icon="inline-start" />
          Započni proizvodnju
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {fields.map((field, index) => {
            const line = lines[index];
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span>{line.materialName}</span>
                  <span className="text-muted-foreground">
                    planirano {line.plannedQuantity} {line.unitLabel} · stanje{" "}
                    {line.stock}
                  </span>
                </div>
                <Controller
                  name={`lines.${index}.issuedQuantity`}
                  control={form.control}
                  render={({ field: input }) => (
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={Number.isFinite(input.value) ? input.value : ""}
                      onChange={(e) =>
                        input.onChange(
                          e.target.value === "" ? NaN : e.target.valueAsNumber
                        )
                      }
                      disabled={isPending}
                    />
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="border p-3 text-xs">
          {preview.ok ? (
            <p>Vrednost izdatih sirovina: {formatRsd(preview.issuedCost)}</p>
          ) : (
            <p className="text-destructive">{preview.error}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !preview.ok}>
            {isPending ? "…" : "Izdaj i započni"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
