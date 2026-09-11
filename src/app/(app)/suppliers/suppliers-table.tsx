"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { deleteSupplier } from "@/actions/suppliers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { SupplierForm } from "./supplier-form";

export type SupplierListItem = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  materialsCount: number;
};

function EditSupplierSheet({ supplier }: { supplier: SupplierListItem }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Izmena dobavljača"
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
      <SupplierForm mode="edit" supplier={supplier} onDirtyChange={setDirty} onSuccess={() => setOpen(false)} />
    </FormSheet>
  );
}

type SuppliersTableProps = {
  suppliers: SupplierListItem[];
  createAction?: React.ReactNode;
};

export function SuppliersTable({
  suppliers,
  createAction,
}: SuppliersTableProps) {
  const router = useRouter();

  return (
    <DataTable
      data={suppliers}
      searchKey="name"
      searchPlaceholder="Pretraga po nazivu…"
      emptyMessage="Nema dobavljača za zadatu pretragu"
      empty={{
        title: "Još nema dobavljača",
        description:
          "Dobavljač se bira pri svakoj nabavci, pa ga dodajte pre prve nabavke.",
        action: createAction,
      }}
      columns={[
        { header: "Naziv", cell: (s) => s.name },
        { header: "Kontakt", cell: (s) => s.contact ?? "—" },
        { header: "Telefon", cell: (s) => s.phone ?? "—" },
        { header: "Email", cell: (s) => s.email ?? "—" },
        {
          header: "",
          className: "w-[1%] whitespace-nowrap",
          cell: (s) => (
            <div className="flex items-center justify-end gap-2">
              <EditSupplierSheet supplier={s} />
              <ConfirmDialog
                triggerLabel="Obriši"
                triggerIcon={
                  <TrashIcon weight="duotone" data-icon="inline-start" />
                }
                title="Obrisati dobavljača?"
                description={
                  s.materialsCount > 0
                    ? "Dobavljač ima vezane sirovine i ne može se obrisati."
                    : `Trajno brišete ${s.name}.`
                }
                confirmLabel="Obriši"
                onConfirm={async () => {
                  if (s.materialsCount > 0) {
                    notifyError(
                      "Ne možete obrisati dobavljača koji ima vezane sirovine"
                    );
                    return;
                  }
                  const result = await deleteSupplier(s.id);
                  if (!result.ok) {
                    notifyError(result.error);
                    return;
                  }
                  notifySuccess("Dobavljač je obrisan");
                  router.refresh();
                }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
