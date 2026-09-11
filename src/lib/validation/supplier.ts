import { z } from "zod";

export const supplierCreateSchema = z.object({
  name: z.string().trim().min(1, "Unesite naziv"),
  contact: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Unesite ispravan email")
    .optional()
    .or(z.literal("")),
});

export const supplierUpdateSchema = supplierCreateSchema.extend({
  id: z.string().min(1),
});

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
