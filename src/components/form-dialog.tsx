"use client";

import type { ReactElement, ReactNode } from "react";
import { useDismissGuard } from "@/hooks/use-dismiss-guard";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormDialogProps = {
  title: string;
  description?: string;
  dirty: boolean;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormDialog({
  title,
  description,
  dirty,
  trigger,
  open: openProp,
  onOpenChange,
  defaultOpen,
  className,
  children,
}: FormDialogProps) {
  const {
    open,
    requestOpenChange,
    confirmOpen,
    confirmDiscard,
    cancelDiscard,
  } = useDismissGuard({
    dirty,
    open: openProp,
    onOpenChange,
    defaultOpen,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={requestOpenChange}>
        {trigger ? <DialogTrigger render={trigger} /> : null}
        {open ? (
          <DialogContent className={cn("sm:max-w-md", className)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription>{description}</DialogDescription>
              ) : null}
            </DialogHeader>
            {children}
          </DialogContent>
        ) : null}
      </Dialog>
      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) cancelDiscard();
        }}
        onConfirm={confirmDiscard}
      />
    </>
  );
}
