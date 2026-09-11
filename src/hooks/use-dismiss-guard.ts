"use client";

import { useCallback, useState } from "react";

type UseDismissGuardOptions = {
  dirty: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function useDismissGuard({
  dirty,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: UseDismissGuardOptions) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const requestOpenChange = useCallback(
    (next: boolean) => {
      if (!next && dirty) {
        setConfirmOpen(true);
        return;
      }
      if (next) {
        setConfirmOpen(false);
      }
      setOpen(next);
    },
    [dirty, setOpen],
  );

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    setOpen(false);
  }, [setOpen]);

  const cancelDiscard = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return {
    open,
    requestOpenChange,
    confirmOpen,
    confirmDiscard,
    cancelDiscard,
  };
}
