import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Unesite ispravan email"),
  password: z.string().min(1, "Unesite lozinku"),
});

export type LoginInput = z.infer<typeof loginSchema>;
