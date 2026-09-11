"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XCircleIcon } from "@phosphor-icons/react";
import { cancelProductionBatch } from "@/actions/batches";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cancelBatchSchema, type CancelBatchInput } from "@/lib/validation/batch";

export function CancelBatchDialog({
  batchId,
  hint,
}: {
  batchId: string;
  hint: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults: CancelBatchInput = { batchId, reason: "" };

  const form = useForm<CancelBatchInput>({
    resolver: zodResolver(cancelBatchSchema) as never,
    defaultValues: defaults,
  });
  useReportDirty(form.formState.isDirty, setDirty);

  function onSubmit(values: CancelBatchInput) {
    startTransition(async () => {
      const result = await cancelProductionBatch(values);
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

  return (
    <FormDialog
      title="Otkaži seriju"
      description={hint}
      dirty={dirty}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
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
        <div className="flex justify-end">
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? "…" : "Otkaži seriju"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
