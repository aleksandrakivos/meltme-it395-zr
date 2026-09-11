"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const current = (theme ?? "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={mounted ? () => setTheme(next) : undefined}
      title={mounted ? `Tema: ${current}` : undefined}
    >
      {mounted && current === "dark" ? (
        <MoonIcon />
      ) : mounted && current === "system" ? (
        <DesktopIcon />
      ) : (
        <SunIcon />
      )}
      <span className="sr-only">Promeni temu</span>
    </Button>
  );
}
