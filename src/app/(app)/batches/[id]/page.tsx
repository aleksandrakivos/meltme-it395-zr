import { notFound } from "next/navigation";
import { BatchStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { batchStatusLabel, formatRsd, unitLabel } from "@/lib/labels";
import { roundTo } from "@/lib/services/material-costing";
import { PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { BentoGrid } from "@/components/bento-grid";
import { StatCell } from "@/components/stat-cell";
import { BatchStatusBadge } from "@/components/status-badge";
import { BatchLinesTable } from "./batch-lines-table";
import { BatchStepper } from "./batch-stepper";
import { CancelBatchDialog } from "./cancel-batch-dialog";
import { CompleteBatchDialog } from "./complete-batch-dialog";
import { MarkInProgressButton } from "./mark-in-progress-button";
import { StartBatchDialog } from "./start-batch-dialog";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const { id } = await params;

  const batch = await prisma.productionBatch.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      user: { select: { name: true } },
      startedByUser: { select: { name: true } },
      completedByUser: { select: { name: true } },
      lines: {
        include: { material: true },
        orderBy: { materialId: "asc" },
      },
    },
  });

  if (!batch) {
    notFound();
  }

  const lines = batch.lines.map((line) => {
    const planned = line.plannedQuantity.toNumber();
    const consumed = line.consumedQuantity.toNumber();
    const waste = line.wasteQuantity.toNumber();
    const unitPrice = line.unitPrice.toNumber();
    const stock = line.material.stock.toNumber();
    return {
      materialId: line.materialId,
      materialName: line.material.name,
      unitLabel: unitLabel(line.material.unit),
      plannedQuantity: planned,
      reservedQuantity: line.reservedQuantity.toNumber(),
      issuedQuantity: line.issuedQuantity.toNumber(),
      consumedQuantity: consumed,
      wasteQuantity: waste,
      returnedQuantity: line.returnedQuantity.toNumber(),
      deviation: roundTo(consumed - planned, 3),
      unitPrice,
      stock,
      available: roundTo(stock - line.material.reserved.toNumber(), 3),
      avgPrice: line.material.avgPurchasePrice.toNumber(),
      lineCost: roundTo((consumed + waste) * unitPrice, 2),
    };
  });

  const batchCost = roundTo(
    lines.reduce((sum, line) => sum + line.lineCost, 0),
    2,
  );
  const issuedValue = roundTo(
    lines.reduce((sum, line) => sum + line.issuedQuantity * line.unitPrice, 0),
    2,
  );
  const plannedValue = roundTo(
    lines.reduce((sum, line) => sum + line.plannedQuantity * line.avgPrice, 0),
    2,
  );
  const actualUnitCost =
    batch.producedQuantity && batch.producedQuantity > 0
      ? roundTo(batchCost / batch.producedQuantity, 4)
      : null;

  const isPlanned = batch.status === BatchStatus.PLANIRANA;
  const isStarted = batch.status === BatchStatus.ZAPOCETA;
  const isInProgress = batch.status === BatchStatus.U_TOKU;
  const isRunning = isStarted || isInProgress;
  const isTerminal = !isPlanned && !isRunning;

  const completeDialog = (variant: "default" | "outline") => (
    <CompleteBatchDialog
      batchId={batch.id}
      plannedQuantity={batch.plannedQuantity}
      variant={variant}
      lines={lines.map((line) => ({
        materialId: line.materialId,
        materialName: line.materialName,
        unitLabel: line.unitLabel,
        plannedQuantity: line.plannedQuantity,
        issuedQuantity: line.issuedQuantity,
        unitPrice: line.unitPrice,
      }))}
    />
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Serija — ${batch.product.name}`}
        description={`Planirano ${batch.plannedQuantity} kom`}
        backHref="/batches"
        backLabel="Proizvodne serije"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BatchStatusBadge status={batch.status} />
            {/* Jedna primarna akcija = sledeći korak u toku; ostalo je sekundarno. */}
            {isPlanned ? (
              <StartBatchDialog
                batchId={batch.id}
                lines={lines.map((line) => ({
                  materialId: line.materialId,
                  materialName: line.materialName,
                  unitLabel: line.unitLabel,
                  plannedQuantity: line.plannedQuantity,
                  reservedQuantity: line.reservedQuantity,
                  stock: line.stock,
                  avgPrice: line.avgPrice,
                }))}
              />
            ) : null}
            {isStarted ? (
              <>
                <MarkInProgressButton batchId={batch.id} variant="default" />
                {completeDialog("outline")}
              </>
            ) : null}
            {isInProgress ? completeDialog("default") : null}
            {!isTerminal ? (
              <CancelBatchDialog
                batchId={batch.id}
                hint={
                  isPlanned
                    ? "Rezervacije sirovina se oslobađaju; stanje se ne menja."
                    : "Neutrošene izdate sirovine se vraćaju na zalihe; već utrošeno ostaje kao trošak."
                }
              />
            ) : null}
          </div>
        }
      />

      <section className="space-y-4">
        <BatchStepper
          status={batch.status}
          plannedAt={batch.plannedAt}
          plannedBy={batch.user.name}
          startedAt={batch.startedAt}
          startedBy={batch.startedByUser?.name ?? null}
          completedAt={batch.completedAt}
          completedBy={batch.completedByUser?.name ?? null}
        />
        {batch.note ? (
          <p className="text-sm text-muted-foreground">
            Napomena: {batch.note}
          </p>
        ) : null}
        {batch.cancelReason ? (
          <p className="text-sm text-destructive">
            Razlog otkazivanja: {batch.cancelReason}
          </p>
        ) : null}
      </section>

      <BentoGrid className="sm:grid-cols-2 lg:grid-cols-4">
        <StatCell
          label="Planirano / proizvedeno"
          value={`${batch.plannedQuantity} / ${batch.producedQuantity ?? "—"}`}
          hint={
            batch.scrapQuantity > 0 ? `Škart ${batch.scrapQuantity}` : undefined
          }
        />
        <StatCell
          label={
            isPlanned
              ? "Planska vrednost sirovina"
              : isTerminal
                ? "Trošak serije"
                : "Vrednost izdatog"
          }
          value={formatRsd(
            isPlanned ? plannedValue : isTerminal ? batchCost : issuedValue,
          )}
          hint={isPlanned ? "po trenutnom proseku" : undefined}
        />
        <StatCell
          label="Stvarna cena koštanja"
          value={actualUnitCost === null ? "—" : formatRsd(actualUnitCost)}
          hint="po ispravnom komadu"
        />
        <StatCell label="Status" value={batchStatusLabel(batch.status)} />
      </BentoGrid>

      <section className="space-y-3">
        <SectionTitle>Sirovine</SectionTitle>
        <BatchLinesTable status={batch.status} lines={lines} />
      </section>
    </div>
  );
}
