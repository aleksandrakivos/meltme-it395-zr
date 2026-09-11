import { z } from "zod";
import { MaterialType, Unit } from "@prisma/client";

export const materialTypeSchema = z.nativeEnum(MaterialType);
export const unitSchema = z.nativeEnum(Unit);

/**
 * Stanje i nabavna cena NISU deo forme za sirovinu — u sistem ulaze isključivo
 * kroz nabavku (`purchaseCreateSchema`) ili korekciju zaliha. Prosečna nabavna
 * cena je sistemski održavano polje.
 */
export const materialCreateSchema = z.object({
  name: z.string().trim().min(1, "Unesite naziv"),
  type: materialTypeSchema,
  unit: unitSchema,
  minStock: z.number().nonnegative("Minimum ne može biti negativan"),
  supplierId: z.string().optional().or(z.literal("")),
});

export const materialUpdateSchema = materialCreateSchema.extend({
  id: z.string().min(1),
});

export type MaterialCreateInput = z.infer<typeof materialCreateSchema>;
export type MaterialUpdateInput = z.infer<typeof materialUpdateSchema>;
