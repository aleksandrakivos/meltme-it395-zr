"use client";

import Link from "next/link";
import { useState } from "react";
import { BatchStatus } from "@prisma/client";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatRsd } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type BatchLineRow = {
  materialId: string;
  materialName: string;
  unitLabel: string;
  plannedQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  wasteQuantity: number;
  returnedQuantity: number;
  deviation: number;
  lineCost: number;
  /** Raspoloživo stanje sirovine (stanje − sve rezervacije). */
  available: number;
};

type ColumnKey =
  | "planned"
  | "reserved"
  | "available"
  | "issued"
  | "consumed"
  | "waste"
  | "returned"
  | "deviation"
  | "cost";

const ALL_COLUMNS: ColumnKey[] = [
  "planned",
  "reserved",
  "available",
  "issued",
  "consumed",
  "waste",
  "returned",
  "deviation",
  "cost",
];

/** Podrazumevane kolone po fazi — samo ono što je u tom trenutku relevantno. */
function defaultColumns(status: BatchStatus): ColumnKey[] {
  switch (status) {
    case BatchStatus.PLANIRANA:
      return ["planned", "reserved", "available"];
    case BatchStatus.ZAPOCETA:
    case BatchStatus.U_TOKU:
      return ["planned", "issued"];
    case BatchStatus.OTKAZANA:
      return ["planned", "issued", "consumed", "returned", "cost"];
    default:
      return ["planned", "issued", "consumed", "waste", "returned", "deviation", "cost"];
  }
}

const HEADERS: Record<ColumnKey, string> = {
  planned: "Planirano",
  reserved: "Rezervisano",
  available: "Raspoloživo",
  issued: "Izdato",
  consumed: "Utrošeno",
  waste: "Otpad",
  returned: "Vraćeno",
  deviation: "Odstupanje",
  cost: "Trošak",
};

export function BatchLinesTable({
  status,
  lines,
}: {
  status: BatchStatus;
  lines: BatchLineRow[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ALL_COLUMNS : defaultColumns(status);
  const has = (key: ColumnKey) => visible.includes(key);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Switch
          id="batch-lines-all"
          checked={showAll}
          onCheckedChange={setShowAll}
        />
        <Label htmlFor="batch-lines-all" className="text-sm font-normal">
          Prikaži sve kolone
        </Label>
      </div>

      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Sirovina</AppTableHead>
            {visible.map((key) => (
              <AppTableHead key={key} align="right">
                {HEADERS[key]}
              </AppTableHead>
            ))}
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {lines.map((line) => (
            <AppTableRow key={line.materialId}>
              <AppTableCell>
                <Link
                  href={`/materials/${line.materialId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {line.materialName}
                </Link>
                <span className="ml-1 text-xs text-muted-foreground">
                  {line.unitLabel}
                </span>
              </AppTableCell>
              {has("planned") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.plannedQuantity}
                </AppTableCell>
              ) : null}
              {has("reserved") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.reservedQuantity}
                </AppTableCell>
              ) : null}
              {has("available") ? (
                <AppTableCell
                  align="right"
                  className={cn(
                    "tabular-nums",
                    line.available < 0 ? "text-destructive" : "text-wax-sage-foreground",
                  )}
                >
                  {line.available}
                </AppTableCell>
              ) : null}
              {has("issued") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.issuedQuantity}
                </AppTableCell>
              ) : null}
              {has("consumed") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.consumedQuantity}
                </AppTableCell>
              ) : null}
              {has("waste") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.wasteQuantity}
                </AppTableCell>
              ) : null}
              {has("returned") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.returnedQuantity}
                </AppTableCell>
              ) : null}
              {has("deviation") ? (
                <AppTableCell
                  align="right"
                  className={cn(
                    "tabular-nums",
                    line.deviation > 0 && "text-destructive",
                    line.deviation < 0 && "text-wax-sage-foreground",
                  )}
                >
                  {line.deviation > 0 ? "+" : ""}
                  {line.deviation}
                </AppTableCell>
              ) : null}
              {has("cost") ? (
                <AppTableCell align="right" className="tabular-nums">
                  {line.lineCost > 0 ? formatRsd(line.lineCost) : "—"}
                </AppTableCell>
              ) : null}
            </AppTableRow>
          ))}
        </AppTableBody>
      </AppTable>
      {has("deviation") ? (
        <p className="text-xs text-muted-foreground">
          Odstupanje je razlika utrošenog i recepturom planiranog. Otpad ulazi u
          trošak serije, povraćaj ne.
        </p>
      ) : null}
    </div>
  );
}
