"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive" | "outline";
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  triggerLabel,
  triggerIcon,
  title,
  description,
  confirmLabel = "Potvrdi",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant={variant} size="sm" />}
      >
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      {open ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              variant={variant === "outline" ? "default" : variant}
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await onConfirm();
                  setOpen(false);
                });
              }}
            >
              {isPending ? "…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
