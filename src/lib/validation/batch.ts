import { z } from "zod";

export const planBatchSchema = z.object({
  productId: z.string().min(1, "Izaberite proizvod"),
  plannedQuantity: z
    .number({ error: "Unesite broj komada" })
    .int("Broj komada mora biti ceo broj")
    .positive("Broj komada mora biti veći od nule"),
  note: z.string().trim().max(500, "Najviše 500 karaktera").optional().or(z.literal("")),
});

export const startBatchSchema = z.object({
  batchId: z.string().min(1),
  lines: z.array(
    z.object({
      materialId: z.string().min(1),
      issuedQuantity: z
        .number({ error: "Unesite izdatu količinu" })
        .nonnegative("Količina ne može biti negativna"),
    }),
  ),
});

export const batchIdSchema = z.object({
  batchId: z.string().min(1),
});

export const completeBatchSchema = z.object({
  batchId: z.string().min(1),
  producedQuantity: z
    .number({ error: "Unesite broj ispravnih komada" })
    .int("Broj komada mora biti ceo broj")
    .nonnegative("Broj komada ne može biti negativan"),
  scrapQuantity: z
    .number({ error: "Unesite škart" })
    .int("Škart mora biti ceo broj")
    .nonnegative("Škart ne može biti negativan"),
  lines: z.array(
    z.object({
      materialId: z.string().min(1),
      consumedQuantity: z.number().nonnegative("Količina ne može biti negativna"),
      wasteQuantity: z.number().nonnegative("Otpad ne može biti negativan"),
    }),
  ),
  note: z.string().trim().max(500, "Najviše 500 karaktera").optional().or(z.literal("")),
});

export const cancelBatchSchema = z.object({
  batchId: z.string().min(1),
  reason: z.string().trim().min(3, "Obrazložite otkazivanje (najmanje 3 karaktera)"),
});

export type PlanBatchInput = z.infer<typeof planBatchSchema>;
export type StartBatchInput = z.infer<typeof startBatchSchema>;
export type CompleteBatchInput = z.infer<typeof completeBatchSchema>;
export type CancelBatchInput = z.infer<typeof cancelBatchSchema>;
