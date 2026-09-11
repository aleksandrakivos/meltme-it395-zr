"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { deleteCustomer } from "@/actions/customers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CustomerForm } from "./customer-form";

export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ordersCount: number;
};

function EditCustomerSheet({ customer }: { customer: CustomerListItem }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  return (
    <FormSheet
      title="Izmena kupca"
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
      <CustomerForm mode="edit" customer={customer} onDirtyChange={setDirty} onSuccess={() => setOpen(false)} />
    </FormSheet>
  );
}

type CustomersTableProps = {
  customers: CustomerListItem[];
  createAction?: React.ReactNode;
};

export function CustomersTable({
  customers,
  createAction,
}: CustomersTableProps) {
  const router = useRouter();

  return (
    <DataTable
      data={customers}
      searchKey="name"
      searchPlaceholder="Pretraga po imenu…"
      emptyMessage="Nema kupaca za zadatu pretragu"
      empty={{
        title: "Još nema kupaca",
        description: "Kupac se bira pri kreiranju porudžbine.",
        action: createAction,
      }}
      columns={[
        { header: "Ime", cell: (c) => c.name },
        { header: "Email", cell: (c) => c.email ?? "—" },
        { header: "Telefon", cell: (c) => c.phone ?? "—" },
        { header: "Adresa", cell: (c) => c.address ?? "—" },
        {
          header: "",
          className: "w-[1%] whitespace-nowrap",
          cell: (c) => (
            <div className="flex items-center justify-end gap-2">
              <EditCustomerSheet customer={c} />
              <ConfirmDialog
                triggerLabel="Obriši"
                triggerIcon={
                  <TrashIcon weight="duotone" data-icon="inline-start" />
                }
                title="Obrisati kupca?"
                description={
                  c.ordersCount > 0
                    ? "Kupac ima porudžbine i ne može se obrisati."
                    : `Trajno brišete ${c.name}.`
                }
                confirmLabel="Obriši"
                onConfirm={async () => {
                  if (c.ordersCount > 0) {
                    notifyError("Ne možete obrisati kupca koji ima porudžbine");
                    return;
                  }
                  const result = await deleteCustomer(c.id);
                  if (!result.ok) {
                    notifyError(result.error);
                    return;
                  }
                  notifySuccess("Kupac je obrisan");
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
