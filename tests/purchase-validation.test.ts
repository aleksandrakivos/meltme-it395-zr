import { describe, expect, it } from "vitest";
import {
  purchaseCreateSchema,
  purchaseDocumentSchema,
  stockAdjustmentSchema,
} from "@/lib/validation/purchase";
import {
  materialCreateSchema,
  materialUpdateSchema,
} from "@/lib/validation/material";

const validPurchase = {
  materialId: "m1",
  supplierId: "s1",
  quantity: 10000,
  unitPrice: 0.85,
  purchasedAt: "2026-08-01",
  documentNo: "OT-2026-14",
  note: "",
};

describe("purchaseCreateSchema", () => {
  it("prihvata ispravnu nabavku i pretvara datum u Date", () => {
    const result = purchaseCreateSchema.safeParse(validPurchase);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.purchasedAt).toBeInstanceOf(Date);
  });

  it("odbija količinu nula", () => {
    const result = purchaseCreateSchema.safeParse({
      ...validPurchase,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("odbija negativnu cenu", () => {
    const result = purchaseCreateSchema.safeParse({
      ...validPurchase,
      unitPrice: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("dozvoljava cenu nula (donacija / uzorak)", () => {
    const result = purchaseCreateSchema.safeParse({
      ...validPurchase,
      unitPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  it("traži sirovinu", () => {
    const result = purchaseCreateSchema.safeParse({
      ...validPurchase,
      materialId: "",
    });
    expect(result.success).toBe(false);
  });

  it("dobavljač je opcion", () => {
    const result = purchaseCreateSchema.safeParse({
      ...validPurchase,
      supplierId: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("purchaseDocumentSchema", () => {
  const validDocument = {
    supplierId: "s1",
    purchasedAt: "2026-08-01",
    documentNo: "OT-2026-14",
    note: "",
    lines: [
      { materialId: "m1", quantity: 10000, unitPrice: 0.085 },
      { materialId: "m2", quantity: 500, unitPrice: 1.2 },
    ],
  };

  it("prihvata dokument sa više stavki", () => {
    const result = purchaseDocumentSchema.safeParse(validDocument);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.lines).toHaveLength(2);
    expect(result.data.purchasedAt).toBeInstanceOf(Date);
  });

  it("traži najmanje jednu stavku", () => {
    const result = purchaseDocumentSchema.safeParse({
      ...validDocument,
      lines: [],
    });
    expect(result.success).toBe(false);
  });

  it("odbija istu sirovinu dva puta u istom dokumentu", () => {
    const result = purchaseDocumentSchema.safeParse({
      ...validDocument,
      lines: [
        { materialId: "m1", quantity: 1, unitPrice: 1 },
        { materialId: "m1", quantity: 2, unitPrice: 1 },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["lines", 1, "materialId"]);
  });

  it("validira svaku stavku kao pojedinačnu nabavku", () => {
    const result = purchaseDocumentSchema.safeParse({
      ...validDocument,
      lines: [{ materialId: "m1", quantity: 0, unitPrice: 1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("stockAdjustmentSchema", () => {
  it("traži obrazloženje korekcije", () => {
    const result = stockAdjustmentSchema.safeParse({
      materialId: "m1",
      direction: "MINUS",
      quantity: 5,
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("prihvata korekciju sa obrazloženjem", () => {
    const result = stockAdjustmentSchema.safeParse({
      materialId: "m1",
      direction: "MINUS",
      quantity: 5,
      note: "Inventura 08/2026",
    });
    expect(result.success).toBe(true);
  });

  it("odbija nepoznat smer", () => {
    const result = stockAdjustmentSchema.safeParse({
      materialId: "m1",
      direction: "GORE",
      quantity: 5,
      note: "Inventura",
    });
    expect(result.success).toBe(false);
  });
});

describe("materialCreateSchema", () => {
  it("više ne prima stanje ni nabavnu cenu — oni ulaze kroz nabavku", () => {
    const result = materialCreateSchema.safeParse({
      name: "Soja vosak",
      type: "VOSAK",
      unit: "G",
      minStock: 1000,
      supplierId: "",
      stock: 5000,
      purchasePrice: 0.08,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("stock");
    expect(result.data).not.toHaveProperty("purchasePrice");
  });

  it("odbija negativan minimum", () => {
    const result = materialCreateSchema.safeParse({
      name: "Soja vosak",
      type: "VOSAK",
      unit: "G",
      minStock: -1,
    });
    expect(result.success).toBe(false);
  });

  it("izmena traži id", () => {
    const result = materialUpdateSchema.safeParse({
      name: "Soja vosak",
      type: "VOSAK",
      unit: "G",
      minStock: 0,
    });
    expect(result.success).toBe(false);
  });
});
