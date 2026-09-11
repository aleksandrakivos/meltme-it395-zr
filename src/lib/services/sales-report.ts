export type MonthlySaleInput = {
  date: Date;
  revenue: number;
};

export type MonthlySalePoint = {
  key: string;
  label: string;
  revenue: number;
  orderCount: number;
};

const MONTH_LABELS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "avg",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const index = Number(month) - 1;
  const short = MONTH_LABELS[index] ?? month;
  return `${short} ${year}`;
}

export function buildMonthlySales(
  rows: MonthlySaleInput[],
  months = 12,
  asOf: Date = new Date(),
): MonthlySalePoint[] {
  const end = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    keys.push(monthKey(d));
  }

  const buckets = new Map<string, { revenue: number; orderCount: number }>();
  for (const key of keys) {
    buckets.set(key, { revenue: 0, orderCount: 0 });
  }

  for (const row of rows) {
    const key = monthKey(row.date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += row.revenue;
    bucket.orderCount += 1;
  }

  return keys.map((key) => {
    const bucket = buckets.get(key) ?? { revenue: 0, orderCount: 0 };
    return {
      key,
      label: monthLabel(key),
      revenue: bucket.revenue,
      orderCount: bucket.orderCount,
    };
  });
}
