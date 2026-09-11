"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { z } from "zod";
import type { Unit } from "@prisma/client";
import { adjustMaterialStock } from "@/actions/purchases";
import { FormDialog } from "@/components/form-dialog";
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
  fromDisplayPrice,
  priceUnitLabel,
  unitLabel as unitLabelOf,
} from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  countedStockAdjustment,
  roundTo,
} from "@/lib/services/material-costing";
import { cn } from "@/lib/utils";

type Mode = "DIFFERENCE" | "COUNTED";

const MODES: Array<{ value: Mode; label: string; hint: string }> = [
  {
    value: "COUNTED",
    label: "Prebrojano stanje",
    hint: "Unesite koliko ste stvarno izbrojali — sistem računa razliku.",
  },
  {
    value: "DIFFERENCE",
    label: "Unesi razliku",
    hint: "Znate tačnu količinu manjka ili viška.",
  },
];

const DIRECTIONS = [
  { value: "MINUS", label: "Manjak" },
  { value: "PLUS", label: "Višak" },
] as const;

const adjustFormSchema = z.object({
  mode: z.enum(["DIFFERENCE", "COUNTED"]),
  direction: z.enum(["PLUS", "MINUS"]),
  quantity: z.number().optional(),
  countedStock: z.number().optional(),
  displayPrice: z
    .number()
    .nonnegative("Cena ne može biti negativna")
    .optional(),
  note: z
    .string()
    .trim()
    .min(3, "Obrazložite korekciju (najmanje 3 karaktera)"),
});

type AdjustFormValues = z.infer<typeof adjustFormSchema>;

