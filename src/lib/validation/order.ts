import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Izaberite proizvod"),
  quantity: z
    .number({ error: "Unesite količinu" })
    .int("Količina mora biti ceo broj")
    .positive("Količina mora biti veća od nule"),
});

export const createOrderSchema = z
  .object({
    customerId: z.string().min(1, "Izaberite kupca"),
    items: z
      .array(orderItemSchema)
      .min(1, "Dodajte barem jednu stavku"),
  })
  .superRefine((data, ctx) => {
    const ids = data.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Isti proizvod ne sme biti na listi više puta",
        path: ["items"],
      });
    }
  });

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "NOVA",
    "U_PRIPREMI",
    "POSLATA",
    "ZAVRSENA",
    "OTKAZANA",
  ]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
