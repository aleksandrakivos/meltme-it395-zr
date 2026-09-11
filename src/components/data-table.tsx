"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/components/app-table";
import { Input } from "@/components/ui/input";
import { EmptyState, type EmptyStateAction } from "@/components/empty-state";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  searchKey?: keyof T & string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  empty?: {
    title: string;
    description?: string;
    action?: EmptyStateAction;
  };
  toolbar?: React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Pretraga…",
  emptyMessage = "Nema podataka",
  empty,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchKey || !query.trim()) {
      return data;
    }
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      const value = row[searchKey];
      return String(value ?? "")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, searchKey]);

  if (data.length === 0 && empty) {
    return (
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {searchKey || toolbar ? (
        <div className="flex flex-wrap items-end gap-3">
          {searchKey ? (
            <div className="relative w-full max-w-sm">
              <MagnifyingGlassIcon
                weight="duotone"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}
      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            {columns.map((column) => (
              <AppTableHead
                key={column.header || column.className}
                align={column.align}
                className={column.className}
              >
                {column.header}
              </AppTableHead>
            ))}
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {filtered.length === 0 ? (
            <AppTableRow>
              <AppTableCell
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </AppTableCell>
            </AppTableRow>
          ) : (
            filtered.map((row) => (
              <AppTableRow key={row.id}>
                {columns.map((column, index) => (
                  <AppTableCell
                    key={`${row.id}-${column.header}-${index}`}
                    align={column.align}
                    className={column.className}
                  >
                    {column.cell(row)}
                  </AppTableCell>
                ))}
              </AppTableRow>
            ))
          )}
        </AppTableBody>
      </AppTable>
    </div>
  );
}
