import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CreateUserSheet } from "./create-user-sheet";
import { UsersTable } from "./users-table";

export default async function UsersPage() {
  const actor = await requireRole([Role.ADMIN]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Korisnici"
        actions={<CreateUserSheet />}
      />
      <UsersTable users={users} currentUserId={actor.id} />
    </div>
  );
}
