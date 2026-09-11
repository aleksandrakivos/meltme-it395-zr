"use client";

import type { ReactElement, ReactNode } from "react";
import { useDismissGuard } from "@/hooks/use-dismiss-guard";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FormSheetProps = {
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

export function FormSheet({
  title,
  description,
  dirty,
  trigger,
  open: openProp,
  onOpenChange,
  defaultOpen,
  className,
  children,
}: FormSheetProps) {
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
      <Sheet open={open} onOpenChange={requestOpenChange}>
        {trigger ? <SheetTrigger render={trigger} /> : null}
        {open ? (
          <SheetContent
            side="right"
            className={cn("w-full gap-0 overflow-y-auto sm:max-w-lg", className)}
          >
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description ? (
                <SheetDescription>{description}</SheetDescription>
              ) : null}
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
          </SheetContent>
        ) : null}
      </Sheet>
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
