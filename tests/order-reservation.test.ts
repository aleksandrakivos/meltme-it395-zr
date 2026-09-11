import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";
import {
  planOrderRelease,
  planOrderReservation,
  planOrderShipment,
  simulateOrderReservation,
} from "@/lib/services/order-service";
import {
  transitionReleasesReservation,
  transitionShipsStock,
} from "@/lib/services/order-status";

const catalog = [
  {
    id: "p1",
    name: "Lavanda 200ml",
    stock: 8,
    reserved: 4,
    sellingPrice: 1200,
    active: true,
  },
  {
    id: "p2",
    name: "Vanila 150ml",
    stock: 10,
    reserved: 0,
    sellingPrice: 900,
    active: true,
  },
  {
    id: "p3",
    name: "Arhiv",
    stock: 5,
    reserved: 0,
    sellingPrice: 500,
    active: false,
  },
];

describe("planOrderReservation", () => {
  it("rezerviše iz raspoloživog stanja i snima prodajnu cenu", () => {
    const result = planOrderReservation(
      [
        { productId: "p1", quantity: 4 },
        { productId: "p2", quantity: 3 },
      ],
      catalog,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0]).toEqual({
      productId: "p1",
      productName: "Lavanda 200ml",
      quantity: 4,
      available: 4,
      unitPrice: 1200,
    });
    expect(result.lines[1].unitPrice).toBe(900);
  });

  it("računa protiv raspoloživog, ne ukupnog stanja", () => {
    // p1 ima 8 na stanju, ali 4 su rezervisana drugom porudžbinom.
    const result = planOrderReservation(
      [{ productId: "p1", quantity: 5 }],
      catalog,
    );
    expect(result).toEqual({
      ok: false,
      error:
        "Nedovoljno raspoloživo: Lavanda 200ml (traženo 5, raspoloživo 4)",
    });
  });

  it("odbija neaktivan proizvod", () => {
    const result = planOrderReservation(
      [{ productId: "p3", quantity: 1 }],
      catalog,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("nije aktivan");
  });

  it("odbija praznu porudžbinu i nevalidnu količinu", () => {
    expect(planOrderReservation([], catalog).ok).toBe(false);
    expect(
      planOrderReservation([{ productId: "p2", quantity: 0 }], catalog).ok,
    ).toBe(false);
    expect(
      planOrderReservation([{ productId: "p2", quantity: 1.5 }], catalog).ok,
    ).toBe(false);
  });

  it("odbija nepostojeći proizvod", () => {
    expect(
      planOrderReservation([{ productId: "nema", quantity: 1 }], catalog).ok,
    ).toBe(false);
  });
});

describe("simulateOrderReservation", () => {
  it("pada kad druga stavka iscrpi raspoloživo koje je prva zauzela", () => {
    const result = simulateOrderReservation(
      [
        { productId: "p2", quantity: 6 },
        { productId: "p2", quantity: 6 },
      ],
      catalog,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Nedovoljno raspoloživo/);
  });

  it("prolazi kad sve stavke stanu u raspoloživo", () => {
    expect(
      simulateOrderReservation(
        [
          { productId: "p1", quantity: 2 },
          { productId: "p2", quantity: 5 },
        ],
        catalog,
      ).ok,
    ).toBe(true);
  });
});

describe("planOrderShipment / planOrderRelease", () => {
  const items = [
    { productId: "p1", quantity: 2 },
    { productId: "p2", quantity: 3 },
  ];

  it("slanje otpisuje tačno rezervisane količine", () => {
    expect(planOrderShipment(items)).toEqual(items);
  });

  it("otkazivanje oslobađa tačno rezervisane količine", () => {
    expect(planOrderRelease(items)).toEqual(items);
  });
});

describe("efekat prelaza statusa na zalihe", () => {
  it("samo U_PRIPREMI → POSLATA otpisuje sa stanja", () => {
    expect(
      transitionShipsStock(OrderStatus.U_PRIPREMI, OrderStatus.POSLATA),
    ).toBe(true);
    expect(transitionShipsStock(OrderStatus.NOVA, OrderStatus.U_PRIPREMI)).toBe(
      false,
    );
    expect(
      transitionShipsStock(OrderStatus.POSLATA, OrderStatus.ZAVRSENA),
    ).toBe(false);
  });

  it("otkazivanje pre slanja oslobađa rezervaciju", () => {
    expect(
      transitionReleasesReservation(OrderStatus.NOVA, OrderStatus.OTKAZANA),
    ).toBe(true);
    expect(
      transitionReleasesReservation(
        OrderStatus.U_PRIPREMI,
        OrderStatus.OTKAZANA,
      ),
    ).toBe(true);
  });

  it("poslata porudžbina se ne otkazuje, pa se rezervacija ne oslobađa", () => {
    expect(
      transitionReleasesReservation(OrderStatus.POSLATA, OrderStatus.OTKAZANA),
    ).toBe(false);
  });

  it("prelaz u završenu ne dira zalihe", () => {
    expect(
      transitionShipsStock(OrderStatus.POSLATA, OrderStatus.ZAVRSENA),
    ).toBe(false);
    expect(
      transitionReleasesReservation(OrderStatus.POSLATA, OrderStatus.ZAVRSENA),
    ).toBe(false);
  });
});
