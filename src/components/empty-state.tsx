import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateAction = { href: string; label: string } | React.ReactNode;

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const isLink =
    action !== null &&
    typeof action === "object" &&
    "href" in (action as object);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 border border-dashed bg-wax-cream/40 px-4 py-10 text-center",
        className,
      )}
    >
      <p className="font-medium text-pretty">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-2">
          {isLink ? (
            <Link
              href={(action as { href: string }).href}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {(action as { label: string }).label}
            </Link>
          ) : (
            (action as React.ReactNode)
          )}
        </div>
      ) : null}
    </div>
  );
}
