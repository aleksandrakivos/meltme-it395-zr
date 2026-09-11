"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

const ALL = "__all__";

export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
    </div>
  );
}

function FilterLabel({
  htmlFor,
  id,
  children,
}: {
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      id={id}
      className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
    >
      {children}
    </Label>
  );
}

export function FilterSelect({
  label,
  param,
  options,
  allLabel = "Sve",
  className,
}: {
  label: string;
  param: string;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const labelId = useId();
  const { get, set } = useUrlFilter();
  const current = get(param) || ALL;
  const items = [{ value: ALL, label: allLabel }, ...options];

  return (
    <div className="space-y-1">
      <FilterLabel id={labelId}>{label}</FilterLabel>
      <Select
        value={current}
        onValueChange={(value) => set(param, value === ALL ? null : value)}
        items={items}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn("w-56", className)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterDate({ label, param }: { label: string; param: string }) {
  const id = useId();
  const { get, set } = useUrlFilter();
  return (
    <div className="space-y-1">
      <FilterLabel htmlFor={id}>{label}</FilterLabel>
      <Input
        id={id}
        type="date"
        value={get(param)}
        onChange={(event) => set(param, event.target.value || null)}
        className="w-40"
      />
    </div>
  );
}

export function FilterChips({
  param,
  options,
  allLabel = "Sve",
  ariaLabel,
}: {
  param: string;
  options: FilterOption[];
  allLabel?: string;
  ariaLabel: string;
}) {
  const { get, set } = useUrlFilter();
  const current = get(param);
  const chips = [{ value: "", label: allLabel }, ...options];

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {chips.map((chip) => {
        const active = current === chip.value;
        return (
          <button
            key={chip.value || ALL}
            type="button"
            aria-pressed={active}
            onClick={() => set(param, chip.value || null)}
            className={cn(
              "border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active
                ? "border-border bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export function useFilterValue(param: string): string {
  return useUrlFilter().get(param);
}
