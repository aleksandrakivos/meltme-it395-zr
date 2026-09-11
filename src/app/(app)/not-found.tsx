import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="font-heading text-xl font-semibold">
        Stranica nije pronađena
      </h1>
      <p className="text-sm text-muted-foreground">
        Traženi resurs ne postoji ili ste uneli pogrešnu adresu.
      </p>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Nazad na kontrolnu tablu
      </Link>
    </div>
  );
}
