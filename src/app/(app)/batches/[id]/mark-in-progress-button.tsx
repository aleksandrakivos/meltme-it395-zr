"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HourglassMediumIcon } from "@phosphor-icons/react";
import { markBatchInProgress } from "@/actions/batches";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";

export function MarkInProgressButton({
  batchId,
  variant = "outline",
}: {
  batchId: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markBatchInProgress({ batchId });
          if (!result.ok) {
            notifyError(result.error);
            return;
          }
          notifySuccess("Serija je označena kao u toku");
          router.refresh();
        })
      }
    >
      <HourglassMediumIcon
        weight="duotone"
        aria-hidden="true"
        data-icon="inline-start"
      />
      {isPending ? "Označavanje…" : "Označi kao u toku"}
    </Button>
  );
}
