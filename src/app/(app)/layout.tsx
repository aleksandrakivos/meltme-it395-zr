import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/toast";
import { getNavGroupsForRole, roleLabel } from "@/lib/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const { name, role } = session.user;
  const navGroups = getNavGroupsForRole(role);

  return (
    <Toaster>
      <AppShell
        userName={name ?? session.user.email ?? "Korisnik"}
        userRoleLabel={roleLabel(role)}
        navGroups={navGroups}
      >
        {children}
      </AppShell>
    </Toaster>
  );
}
