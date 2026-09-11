import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Unesite naziv"),
  waxType: z.string().trim().min(1, "Unesite tip voska"),
  scent: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().min(1, "Unesite veličinu"),
  sellingPrice: z.number().nonnegative("Cena ne može biti negativna"),
  stock: z.number().int().nonnegative("Stanje ne može biti negativno"),
});

export const productUpdateSchema = productCreateSchema
  .omit({ stock: true })
  .extend({
    id: z.string().min(1),
  });

export const productSetActiveSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