export function AdjustStockDialog({
  materialId,
  materialName,
  unit,
  stock,
  triggerLabel = "Korekcija zaliha",
  triggerVariant = "outline",
}: {
  materialId: string;
  materialName: string;
  unit: Unit;
  stock: number;
  triggerLabel?: string;
  triggerVariant?: "outline" | "ghost";
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unitText = unitLabelOf(unit);

  const defaults: AdjustFormValues = {
    mode: "COUNTED",
    direction: "MINUS",
    quantity: undefined,
    countedStock: undefined,
    displayPrice: undefined,
    note: "",
  };

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: defaults,
  });

  useReportDirty(form.formState.isDirty, setDirty);

  const mode = useWatch({ control: form.control, name: "mode" });
  const direction = useWatch({ control: form.control, name: "direction" });
  const countedStock = useWatch({
    control: form.control,
    name: "countedStock",
  });
  const quantity = useWatch({ control: form.control, name: "quantity" });

  const derived = (() => {
    if (mode === "COUNTED") {
      if (
        countedStock === undefined ||
        !Number.isFinite(countedStock) ||
        countedStock < 0
      ) {
        return null;
      }
      return countedStockAdjustment(stock, countedStock);
    }
    if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }
    return { direction, quantity };
  })();

  const newStock = derived
    ? roundTo(
        derived.direction === "PLUS"
          ? stock + derived.quantity
          : stock - derived.quantity,
        3,
      )
    : null;

  const noChange =
    mode === "COUNTED" &&
    countedStock !== undefined &&
    Number.isFinite(countedStock) &&
    derived === null;

  function onSubmit(values: AdjustFormValues) {
    if (!derived) {
      if (mode === "COUNTED") {
        form.setError("countedStock", {
          message: noChange
            ? "Prebrojano stanje je isto kao u sistemu — nema šta da se koriguje"
            : "Unesite prebrojano stanje",
        });
      } else {
        form.setError("quantity", { message: "Unesite količinu veću od nule" });
      }
      return;
    }
    startTransition(async () => {
      const result = await adjustMaterialStock({
        materialId,
        direction: derived.direction,
        quantity: derived.quantity,
        unitPrice:
          derived.direction === "PLUS" &&
          values.displayPrice !== undefined &&
          Number.isFinite(values.displayPrice)
            ? fromDisplayPrice(values.displayPrice, unit)
            : undefined,
        note: values.note,
      });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess(
        `Korekcija evidentirana: ${derived.direction === "PLUS" ? "višak" : "manjak"} ${derived.quantity} ${unitText}`,
      );
      form.reset(defaults);
      setOpen(false);
      router.refresh();
    });
  }

  const showPrice = derived?.direction === "PLUS";

  return (
    <FormDialog
      title={`Korekcija zaliha — ${materialName}`}
      description="Jedini način da se ispravi stanje mimo nabavke i proizvodnje. Ostaje trajan trag u kretanju zaliha."
      dirty={dirty}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
      trigger={
        <Button type="button" variant={triggerVariant} size="sm">
          <SlidersHorizontalIcon
            weight="duotone"
            aria-hidden="true"
            data-icon="inline-start"
          />
          {triggerLabel}
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <p className="text-sm">
          Stanje u sistemu:{" "}
          <span className="font-medium tabular-nums">
            {stock} {unitText}
          </span>
        </p>

        <Controller
          name="mode"
          control={form.control}
          render={({ field }) => (
            <div
              role="group"
              aria-label="Način unosa korekcije"
              className="grid grid-cols-2 gap-2"
            >
              {MODES.map((option) => {
                const active = field.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    disabled={isPending}
                    onClick={() => {
                      field.onChange(option.value);
                      form.clearErrors(["quantity", "countedStock"]);
                    }}
                    className={cn(
                      "border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      active
                        ? "border-foreground bg-muted"
                        : "hover:border-border hover:bg-muted/50",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />

        <FieldGroup>
          {mode === "COUNTED" ? (
            <Controller
              name="countedStock"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-counted`}>
                    Prebrojano stanje ({unitText})
                  </FieldLabel>
                  <Input
                    id={`${id}-counted`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={
                      field.value === undefined || !Number.isFinite(field.value)
                        ? ""
                        : field.value
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
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
          ) : (
            <>
              <Controller
                name="direction"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel id={`${id}-direction-label`}>Smer</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value ?? "MINUS")
                      }
                      disabled={isPending}
                      items={[...DIRECTIONS]}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-labelledby={`${id}-direction-label`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIRECTIONS.map((item) => (
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
                name="quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${id}-qty`}>
                      Količina ({unitText})
                    </FieldLabel>
                    <Input
                      id={`${id}-qty`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={
                        field.value === undefined ||
                        !Number.isFinite(field.value)
                          ? ""
                          : field.value
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
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
            </>
          )}

          <p
            className={cn(
              "border-l-2 pl-3 text-sm",
              derived ? "text-foreground" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {derived && newStock !== null ? (
              <>
                Stanje {stock} → <span className="font-medium">{newStock}</span>{" "}
                {unitText} (
                <span
                  className={cn(
                    derived.direction === "PLUS"
                      ? "text-wax-sage-foreground"
                      : "text-destructive",
                  )}
                >
                  {derived.direction === "PLUS" ? "višak" : "manjak"}{" "}
                  {derived.quantity} {unitText}
                </span>
                )
              </>
            ) : noChange ? (
              "Prebrojano stanje se poklapa sa sistemom — nema korekcije."
            ) : (
              "Unesite vrednost da vidite efekat na stanje."
            )}
          </p>

          {showPrice ? (
            <Controller
              name="displayPrice"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-price`}>
                    Cena viška ({priceUnitLabel(unit)}) — opciono
                  </FieldLabel>
                  <Input
                    id={`${id}-price`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={
                      field.value === undefined || !Number.isFinite(field.value)
                        ? ""
                        : field.value
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
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
          ) : null}

          <Controller
            name="note"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-note`}>Obrazloženje</FieldLabel>
                <Input
                  {...field}
                  id={`${id}-note`}
                  placeholder="npr. Inventura 08/2026"
                  autoComplete="off"
                  disabled={isPending}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || noChange}>
            {isPending ? "Evidentiranje…" : "Evidentiraj korekciju"}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
