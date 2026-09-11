"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRsd } from "@/lib/labels";
import type { MonthlySalePoint } from "@/lib/services/sales-report";

export function MonthlySalesChart({ data }: { data: MonthlySalePoint[] }) {
  const hasSales = data.some((point) => point.revenue > 0);
  if (!hasSales) {
    return (
      <p className="text-sm text-muted-foreground">
        Još nema prodaje za prikaz.
      </p>
    );
  }

  return (
    <div className="h-72 w-full border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("sr-RS", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)" }}
            contentStyle={{
              borderRadius: 0,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(value) => [
              formatRsd(typeof value === "number" ? value : Number(value)),
              "Prihod",
            ]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Prihod"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
