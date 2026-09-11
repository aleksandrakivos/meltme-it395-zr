import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CreateCustomerSheet } from "./create-customer-sheet";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PRODAJE]);
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kupci"
        actions={<CreateCustomerSheet />}
      />
      <CustomersTable
        createAction={<CreateCustomerSheet variant="outline" />}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          ordersCount: c._count.orders,
        }))}
      />
    </div>
  );
}
