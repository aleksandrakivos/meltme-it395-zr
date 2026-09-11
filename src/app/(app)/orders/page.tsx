import { OrderStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { CreateOrderSheet } from "./create-order-sheet";
import { OrdersTable } from "./orders-table";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

function parseStatus(value: string | undefined): OrderStatus | "ALL" {
  if (!value) return "ALL";
  const statuses = Object.values(OrderStatus) as string[];
  if (statuses.includes(value)) {
    return value as OrderStatus;
  }
  return "ALL";
}

export default async function OrdersPage({ searchParams }: PageProps) {
  await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
  const params = await searchParams;
  const statusFilter = parseStatus(params.status);

  const [orders, totalOrders, customers, products] = await Promise.all([
    prisma.order.findMany({
      where: statusFilter === "ALL" ? undefined : { status: statusFilter },
      orderBy: { date: "desc" },
      include: {
        customer: true,
        items: true,
      },
    }),
    prisma.order.count(),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const customerOptions = customers.map((c) => ({ id: c.id, name: c.name }));
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    available: p.stock - p.reserved,
    sellingPrice: p.sellingPrice.toNumber(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Porudžbine"
        actions={
          <CreateOrderSheet
            customers={customerOptions}
            products={productOptions}
          />
        }
      />
      <OrdersTable
        hasAnyOrders={totalOrders > 0}
        createAction={
          <CreateOrderSheet
            customers={customerOptions}
            products={productOptions}
            variant="outline"
            openFromQuery={false}
          />
        }
        orders={orders.map((o) => ({
          id: o.id,
          dateLabel: formatDateOnly(o.date),
          customerName: o.customer.name,
          status: o.status,
          itemCount: o.items.length,
          total: o.items.reduce(
            (sum, item) => sum + item.price.toNumber() * item.quantity,
            0,
          ),
        }))}
      />
    </div>
  );
}
