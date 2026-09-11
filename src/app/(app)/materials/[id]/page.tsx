import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatDateOnly,
  formatRsd,
  formatUnitPrice,
  materialTypeLabel,
  priceUnitLabel,
  stockMovementDirection,
  stockMovementTypeLabel,
  toDisplayPrice,
  unitLabel,
} from "@/lib/labels";
import { buildPriceHistory } from "@/lib/services/material-costing";
import { PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { BentoGrid } from "@/components/bento-grid";
import { StatCell } from "@/components/stat-cell";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { cn } from "@/lib/utils";
import { CreatePurchaseSheet } from "../../purchases/create-purchase-sheet";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
import { EmptyState } from "@/components/empty-state";
import { PurchasePriceChart } from "@/components/purchase-price-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const { id } = await params;

  const [material, suppliers] = await Promise.all([
    prisma.material.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        purchases: {
          orderBy: [{ purchasedAt: "asc" }, { createdAt: "asc" }],
          include: {
            supplier: { select: { name: true } },
            user: { select: { name: true } },
          },
        },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!material) {
    notFound();
  }

  const unit = unitLabel(material.unit);
  const stock = material.stock.toNumber();
  const reserved = material.reserved.toNumber();
  const available = stock - reserved;
  const avgPrice = material.avgPurchasePrice.toNumber();

  // Prosek se rekonstruiše iz istorije nabavki — isti obračun kao u akciji.
  const history = buildPriceHistory(
    material.purchases.map((p) => ({
      quantity: p.quantity.toNumber(),
      unitPrice: p.unitPrice.toNumber(),
    })),
  );
  // Grafikon prikazuje cene po praktičnoj jedinici (kg / l / kom).
  const pricePoints = history.map((point, index) => ({
    label: formatDateOnly(material.purchases[index].purchasedAt),
    unitPrice: toDisplayPrice(point.unitPrice, material.unit),
    runningAverage: toDisplayPrice(point.runningAverage, material.unit),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={material.name}
        description={`${materialTypeLabel(material.type)} · ${material.supplier?.name ?? "bez dobavljača"}`}
        backHref="/materials"
        backLabel="Sirovine"
        actions={
          <div className="flex items-center gap-2">
            {user.role === Role.ADMIN ? (
              <AdjustStockDialog
                materialId={material.id}
                materialName={material.name}
                unit={material.unit}
                stock={stock}
              />
            ) : null}
            <CreatePurchaseSheet
              lockedMaterialId={material.id}
              materials={[
                {
                  id: material.id,
                  name: material.name,
                  unit: material.unit,
                  stock,
                  avgPurchasePrice: avgPrice,
                  supplierId: material.supplierId,
                },
              ]}
              suppliers={suppliers}
              today={new Date().toISOString().slice(0, 10)}
            />
          </div>
        }
      />

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList variant="line" aria-label="Sekcije sirovine">
          <TabsTrigger value="overview" className="px-3 text-sm">
            Pregled
          </TabsTrigger>
          <TabsTrigger value="purchases" className="px-3 text-sm">
            Nabavke
            <span className="font-mono text-[11px] text-muted-foreground">
              {material.purchases.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="px-3 text-sm">
            Kretanje zaliha
            <span className="font-mono text-[11px] text-muted-foreground">
              {material.movements.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 text-sm">
          <BentoGrid className="sm:grid-cols-2 lg:grid-cols-4">
            <StatCell label="Stanje" value={`${stock} ${unit}`} />
            <StatCell label="Rezervisano" value={`${reserved} ${unit}`} />
            <StatCell
              label="Raspoloživo"
              value={`${available} ${unit}`}
              hint={
                available < material.minStock.toNumber()
                  ? "Ispod minimuma"
                  : undefined
              }
            />
            <StatCell
              label="Prosečna nabavna cena"
              value={
                avgPrice > 0 ? formatUnitPrice(avgPrice, material.unit) : "—"
              }
              hint={`Vrednost zaliha ${formatRsd(stock * avgPrice)}`}
            />
          </BentoGrid>

          <section className="space-y-3">
            <SectionTitle>Kretanje nabavne cene</SectionTitle>
            <PurchasePriceChart
              data={pricePoints}
              unitLabel={priceUnitLabel(material.unit)}
            />
          </section>
        </TabsContent>

        <TabsContent value="purchases" className="text-sm">
          {material.purchases.length === 0 ? (
            <EmptyState
              title="Još nema evidentiranih nabavki"
              description="Prva nabavka postavlja prosečnu nabavnu cenu i stanje ove sirovine."
            />
          ) : (
            <AppTable>
              <AppTableHeader>
                <AppTableRow>
                  <AppTableHead>Datum</AppTableHead>
                  <AppTableHead>Dobavljač</AppTableHead>
                  <AppTableHead align="right">Količina</AppTableHead>
                  <AppTableHead align="right">
                    Cena ({priceUnitLabel(material.unit)})
                  </AppTableHead>
                  <AppTableHead align="right">Ukupno</AppTableHead>
                  <AppTableHead>Dokument</AppTableHead>
                  <AppTableHead>Korisnik</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {[...material.purchases].reverse().map((p) => (
                  <AppTableRow key={p.id}>
                    <AppTableCell>{formatDateOnly(p.purchasedAt)}</AppTableCell>
                    <AppTableCell>{p.supplier?.name ?? "—"}</AppTableCell>
                    <AppTableCell align="right" className="tabular-nums">
                      {p.quantity.toNumber()} {unit}
                    </AppTableCell>
                    <AppTableCell align="right" className="tabular-nums">
                      {formatRsd(
                        toDisplayPrice(p.unitPrice.toNumber(), material.unit),
                      )}
                    </AppTableCell>
                    <AppTableCell align="right" className="tabular-nums">
                      {formatRsd(p.totalCost.toNumber())}
                    </AppTableCell>
                    <AppTableCell>{p.documentNo ?? "—"}</AppTableCell>
                    <AppTableCell>{p.user.name}</AppTableCell>
                  </AppTableRow>
                ))}
              </AppTableBody>
            </AppTable>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-3 text-sm">
          {material.movements.length === 0 ? (
            <EmptyState
              title="Još nema evidentiranih kretanja"
              description="Nabavke, izdavanja u proizvodnju i korekcije se beleže ovde."
            />
          ) : (
            <AppTable>
              <AppTableHeader>
                <AppTableRow>
                  <AppTableHead>Vreme</AppTableHead>
                  <AppTableHead>Vrsta</AppTableHead>
                  <AppTableHead align="right">Količina</AppTableHead>
                  <AppTableHead align="right">
                    Cena ({priceUnitLabel(material.unit)})
                  </AppTableHead>
                  <AppTableHead>Napomena</AppTableHead>
                  <AppTableHead>Korisnik</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {material.movements.map((m) => {
                  const direction = stockMovementDirection(m.type);
                  return (
                    <AppTableRow key={m.id}>
                      <AppTableCell>{formatDate(m.createdAt)}</AppTableCell>
                      <AppTableCell>
                        {stockMovementTypeLabel(m.type)}
                      </AppTableCell>
                      <AppTableCell
                        align="right"
                        className={cn(
                          "tabular-nums",
                          direction > 0
                            ? "text-wax-sage-foreground"
                            : "text-destructive",
                        )}
                      >
                        {direction > 0 ? "+" : "−"}
                        {m.quantity.toNumber()} {unit}
                      </AppTableCell>
                      <AppTableCell align="right" className="tabular-nums">
                        {formatRsd(
                          toDisplayPrice(m.unitPrice.toNumber(), material.unit),
                        )}
                      </AppTableCell>
                      <AppTableCell>{m.note ?? "—"}</AppTableCell>
                      <AppTableCell>{m.user.name}</AppTableCell>
                    </AppTableRow>
                  );
                })}
              </AppTableBody>
            </AppTable>
          )}
          {material.movements.length >= 50 ? (
            <p className="text-xs text-muted-foreground">
              Prikazano je poslednjih 50 kretanja. Kompletna istorija je u
              modulu „Kretanje zaliha“.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
