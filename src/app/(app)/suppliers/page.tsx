import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CreateSupplierSheet } from "./create-supplier-sheet";
import { SuppliersTable } from "./suppliers-table";

export default async function SuppliersPage() {
  await requireRole([Role.ADMIN, Role.MENADZER_PROIZVODNJE]);
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { materials: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dobavljači"
        actions={<CreateSupplierSheet />}
      />
      <SuppliersTable
        createAction={<CreateSupplierSheet variant="outline" />}
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contact: s.contact,
          phone: s.phone,
          email: s.email,
          materialsCount: s._count.materials,
        }))}
      />
    </div>
  );
}
