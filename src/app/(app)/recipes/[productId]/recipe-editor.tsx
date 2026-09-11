"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrashIcon } from "@phosphor-icons/react";
import { deleteRecipeItem, upsertRecipeItem } from "@/actions/recipes";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
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
import { formatRsd, formatUnitPrice, unitLabel } from "@/lib/labels";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Unit } from "@prisma/client";

export type RecipeLine = {
  id: string;
  materialId: string;
  materialName: string;
  unit: Unit;
  quantity: number;
  avgPurchasePrice: number;
  lineCost: number;
};

type MaterialOption = {
  id: string;
  name: string;
  unit: Unit;
};

type RecipeEditorProps = {
  productId: string;
  productName: string;
  unitCost: number;
  lines: RecipeLine[];
  materials: MaterialOption[];
};

const recipeAddSchema = z.object({
  materialId: z.string().min(1, "Izaberite sirovinu"),
  quantity: z
    .number({ error: "Unesite količinu" })
    .positive("Količina mora biti veća od nule"),
});

type RecipeAddInput = z.infer<typeof recipeAddSchema>;

export function RecipeEditor({
  productId,
  productName,
  unitCost,
  lines,
  materials,
}: RecipeEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<RecipeAddInput>({
    resolver: zodResolver(recipeAddSchema),
    defaultValues: {
      materialId: "",
      quantity: 1,
    },
  });

  const availableMaterials = materials.filter(
    (m) => !lines.some((line) => line.materialId === m.id)
  );

  function onSubmit(values: RecipeAddInput) {
    startTransition(async () => {
      const result = await upsertRecipeItem({
        productId,
        materialId: values.materialId,
        quantity: values.quantity,
      });
      if (!result.ok) {
        notifyError(result.error);
        return;
      }
      notifySuccess("Stavka sačuvana");
      form.reset({ materialId: "", quantity: 1 });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Receptura — ${productName}`}
        description={`Planski trošak po komadu: ${formatRsd(unitCost)}`}
        backHref="/recipes"
        backLabel="Recepture"
      />

      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Sirovina</AppTableHead>
            <AppTableHead align="right">Količina</AppTableHead>
            <AppTableHead align="right">Prosečna nab. cena</AppTableHead>
            <AppTableHead align="right">Trošak po komadu</AppTableHead>
            <AppTableHead />
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {lines.length === 0 ? (
            <AppTableRow>
              <AppTableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                Receptura je prazna
              </AppTableCell>
            </AppTableRow>
          ) : (
            lines.map((line) => (
              <AppTableRow key={line.id}>
                <AppTableCell>{line.materialName}</AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {line.quantity} {unitLabel(line.unit)}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {line.avgPurchasePrice > 0
                    ? formatUnitPrice(line.avgPurchasePrice, line.unit)
                    : "—"}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {formatRsd(line.lineCost)}
                </AppTableCell>
                <AppTableCell align="right">
                  <ConfirmDialog
                    triggerLabel="Obriši"
                    triggerIcon={
                      <TrashIcon weight="duotone" data-icon="inline-start" />
                    }
                    title="Obrisati stavku?"
                    description={`Uklanjate ${line.materialName} iz recepture.`}
                    confirmLabel="Obriši"
                    onConfirm={async () => {
                      const result = await deleteRecipeItem({ id: line.id });
                      if (!result.ok) {
                        notifyError(result.error);
                        return;
                      }
                      notifySuccess("Stavka obrisana");
                      router.refresh();
                    }}
                  />
                </AppTableCell>
              </AppTableRow>
            ))
          )}
        </AppTableBody>
      </AppTable>

      <form
        className="max-w-xl space-y-3 border p-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <SectionTitle>Dodaj / izmeni stavku</SectionTitle>
        <FieldGroup>
          <Controller
            name="materialId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Sirovina</FieldLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  disabled={isPending || availableMaterials.length === 0}
                  items={availableMaterials.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${unitLabel(m.unit)})`,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Izaberite sirovinu" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({unitLabel(m.unit)})
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
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="recipe-qty">Količina po komadu</FieldLabel>
                <Input
                  id="recipe-qty"
                  type="number"
                  step="any"
                  min="0"
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
            type="submit"
            disabled={isPending || availableMaterials.length === 0}
          >
            {isPending ? "Čuvanje…" : "Sačuvaj stavku"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
