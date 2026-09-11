"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="font-heading text-xl font-semibold">Došlo je do greške</h1>
      <p className="text-sm text-muted-foreground">
        Stranica nije mogla da se učita. Pokušajte ponovo.
      </p>
      <Button type="button" onClick={reset}>
        Pokušaj ponovo
      </Button>
    </div>
  );
}
