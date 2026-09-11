"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Otvaranje sheet-a preko `?new=1`; parametar se briše nakon korišćenja. */
export function useOpenFromQuery(param = "new") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get(param) === "1";

  const [open, setOpen] = useState(requested);
  const [consumed, setConsumed] = useState(requested);

  if (requested && !consumed) {
    setConsumed(true);
    setOpen(true);
  } else if (!requested && consumed) {
    setConsumed(false);
  }

  useEffect(() => {
    if (!requested) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [param, pathname, requested, router, searchParams]);

  return [open, setOpen] as const;
}
