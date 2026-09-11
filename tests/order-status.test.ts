import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";
import { canTransition } from "@/lib/services/order-status";

describe("canTransition", () => {
  it("allows the linear happy path", () => {
    expect(canTransition(OrderStatus.NOVA, OrderStatus.U_PRIPREMI)).toBe(true);
    expect(canTransition(OrderStatus.U_PRIPREMI, OrderStatus.POSLATA)).toBe(
      true,
    );
    expect(canTransition(OrderStatus.POSLATA, OrderStatus.ZAVRSENA)).toBe(true);
  });

  it("allows cancel from early statuses", () => {
    expect(canTransition(OrderStatus.NOVA, OrderStatus.OTKAZANA)).toBe(true);
    expect(canTransition(OrderStatus.U_PRIPREMI, OrderStatus.OTKAZANA)).toBe(
      true,
    );
  });

  it("rejects skipped and reverse transitions", () => {
    expect(canTransition(OrderStatus.NOVA, OrderStatus.POSLATA)).toBe(false);
    expect(canTransition(OrderStatus.NOVA, OrderStatus.ZAVRSENA)).toBe(false);
    expect(canTransition(OrderStatus.POSLATA, OrderStatus.OTKAZANA)).toBe(
      false,
    );
    expect(canTransition(OrderStatus.ZAVRSENA, OrderStatus.NOVA)).toBe(false);
    expect(canTransition(OrderStatus.OTKAZANA, OrderStatus.NOVA)).toBe(false);
    expect(canTransition(OrderStatus.POSLATA, OrderStatus.U_PRIPREMI)).toBe(
      false,
    );
  });

  it("rejects same-status transitions", () => {
    expect(canTransition(OrderStatus.NOVA, OrderStatus.NOVA)).toBe(false);
  });
});
