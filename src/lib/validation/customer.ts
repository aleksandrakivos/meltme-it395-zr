import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1, "Unesite ime"),
  email: z
    .string()
    .trim()
    .email("Unesite ispravan email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
});

export const customerUpdateSchema = customerCreateSchema.extend({
  id: z.string().min(1),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
