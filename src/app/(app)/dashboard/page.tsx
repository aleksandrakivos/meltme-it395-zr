import Link from "next/link";
import { BatchStatus, OrderStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateOnly, formatRsd } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionTitle } from "@/components/section-title";
import { BentoCell, BentoGrid } from "@/components/bento-grid";
import { StatCell } from "@/components/stat-cell";
import { BatchStatusBadge, StatusBadge } from "@/components/status-badge";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireRole([
    Role.ADMIN,
    Role.MENADZER_PROIZVODNJE,
    Role.MENADZER_PRODAJE,
  ]);

  if (user.role === Role.ADMIN) {
    return <OwnerDashboard />;
  }
  if (user.role === Role.MENADZER_PROIZVODNJE) {
    return <ProductionDashboard />;
  }
  return <SalesDashboard />;
}

async function OwnerDashboard() {
  const [ordersByStatus, products, materials, recentOrders, activeBatches] =
    await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.product.findMany({
        select: { stock: true, reserved: true, sellingPrice: true },
      }),
      prisma.material.findMany({
        select: {
          stock: true,
          reserved: true,
          minStock: true,
          avgPurchasePrice: true,
        },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { date: "desc" },
        include: { customer: true, items: true },
      }),
      prisma.productionBatch.findMany({
        where: {
          status: {
            in: [
              BatchStatus.PLANIRANA,
              BatchStatus.ZAPOCETA,
              BatchStatus.U_TOKU,
            ],
          },
        },
        orderBy: { plannedAt: "desc" },
        include: { product: { select: { name: true } } },
      }),
    ]);

  // Niska zaliha se meri po RASPOLOŽIVOM stanju — rezervisano je već obećano seriji.
  const lowStock = materials.filter((m) =>
    m.stock.minus(m.reserved).lt(m.minStock),
  ).length;
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.stock * p.sellingPrice.toNumber(),
    0
  );
  const reservedMaterialValue = materials.reduce(
    (sum, m) => sum + m.reserved.toNumber() * m.avgPurchasePrice.toNumber(),
    0,
  );
  const statusCounts = Object.values(OrderStatus).map((status) => ({
    status,
    count:
      ordersByStatus.find((row) => row.status === status)?._count._all ?? 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontrolna tabla"
        description="Pregled poslovanja ateljea"
      />

      <BentoGrid className="sm:grid-cols-2 lg:grid-cols-3">
        <StatCell
          label="Vrednost zaliha proizvoda"
          value={formatRsd(inventoryValue)}
        />
        <StatCell
          label="Niske zalihe sirovina"
          value={String(lowStock)}
          hint={lowStock > 0 ? "Po raspoloživom stanju" : "Sve iznad minimuma"}
        />
        <StatCell
          label="Serije u toku"
          value={String(activeBatches.length)}
          hint="planirane, započete i u radu"
        />
        <StatCell
          label="Vrednost rezervisanih sirovina"
          value={formatRsd(reservedMaterialValue)}
          hint="zauzeto planiranim serijama"
        />
        <StatCell
          label="Ukupno porudžbina"
          value={String(statusCounts.reduce((sum, row) => sum + row.count, 0))}
        />
        <BentoCell className="bg-wax-rose/40" aria-hidden="true" />
      </BentoGrid>

      {activeBatches.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>Aktivne proizvodne serije</SectionTitle>
            <Link
              href="/batches"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sve serije
            </Link>
          </div>
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Planirano</AppTableHead>
                <AppTableHead>Proizvod</AppTableHead>
                <AppTableHead>Status</AppTableHead>
                <AppTableHead align="right">Komada</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {activeBatches.map((b) => (
                <AppTableRow key={b.id}>
                  <AppTableCell>{formatDateOnly(b.plannedAt)}</AppTableCell>
                  <AppTableCell>
                    <Link
                      href={`/batches/${b.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.product.name}
                    </Link>
                  </AppTableCell>
                  <AppTableCell>
                    <BatchStatusBadge status={b.status} />
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.plannedQuantity}
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionTitle>Porudžbine po statusu</SectionTitle>
        <BentoGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusCounts.map((row) => (
            <BentoCell
              key={row.status}
              className="flex items-center justify-between gap-2 p-4"
            >
              <StatusBadge status={row.status} />
              <span className="font-heading text-xl font-semibold tabular-nums">
                {row.count}
              </span>
            </BentoCell>
          ))}
        </BentoGrid>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle>Poslednje porudžbine</SectionTitle>
          <Link
            href="/orders"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Sve porudžbine
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <EmptyState
            title="Još nema porudžbina"
            action={{ href: "/orders?new=1", label: "Nova porudžbina" }}
          />
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Datum</AppTableHead>
                <AppTableHead>Kupac</AppTableHead>
                <AppTableHead>Status</AppTableHead>
                <AppTableHead align="right">Iznos</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {recentOrders.map((order) => (
                <AppTableRow key={order.id}>
                  <AppTableCell>{formatDateOnly(order.date)}</AppTableCell>
                  <AppTableCell>{order.customer.name}</AppTableCell>
                  <AppTableCell>
                    <StatusBadge status={order.status} />
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {formatRsd(
                      order.items.reduce(
                        (sum, item) =>
                          sum + item.price.toNumber() * item.quantity,
                        0
                      )
                    )}
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>
    </div>
  );
}

async function ProductionDashboard() {
  const [materials, activeBatches, recentBatches] = await Promise.all([
    prisma.material.findMany({
      include: { supplier: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionBatch.findMany({
      where: {
        status: {
          in: [
            BatchStatus.PLANIRANA,
            BatchStatus.ZAPOCETA,
            BatchStatus.U_TOKU,
          ],
        },
      },
      orderBy: { plannedAt: "asc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.productionBatch.findMany({
      take: 5,
      where: {
        status: {
          in: [
            BatchStatus.ZAVRSENA,
            BatchStatus.DELIMICNO_USPESNA,
            BatchStatus.OTKAZANA,
          ],
        },
      },
      orderBy: { completedAt: "desc" },
      include: { product: { select: { name: true } }, user: true },
    }),
  ]);

  // Niska zaliha se meri po RASPOLOŽIVOM stanju — rezervisano je već obećano seriji.
  const lowStock = materials.filter((m) =>
    m.stock.minus(m.reserved).lt(m.minStock),
  );
  const byStatus = (status: BatchStatus) =>
    activeBatches.filter((b) => b.status === status).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontrolna tabla"
        description="Radni red proizvodnje i raspoloživost sirovina"
        actions={
          <Link
            href="/purchases?new=1"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Nova nabavka
          </Link>
        }
      />

      <BentoGrid className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCell
          label="Planirane serije"
          value={String(byStatus(BatchStatus.PLANIRANA))}
          hint="sirovine rezervisane"
        />
        <StatCell
          label="Započete serije"
          value={String(byStatus(BatchStatus.ZAPOCETA))}
          hint="sirovine izdate"
        />
        <StatCell
          label="Serije u radu"
          value={String(byStatus(BatchStatus.U_TOKU))}
        />
        <StatCell
          label="Sirovine ispod minimuma"
          value={String(lowStock.length)}
          hint={
            lowStock.length > 0 ? "Po raspoloživom stanju" : "Sve iznad minimuma"
          }
        />
      </BentoGrid>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle>Radni red — aktivne serije</SectionTitle>
          <Link
            href="/batches"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Sve serije
          </Link>
        </div>
        {activeBatches.length === 0 ? (
          <EmptyState
            title="Nema aktivnih serija"
            description="Planirajte novu seriju — sirovine se rezervišu po recepturi."
            action={{ href: "/batches?new=1", label: "Planiraj seriju" }}
          />
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Planirano</AppTableHead>
                <AppTableHead>Proizvod</AppTableHead>
                <AppTableHead>Status</AppTableHead>
                <AppTableHead align="right">Komada</AppTableHead>
                <AppTableHead>Sledeći korak</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {activeBatches.map((b) => (
                <AppTableRow key={b.id}>
                  <AppTableCell>{formatDateOnly(b.plannedAt)}</AppTableCell>
                  <AppTableCell>
                    <Link
                      href={`/batches/${b.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.product.name}
                    </Link>
                  </AppTableCell>
                  <AppTableCell>
                    <BatchStatusBadge status={b.status} />
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.plannedQuantity}
                  </AppTableCell>
                  <AppTableCell className="text-muted-foreground">
                    {b.status === BatchStatus.PLANIRANA
                      ? "Započni proizvodnju"
                      : "Završi seriju"}
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>Niske zalihe sirovina</SectionTitle>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sve sirovine su iznad minimuma.
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

      <section className="space-y-3">
        <SectionTitle>Poslednje završene serije</SectionTitle>
        {recentBatches.length === 0 ? (
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
                <AppTableHead align="right">Proizvedeno</AppTableHead>
                <AppTableHead align="right">Škart</AppTableHead>
                <AppTableHead>Autor</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {recentBatches.map((b) => (
                <AppTableRow key={b.id}>
                  <AppTableCell>
                    {b.completedAt ? formatDateOnly(b.completedAt) : "—"}
                  </AppTableCell>
                  <AppTableCell>
                    <Link
                      href={`/batches/${b.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.product.name}
                    </Link>
                  </AppTableCell>
                  <AppTableCell>
                    <BatchStatusBadge status={b.status} />
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.producedQuantity ?? "—"}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {b.scrapQuantity > 0 ? b.scrapQuantity : "—"}
                  </AppTableCell>
                  <AppTableCell>{b.user.name}</AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>
    </div>
  );
}

async function SalesDashboard() {
  const [ordersByStatus, products] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        stock: true,
        reserved: true,
        size: true,
      },
    }),
  ]);

  const statusCounts = Object.values(OrderStatus).map((status) => ({
    status,
    count:
      ordersByStatus.find((row) => row.status === status)?._count._all ?? 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontrolna tabla"
        description="Pregled prodaje i raspoloživosti proizvoda"
        actions={
          <Link
            href="/orders?new=1"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Nova porudžbina
          </Link>
        }
      />

      <section className="space-y-3">
        <SectionTitle>Porudžbine po statusu</SectionTitle>
        <BentoGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusCounts.map((row) => (
            <BentoCell
              key={row.status}
              className="flex items-center justify-between gap-2 p-4"
            >
              <StatusBadge status={row.status} />
              <span className="font-heading text-xl font-semibold tabular-nums">
                {row.count}
              </span>
            </BentoCell>
          ))}
        </BentoGrid>
      </section>

      <section className="space-y-3">
        <SectionTitle>Dostupnost proizvoda</SectionTitle>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nema aktivnih proizvoda.
          </p>
        ) : (
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Proizvod</AppTableHead>
                <AppTableHead>Veličina (g)</AppTableHead>
                <AppTableHead align="right">Na stanju</AppTableHead>
                <AppTableHead align="right">Rezervisano</AppTableHead>
                <AppTableHead align="right">Raspoloživo</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {products.map((p) => (
                <AppTableRow key={p.id}>
                  <AppTableCell>{p.name}</AppTableCell>
                  <AppTableCell>{p.size}</AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {p.stock}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {p.reserved > 0 ? p.reserved : "—"}
                  </AppTableCell>
                  <AppTableCell align="right" className="tabular-nums">
                    {p.stock - p.reserved}
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </section>
    </div>
  );
}