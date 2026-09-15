import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/validation/order";
import {
  cancelBatchSchema,
  completeBatchSchema,
  planBatchSchema,
} from "@/lib/validation/batch";
import { recipeItemUpsertSchema } from "@/lib/validation/recipe";

describe("createOrderSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = createOrderSchema.safeParse({
      customerId: "c1",
      items: [{ productId: "p1", quantity: 2 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty items", () => {
    const parsed = createOrderSchema.safeParse({
      customerId: "c1",
      items: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate products", () => {
    const parsed = createOrderSchema.safeParse({
      customerId: "c1",
      items: [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 2 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const parsed = createOrderSchema.safeParse({
      customerId: "c1",
      items: [{ productId: "p1", quantity: 0 }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("planBatchSchema", () => {
  it("rejects missing product", () => {
    const parsed = planBatchSchema.safeParse({ plannedQuantity: 3 });
    expect(parsed.success).toBe(false);
  });

  it("rejects fractional quantity", () => {
    const parsed = planBatchSchema.safeParse({
      productId: "p1",
      plannedQuantity: 1.5,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid plan with an optional note", () => {
    const parsed = planBatchSchema.safeParse({
      productId: "p1",
      plannedQuantity: 20,
      note: "Serija za sajam",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("completeBatchSchema", () => {
  it("rejects negative scrap", () => {
    const parsed = completeBatchSchema.safeParse({
      batchId: "b1",
      producedQuantity: 10,
      scrapQuantity: -1,
      lines: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts zero produced with scrap", () => {
    const parsed = completeBatchSchema.safeParse({
      batchId: "b1",
      producedQuantity: 0,
      scrapQuantity: 10,
      lines: [{ materialId: "m1", consumedQuantity: 5, wasteQuantity: 1 }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("cancelBatchSchema", () => {
  it("requires a reason", () => {
    expect(
      cancelBatchSchema.safeParse({ batchId: "b1", reason: "" }).success,
    ).toBe(false);
    expect(
      cancelBatchSchema.safeParse({ batchId: "b1", reason: "Pukla teglica" })
        .success,
    ).toBe(true);
  });

  it("accepts optional material report lines", () => {
    expect(
      cancelBatchSchema.safeParse({
        batchId: "b1",
        reason: "Pukla teglica",
        lines: [
          { materialId: "m1", consumedQuantity: 10, wasteQuantity: 2 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("recipeItemUpsertSchema", () => {
  it("rejects zero quantity", () => {
    const parsed = recipeItemUpsertSchema.safeParse({
      productId: "p1",
      materialId: "m1",
      quantity: 0,
    });
    expect(parsed.success).toBe(false);
  });
});
