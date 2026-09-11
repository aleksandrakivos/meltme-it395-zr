import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/labels";
import { OrderDetail } from "./order-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      user: true,
      items: { include: { product: true } },
    },
  });
  if (!order) {
    notFound();
  }

  const items = order.items.map((item) => ({
    id: item.id,
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.price.toNumber(),
    lineTotal: item.price.toNumber() * item.quantity,
  }));

  return (
    <OrderDetail
      order={{
        id: order.id,
        dateLabel: formatDate(order.date),
        customerName: order.customer.name,
        createdByName: order.user.name,
        status: order.status,
        total: items.reduce((sum, item) => sum + item.lineTotal, 0),
        items,
      }}
    />
  );
}
