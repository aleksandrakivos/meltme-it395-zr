"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  CheckCircleIcon,
  PencilSimpleIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { setUserActive } from "@/actions/users";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { FormSheet } from "@/components/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/nav";
import { notifyError, notifySuccess } from "@/lib/notify";
import { UserEditForm } from "./[id]/edit/user-edit-form";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

function EditUserSheet({
  user,
  isSelf,
}: {
  user: UserListItem;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Izmena korisnika"
      dirty={dirty}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <PencilSimpleIcon weight="duotone" data-icon="inline-start" />
          Izmeni
        </Button>
      }
    >
      <UserEditForm user={user} isSelf={isSelf} onDirtyChange={setDirty} onSuccess={() => setOpen(false)} />
    </FormSheet>
  );
}

type UsersTableProps = {
  users: UserListItem[];
  currentUserId: string;
};

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();

  return (
    <DataTable
      data={users}
      searchKey="name"
      searchPlaceholder="Pretraga po imenu…"
      emptyMessage="Još nema korisnika"
      columns={[
        { header: "Ime", cell: (u) => u.name },
        { header: "Email", cell: (u) => u.email },
        { header: "Uloga", cell: (u) => roleLabel(u.role) },
        {
          header: "Status",
          cell: (u) =>
            u.active ? (
              <Badge variant="secondary">Aktivan</Badge>
            ) : (
              <Badge variant="outline">Neaktivan</Badge>
            ),
        },
        {
          header: "",
          className: "w-[1%] whitespace-nowrap",
          cell: (u) => (
            <div className="flex items-center justify-end gap-2">
              <EditUserSheet user={u} isSelf={u.id === currentUserId} />
              {u.id !== currentUserId ? (
                u.active ? (
                  <ConfirmDialog
                    triggerLabel="Deaktiviraj"
                    triggerIcon={
                      <ProhibitIcon weight="duotone" data-icon="inline-start" />
                    }
                    title="Deaktivirati korisnika?"
                    description={`Nalog ${u.name} neće moći da se prijavi.`}
                    confirmLabel="Deaktiviraj"
                    onConfirm={async () => {
                      const result = await setUserActive({
                        id: u.id,
                        active: false,
                      });
                      if (!result.ok) {
                        notifyError(result.error);
                        return;
                      }
                      notifySuccess("Korisnik je deaktiviran");
                      router.refresh();
                    }}
                  />
                ) : (
                  <ConfirmDialog
                    triggerLabel="Aktiviraj"
                    triggerIcon={
                      <CheckCircleIcon
                        weight="duotone"
                        data-icon="inline-start"
                      />
                    }
                    title="Aktivirati korisnika?"
                    description={`Nalog ${u.name} će ponovo moći da se prijavi.`}
                    confirmLabel="Aktiviraj"
                    variant="outline"
                    onConfirm={async () => {
                      const result = await setUserActive({
                        id: u.id,
                        active: true,
                      });
                      if (!result.ok) {
                        notifyError(result.error);
                        return;
                      }
                      notifySuccess("Korisnik je aktiviran");
                      router.refresh();
                    }}
                  />
                )
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
