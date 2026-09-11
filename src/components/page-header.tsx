import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Nazad",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b pb-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="font-heading text-xl font-semibold tracking-tight text-pretty">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
