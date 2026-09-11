import { z } from "zod";
import { Role } from "@prisma/client";

export const userRoleSchema = z.nativeEnum(Role);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Unesite ime"),
  email: z.string().trim().email("Unesite ispravan email"),
  role: userRoleSchema,
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Unesite ime"),
  role: userRoleSchema,
});

export const userSetActiveSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
