"use client";

import { useState } from "react";
import {
  PurchasePriceChart,
  type PurchasePricePoint,
} from "@/components/purchase-price-chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MaterialPriceSeries = {
  id: string;
  name: string;
  unitLabel: string;
  points: PurchasePricePoint[];
};

export function PurchasePriceSection({
  series,
}: {
  series: MaterialPriceSeries[];
}) {
  const [materialId, setMaterialId] = useState(series[0]?.id ?? "");

  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Još nema evidentiranih nabavki za prikaz kretanja cena.
      </p>
    );
  }

  const selected = series.find((s) => s.id === materialId) ?? series[0];
  const items = series.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Sirovina
        </Label>
        <Select
          value={selected.id}
          onValueChange={(value) => setMaterialId(value ?? selected.id)}
          items={items}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PurchasePriceChart
        data={selected.points}
        unitLabel={selected.unitLabel}
      />
    </div>
  );
}
