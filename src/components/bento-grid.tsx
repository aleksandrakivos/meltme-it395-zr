import { cn } from "@/lib/utils";

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-px border bg-border", className)}>
      {children}
    </div>
  );
}

export function BentoCell({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("bg-background p-5", className)} {...props}>
      {children}
    </div>
  );
}
