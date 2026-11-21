"use client";

import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { type Portal, portalHome } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { NavLinks } from "./nav-links";

/** Desktop sidebar (md and up). Collapses to an icon rail. */
export function Sidebar({ portal }: { portal: Portal }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[60px]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        <Link href={portalHome[portal]} aria-label="FaceVerse home" className="rounded-md">
          <Logo showText={!collapsed} />
        </Link>
        {portal === "admin" && !collapsed ? <AdminBadge /> : null}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks collapsed={collapsed} portal={portal} />
      </div>
      <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(!collapsed && "w-full justify-start text-muted-foreground")}
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          {collapsed ? null : "Collapse"}
        </Button>
      </div>
    </aside>
  );
}

/** Mobile drawer version of the sidebar (below md). */
export function MobileSidebar({ portal }: { portal: Portal }) {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Move between FaceVerse sections</SheetDescription>
        <div className="flex h-14 items-center px-4">
          <Logo />
          {portal === "admin" ? <AdminBadge /> : null}
        </div>
        <div className="overflow-y-auto px-3 py-2">
          <NavLinks onNavigate={() => setOpen(false)} portal={portal} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Marks the admin console so it's never confused with the user app. */
function AdminBadge() {
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
      <ShieldCheck className="size-3" aria-hidden /> Admin
    </span>
  );
}
