import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AppTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 max-w-full border">
      <Table className="text-sm">{children}</Table>
    </div>
  );
}

export function AppTableHeader({ children }: { children: React.ReactNode }) {
  return <TableHeader className="bg-muted/40">{children}</TableHeader>;
}

type AlignProps = {
  align?: "left" | "right";
  className?: string;
  children?: React.ReactNode;
};

export function AppTableHead({ align, className, children }: AlignProps) {
  return (
    <TableHead
      className={cn(
        "px-3 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function AppTableRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <TableRow className={className}>{children}</TableRow>;
}

export function AppTableCell({
  align,
  className,
  children,
  ...props
}: AlignProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableCell
      className={cn(
        "px-3 text-xs",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    >
      {children}
    </TableCell>
  );
}

export { TableBody as AppTableBody };
