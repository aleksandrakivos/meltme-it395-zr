import Link from "next/link";
import { BatchStatus, OrderStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  calculateActualUnitCost,
  calculateCostVariance,
  calculateMargin,
  calculatePlannedUnitCost,
} from "@/lib/services/cogs";
import { buildPriceHistory, roundTo } from "@/lib/services/material-costing";
import { buildMonthlySales } from "@/lib/services/sales-report";
import {
  formatDateOnly,
  formatRsd,
  priceUnitLabel,
  toDisplayPrice,
} from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { BatchStatusBadge } from "@/components/status-badge";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { cn } from "@/lib/utils";
import { MonthlySalesChart } from "./monthly-sales-chart";
import { PurchasePriceSection } from "./purchase-price-section";
import { TopSellersChart } from "./top-sellers-chart";

const COMPLETED_BATCH_STATUSES = [
  BatchStatus.ZAVRSENA,
  BatchStatus.DELIMICNO_USPESNA,
];

export default async function ReportsPage() {
  await requireRole([Role.ADMIN]);

  const [products, orderItems, materials, orders, completedBatches] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: { name: "asc" },
        include: {
          recipeItems: {
            include: { material: { select: { avgPurchasePrice: true } } },
          },
        },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { not: OrderStatus.OTKAZANA } } },
        include: { product: { select: { name: true } } },
      }),
      prisma.material.findMany({
        orderBy: { name: "asc" },
        include: {
          supplier: true,
          purchases: {
            orderBy: [{ purchasedAt: "asc" }, { createdAt: "asc" }],
            select: { quantity: true, unitPrice: true, purchasedAt: true },
          },
        },
      }),
      prisma.order.findMany({
        where: { status: { not: OrderStatus.OTKAZANA } },
        select: {
          date: true,
          items: { select: { price: true, quantity: true } },
        },
      }),
      prisma.productionBatch.findMany({
        where: { status: { in: COMPLETED_BATCH_STATUSES } },
        orderBy: { completedAt: "desc" },
        include: {
          product: { select: { id: true, name: true } },
          lines: { include: { material: { select: { name: true } } } },
        },
      }),
    ]);

  /** Trošak serije = (utrošeno + otpad) × snimljena cena. Povraćaj ne ulazi. */
  const batchSummaries = completedBatches.map((batch) => {
    const consumed = batch.lines.reduce(
      (sum, line) => sum + line.consumedQuantity.toNumber(),
      0,
    );
    const waste = batch.lines.reduce(
      (sum, line) => sum + line.wasteQuantity.toNumber(),
      0,
    );
    const issued = batch.lines.reduce(
      (sum, line) => sum + line.issuedQuantity.toNumber(),
      0,
    );
    const plannedMaterial = batch.lines.reduce(
      (sum, line) => sum + line.plannedQuantity.toNumber(),
      0,
    );
    const batchCost = roundTo(
      batch.lines.reduce(
        (sum, line) =>
          sum +
          (line.consumedQuantity.toNumber() + line.wasteQuantity.toNumber()) *
            line.unitPrice.toNumber(),
        0,
      ),
      2,
    );
    const produced = batch.producedQuantity ?? 0;
    const totalPieces = produced + batch.scrapQuantity;
    return {
      id: batch.id,
      productId: batch.product.id,
      productName: batch.product.name,
      status: batch.status,
      completedAtLabel: batch.completedAt
        ? formatDateOnly(batch.completedAt)
        : "—",
      plannedQuantity: batch.plannedQuantity,
      producedQuantity: produced,
      scrapQuantity: batch.scrapQuantity,
      scrapPercent: totalPieces > 0 ? (batch.scrapQuantity / totalPieces) * 100 : 0,
      wastePercent: issued > 0 ? (waste / issued) * 100 : 0,
      materialDeviation: roundTo(consumed - plannedMaterial, 3),
      batchCost,
      actualUnitCost: produced > 0 ? roundTo(batchCost / produced, 4) : null,
    };
  });

  const batchesByProduct = new Map<
    string,
    Array<{ batchCost: number; producedQuantity: number }>
  >();
  for (const batch of batchSummaries) {
    const list = batchesByProduct.get(batch.productId) ?? [];
    list.push({
      batchCost: batch.batchCost,
      producedQuantity: batch.producedQuantity,
    });
    batchesByProduct.set(batch.productId, list);
  }

  const cogsRows = products.map((p) => {
    const sellingPrice = p.sellingPrice.toNumber();
    const hasRecipe = p.recipeItems.length > 0;
    const plannedCost = hasRecipe
      ? calculatePlannedUnitCost(
          p.recipeItems.map((item) => ({
            quantity: item.quantity.toNumber(),
            avgPurchasePrice: item.material.avgPurchasePrice.toNumber(),
          })),
        )
      : null;
    const actualCost = calculateActualUnitCost(
      batchesByProduct.get(p.id) ?? [],
    );
    const variance =
      plannedCost === null
        ? null
        : calculateCostVariance(plannedCost, actualCost);

    return {
      id: p.id,
      name: p.name,
      sellingPrice,
      plannedCost,
      actualCost,
      variance,
      plannedMargin:
        plannedCost === null ? null : calculateMargin(sellingPrice, plannedCost),
      actualMargin:
        actualCost === null ? null : calculateMargin(sellingPrice, actualCost),
    };
  });

  const soldByProduct = new Map<string, { name: string; quantity: number }>();
  for (const item of orderItems) {
    const current = soldByProduct.get(item.productId) ?? {
      name: item.product.name,
      quantity: 0,
    };
    current.quantity += item.quantity;
    soldByProduct.set(item.productId, current);
  }
  const topSellers = [...soldByProduct.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const monthlySales = buildMonthlySales(
    orders.map((order) => ({
      date: order.date,
      revenue: order.items.reduce(
        (sum, item) => sum + item.price.toNumber() * item.quantity,
        0,
      ),
    })),
  );

  const lowStock = materials.filter((m) =>
    m.stock.minus(m.reserved).lt(m.minStock),
  );

  const priceSeries = materials
    .filter((m) => m.purchases.length > 0)
    .map((m) => {
      const history = buildPriceHistory(
        m.purchases.map((purchase) => ({
          quantity: purchase.quantity.toNumber(),
          unitPrice: purchase.unitPrice.toNumber(),
        })),
      );
      return {
        id: m.id,
        name: m.name,
        unitLabel: priceUnitLabel(m.unit),
        points: history.map((point, index) => ({
          label: formatDateOnly(m.purchases[index].purchasedAt),
          unitPrice: toDisplayPrice(point.unitPrice, m.unit),
          runningAverage: toDisplayPrice(point.runningAverage, m.unit),
        })),
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Izveštaji"
      />

      <section className="space-y-3">
        <SectionTitle>Cena koštanja: planska vs stvarna</SectionTitle>
        <AppTable>
          <AppTableHeader>
            <AppTableRow>
              <AppTableHead>Proizvod</AppTableHead>
              <AppTableHead align="right">Prodajna cena</AppTableHead>
              <AppTableHead align="right">Planska</AppTableHead>
              <AppTableHead align="right">Stvarna</AppTableHead>
              <AppTableHead align="right">Odstupanje</AppTableHead>
              <AppTableHead align="right">Marža (planska)</AppTableHead>
              <AppTableHead align="right">Marža (stvarna)</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {cogsRows.map((row) => (
              <AppTableRow key={row.id}>
                <AppTableCell>{row.name}</AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {formatRsd(row.sellingPrice)}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {row.plannedCost === null ? "—" : formatRsd(row.plannedCost)}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {row.actualCost === null ? "—" : formatRsd(row.actualCost)}
                </AppTableCell>
                <AppTableCell
                  align="right"
                  className={cn(
                    "tabular-nums",
                    row.variance && row.variance.absolute > 0 && "text-destructive",
                    row.variance && row.variance.absolute < 0 && "text-wax-sage-foreground",
                  )}
                >
                  {row.variance === null
                    ? "—"
                    : `${row.variance.absolute > 0 ? "+" : ""}${formatRsd(row.variance.absolute)} (${row.variance.percent.toFixed(1)}%)`}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {row.plannedMargin === null
                    ? "—"
                    : `${formatRsd(row.plannedMargin.margin)} · ${row.plannedMargin.marginPercent.toFixed(1)}%`}
                </AppTableCell>
                <AppTableCell align="right" className="tabular-nums">
                  {row.actualMargin === null
                    ? "—"
                    : `${formatRsd(row.actualMargin.margin)} · ${row.actualMargin.marginPercent.toFixed(1)}%`}
                </AppTableCell>
              </AppTableRow>
            ))}
          </AppTableBody>
        </AppTable>
        <p className="text-xs text-muted-foreground">
          Planska cena prati trenutnu prosečnu nabavnu cenu. Stvarna se računa
          iz troška završenih serija, snimljenog u trenutku izdavanja — zato je
          kasnija promena nabavne cene ne menja unazad.
        </p>
      </section>

      <section className="space-y-3">
        <SectionTitle>Efikasnost proizvodnje</SectionTitle>
        {batchSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Još nema završenih serija.
          </p>
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Završeno</AppTableHead>
                <AppTableHead>Proizvod</AppTableHead>
                <AppTableHead>Status</AppTableHead>
                <AppTableHead align="right">Planirano</AppTableHead>
                <AppTableHead align="right">Proizvedeno</AppTableHead>
                <AppTableHead align="right">Škart %</AppTableHead>
                <AppTableHead align="right">Otpad %</AppTableHead>
                <AppTableHead align="right">Odstupanje od recepture</AppTableHead>
                <AppTableHead align="right">Cena po komadu</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {batchSummaries.map((b) => (
                <AppTableRow key={b.id}>
                  <AppTableCell>{b.completedAtLabel}</AppTableCell>
                  <AppTableCell>
                    <Link
                      href={`/batches/${b.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.productName}
                    </Link>
                  </AppTableCell>
                  <AppTableCell>
                    <BatchStatusBadge status={b.status} />
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.plannedQuantity}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.producedQuantity}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.scrapPercent.toFixed(1)}%
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.wastePercent.toFixed(1)}%
                  </AppTableCell>
                  <AppTableCell
                    align="right"
                    className={cn(
                      "tabular-nums",
                      b.materialDeviation > 0 && "text-destructive",
                      b.materialDeviation < 0 && "text-wax-sage-foreground",
                    )}
                  >
                    {b.materialDeviation > 0 ? "+" : ""}
                    {b.materialDeviation}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.actualUnitCost === null
                      ? "—"
                      : formatRsd(b.actualUnitCost)}
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>Kretanje nabavnih cena</SectionTitle>
        <PurchasePriceSection series={priceSeries} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Prodaja po mesecima</SectionTitle>
        <MonthlySalesChart data={monthlySales} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Najprodavaniji proizvodi</SectionTitle>
        <TopSellersChart data={topSellers} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Sirovine ispod minimuma</SectionTitle>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nema sirovina ispod minimuma po raspoloživom stanju.
          </p>
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Sirovina</AppTableHead>
                <AppTableHead align="right">Stanje</AppTableHead>
                <AppTableHead align="right">Rezervisano</AppTableHead>
                <AppTableHead align="right">Raspoloživo</AppTableHead>
                <AppTableHead align="right">Minimum</AppTableHead>
                <AppTableHead>Dobavljač</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {lowStock.map((m) => (
                <AppTableRow key={m.id}>
                  <AppTableCell>
                    <Link
                      href={`/materials/${m.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {m.name}
                    </Link>
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {m.stock.toNumber()}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {m.reserved.toNumber()}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {m.stock.minus(m.reserved).toNumber()}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {m.minStock.toNumber()}
                  </AppTableCell>
                  <AppTableCell>{m.supplier?.name ?? "—"}</AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>
    </div>
  );
}
