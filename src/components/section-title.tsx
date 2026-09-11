import { cn } from "@/lib/utils";

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-heading text-sm font-semibold uppercase tracking-wider",
        className
      )}
    >
      {children}
    </h2>
  );
}
