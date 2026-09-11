import { BentoCell } from "@/components/bento-grid";
import { cn } from "@/lib/utils";

type StatCellProps = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function StatCell({ label, value, hint, className }: StatCellProps) {
  return (
    <BentoCell className={cn("bg-wax-cream/60", className)}>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </BentoCell>
  );
}
