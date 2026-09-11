"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TopSellerPoint = {
  name: string;
  quantity: number;
};

export function TopSellersChart({ data }: { data: TopSellerPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Još nema prodaje za prikaz.
      </p>
    );
  }

  return (
    <div className="h-72 w-full border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-25}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              borderRadius: 0,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Bar dataKey="quantity" name="Prodato (kom)" fill="var(--primary)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
