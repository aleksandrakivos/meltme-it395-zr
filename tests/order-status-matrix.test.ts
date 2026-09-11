import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";
import {
  allowedTransitions,
  canTransition,
} from "@/lib/services/order-status";

const ALL = Object.values(OrderStatus);

describe("canTransition matrix", () => {
  it("matches the allowed map for every from→to pair", () => {
    for (const from of ALL) {
      const allowed = new Set(allowedTransitions(from));
      for (const to of ALL) {
        const expected = from !== to && allowed.has(to);
        expect(canTransition(from, to)).toBe(expected);
      }
    }
  });

  it("terminal statuses have no outgoing transitions", () => {
    expect(allowedTransitions(OrderStatus.ZAVRSENA)).toEqual([]);
    expect(allowedTransitions(OrderStatus.OTKAZANA)).toEqual([]);
  });
});
