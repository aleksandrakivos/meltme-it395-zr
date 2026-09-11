import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Unesite ime"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(
      data.currentPassword || data.newPassword || data.confirmPassword,
    );

    if (!wantsPasswordChange) {
      return;
    }

    if (!data.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Unesite trenutnu lozinku",
      });
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Nova lozinka mora imati najmanje 8 karaktera",
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Lozinke se ne poklapaju",
      });
    }
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
