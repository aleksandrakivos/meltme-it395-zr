import { describe, expect, it } from "vitest";
import {
  formatUnitPrice,
  fromDisplayPrice,
  fromDisplayQuantity,
  priceUnitFactor,
  priceUnitLabel,
  quantityUnitLabel,
  toDisplayPrice,
  toDisplayQuantity,
} from "@/lib/labels";

describe("price unit conversion (display only)", () => {
  it("grams and millilitres are shown per kg / l, pieces stay per piece", () => {
    expect(priceUnitLabel("G")).toBe("RSD/kg");
    expect(priceUnitLabel("ML")).toBe("RSD/l");
    expect(priceUnitLabel("KOM")).toBe("RSD/kom");
    expect(priceUnitFactor("G")).toBe(1000);
    expect(priceUnitFactor("ML")).toBe(1000);
    expect(priceUnitFactor("KOM")).toBe(1);
  });

  it("stored RSD/g converts to RSD/kg and back without loss", () => {
    // seed: soja vosak 0.085 RSD/g = 85 RSD/kg
    expect(toDisplayPrice(0.085, "G")).toBeCloseTo(85, 10);
    expect(fromDisplayPrice(85, "G")).toBeCloseTo(0.085, 10);
    expect(fromDisplayPrice(toDisplayPrice(0.0975, "ML"), "ML")).toBeCloseTo(
      0.0975,
      10,
    );
  });

  it("pieces are not scaled", () => {
    expect(toDisplayPrice(45, "KOM")).toBe(45);
    expect(fromDisplayPrice(45, "KOM")).toBe(45);
  });

  it("formats the display price with the practical unit", () => {
    expect(formatUnitPrice(0.085, "G")).toBe("85,00 RSD/kg");
    expect(formatUnitPrice(1.2, "ML")).toBe("1.200,00 RSD/l");
    expect(formatUnitPrice(45, "KOM")).toBe("45,00 RSD/kom");
  });
});

describe("quantity unit conversion (purchase form display only)", () => {
  it("grams and millilitres are entered as kg / l, pieces stay pieces", () => {
    expect(quantityUnitLabel("G")).toBe("kg");
    expect(quantityUnitLabel("ML")).toBe("l");
    expect(quantityUnitLabel("KOM")).toBe("kom");
  });

  it("stored grams convert to kilograms and back without loss", () => {
    expect(toDisplayQuantity(5000, "G")).toBeCloseTo(5, 10);
    expect(fromDisplayQuantity(5, "G")).toBeCloseTo(5000, 10);
    expect(fromDisplayQuantity(toDisplayQuantity(250, "G"), "G")).toBeCloseTo(
      250,
      10,
    );
  });

  it("stored millilitres convert to litres and back", () => {
    expect(toDisplayQuantity(1500, "ML")).toBeCloseTo(1.5, 10);
    expect(fromDisplayQuantity(0.25, "ML")).toBeCloseTo(250, 10);
  });

  it("pieces are not scaled", () => {
    expect(toDisplayQuantity(24, "KOM")).toBe(24);
    expect(fromDisplayQuantity(24, "KOM")).toBe(24);
  });

  it("line total is the same in display units as in stored units", () => {
    const storedQty = fromDisplayQuantity(5, "G");
    const storedPrice = fromDisplayPrice(1200, "G");
    expect(storedQty * storedPrice).toBeCloseTo(5 * 1200, 10);
  });
});
