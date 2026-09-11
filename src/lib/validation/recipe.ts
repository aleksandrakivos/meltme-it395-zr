import { z } from "zod";

export const recipeItemUpsertSchema = z.object({
  productId: z.string().min(1),
  materialId: z.string().min(1),
  quantity: z.number().positive("Količina mora biti veća od nule"),
});

export const recipeItemDeleteSchema = z.object({
  id: z.string().min(1),
});

export type RecipeItemUpsertInput = z.infer<typeof recipeItemUpsertSchema>;
