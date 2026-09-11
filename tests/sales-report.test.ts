import { describe, expect, it } from "vitest";
import { buildMonthlySales } from "@/lib/services/sales-report";

describe("buildMonthlySales", () => {
  it("fills empty months with zero revenue", () => {
    const asOf = new Date(2026, 6, 15);
    const points = buildMonthlySales([], 3, asOf);
    expect(points).toEqual([
      { key: "2026-05", label: "maj 2026", revenue: 0, orderCount: 0 },
      { key: "2026-06", label: "jun 2026", revenue: 0, orderCount: 0 },
      { key: "2026-07", label: "jul 2026", revenue: 0, orderCount: 0 },
    ]);
  });

  it("aggregates revenue by month and ignores out-of-window rows", () => {
    const asOf = new Date(2026, 6, 1);
    const points = buildMonthlySales(
      [
        { date: new Date(2026, 5, 10), revenue: 100 },
        { date: new Date(2026, 5, 20), revenue: 50 },
        { date: new Date(2026, 6, 2), revenue: 200 },
        { date: new Date(2025, 0, 1), revenue: 999 },
      ],
      2,
      asOf,
    );
    expect(points).toEqual([
      { key: "2026-06", label: "jun 2026", revenue: 150, orderCount: 2 },
      { key: "2026-07", label: "jul 2026", revenue: 200, orderCount: 1 },
    ]);
  });
});
