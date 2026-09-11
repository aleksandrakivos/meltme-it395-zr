import { z } from "zod";

export const purchaseCreateSchema = z.object({
  materialId: z.string().min(1, "Izaberite sirovinu"),
  supplierId: z.string().optional().or(z.literal("")),
  quantity: z
    .number({ error: "Unesite količinu" })
    .positive("Količina mora biti veća od nule"),
  unitPrice: z
    .number({ error: "Unesite nabavnu cenu" })
    .nonnegative("Cena ne može biti negativna"),
  purchasedAt: z.coerce.date({ error: "Unesite datum nabavke" }),
  documentNo: z.string().trim().max(64, "Najviše 64 karaktera").optional().or(z.literal("")),
  note: z.string().trim().max(500, "Najviše 500 karaktera").optional().or(z.literal("")),
});

/** Jedna stavka dokumenta nabavke (jedna sirovina). */
export const purchaseLineSchema = z.object({
  materialId: z.string().min(1, "Izaberite sirovinu"),
  quantity: z
    .number({ error: "Unesite količinu" })
    .positive("Količina mora biti veća od nule"),
  unitPrice: z
    .number({ error: "Unesite nabavnu cenu" })
    .nonnegative("Cena ne može biti negativna"),
});

/**
 * Dokument nabavke: jedan dobavljač / datum / broj dokumenta, više sirovina.
 * Svaka stavka postaje zaseban (nepromenljiv) zapis nabavke — istorija cena
 * po sirovini ostaje ista kao kod pojedinačnog unosa.
 */
export const purchaseDocumentSchema = z
  .object({
    supplierId: z.string().optional().or(z.literal("")),
    purchasedAt: z.coerce.date({ error: "Unesite datum nabavke" }),
    documentNo: z
      .string()
      .trim()
      .max(64, "Najviše 64 karaktera")
      .optional()
      .or(z.literal("")),
    note: z
      .string()
      .trim()
      .max(500, "Najviše 500 karaktera")
      .optional()
      .or(z.literal("")),
    lines: z.array(purchaseLineSchema).min(1, "Dodajte najmanje jednu stavku"),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.lines.forEach((line, index) => {
      if (seen.has(line.materialId)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "materialId"],
          message: "Ista sirovina je već u dokumentu — spojite količine",
        });
      }
      seen.add(line.materialId);
    });
  });

export const stockAdjustmentDirectionSchema = z.enum(["PLUS", "MINUS"]);

export const stockAdjustmentSchema = z.object({
  materialId: z.string().min(1, "Izaberite sirovinu"),
  direction: stockAdjustmentDirectionSchema,
  quantity: z
    .number({ error: "Unesite količinu" })
    .positive("Količina mora biti veća od nule"),
  unitPrice: z.number().nonnegative("Cena ne može biti negativna").optional(),
  // Korekcija je izuzetak od pravila nepromenljivosti nabavki — zato je razlog obavezan.
  note: z.string().trim().min(3, "Obrazložite korekciju (najmanje 3 karaktera)"),
});

export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;
export type PurchaseDocumentInput = z.infer<typeof purchaseDocumentSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
