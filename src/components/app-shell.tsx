"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { logoutAction } from "@/actions/auth";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NAV_ICONS } from "@/lib/nav-icons";
import { navLabelForPath, type NavGroup } from "@/lib/nav";

type AppShellProps = {
  userName: string;
  userRoleLabel: string;
  navGroups: NavGroup[];
  children: React.ReactNode;
};

export function AppShell({
  userName,
  userRoleLabel,
  navGroups,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const currentLabel = navLabelForPath(pathname);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  className="data-active:bg-transparent [&_svg]:size-5.5"
                  tooltip="MeltMe"
                  render={<Link href="/dashboard" />}
                >
                  <BrandMark />
                  <BrandWordmark />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.id}>
                {group.label ? (
                  <SidebarGroupLabel className="font-mono text-[11px] uppercase tracking-widest text-wax-rose-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      const Icon = NAV_ICONS[item.href];
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={active}
                            tooltip={item.label}
                            className="data-active:bg-wax-rose data-active:text-wax-rose-foreground data-active:shadow-[inset_2px_0_0_0_var(--wax-rose-foreground)]"
                            render={<Link href={item.href} />}
                          >
                            {Icon ? <Icon weight="duotone" /> : null}
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                  <span className="flex size-8 shrink-0 items-center justify-center bg-sidebar-accent text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
                    <UserCircleIcon weight="duotone" className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">
                      {userName}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {userRoleLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={logoutAction}>
                      <SidebarMenuButton
                        className="cursor-pointer"
                        tooltip="Odjava"
                        render={<button type="submit" aria-label="Odjava" />}
                      >
                        <SignOutIcon aria-hidden="true" />
                      </SidebarMenuButton>
                    </form>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-x-hidden">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:outline-2 focus:outline-ring"
          >
            Preskoči na sadržaj
          </a>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger
                size="icon"
                aria-label="Otvori/zatvori navigaciju"
              />
              {currentLabel ? (
                <span className="truncate font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {currentLabel}
                </span>
              ) : null}
            </div>
            <ThemeToggle />
          </header>
          <main id="main" className="mx-auto min-w-0 w-full max-w-7xl flex-1 px-8 py-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
