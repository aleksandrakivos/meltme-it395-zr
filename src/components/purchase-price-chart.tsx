"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PurchasePricePoint = {
  label: string;
  unitPrice: number;
  runningAverage: number;
};

export function PurchasePriceChart({
  data,
  unitLabel,
}: {
  data: PurchasePricePoint[];
  unitLabel?: string;
}) {
  const formatValue = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    const [intPart, fracPart] = n.toFixed(2).split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${grouped},${fracPart}${unitLabel ? ` ${unitLabel}` : ""}`;
  };

  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Grafikon kretanja cene se prikazuje od druge nabavke.
      </p>
    );
  }

  return (
    <div className="h-72 w-full border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            domain={["auto", "auto"]}
            width={72}
            tickFormatter={(value: number) => value.toFixed(0)}
            label={
              unitLabel
                ? {
                    value: unitLabel,
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  }
                : undefined
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
            formatter={(value) => [formatValue(value), ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="unitPrice"
            name="Nabavna cena"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="runningAverage"
            name="Ponderisani prosek"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 3"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
