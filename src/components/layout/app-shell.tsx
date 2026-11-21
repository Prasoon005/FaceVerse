import type { ReactNode } from "react";

import { AppBackdrop } from "@/components/fx/app-backdrop";
import { InteractionEffects } from "@/components/fx/interaction-effects";
import type { Portal } from "@/config/site";

import { AnnouncementPopup } from "./announcement-popup";
import { CommandMenu } from "./command-menu";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { PortalAttribute } from "./portal-attribute";
import { MobileSidebar, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { ShellUser } from "./user-menu";

/**
 * Sidebar + topbar frame. The user app and the admin console share it, with their own
 * navigation; the admin console also gets its own accent colour (see globals.css).
 */
export function AppShell({
  user,
  portal = "user",
  children,
}: {
  user: ShellUser;
  portal?: Portal;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh" data-portal={portal}>
      <AppBackdrop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar portal={portal} />
      <MobileSidebar portal={portal} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} portal={portal} />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 md:px-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav portal={portal} />
      <CommandMenu portal={portal} />
      <InteractionEffects />
      {portal === "user" ? <AnnouncementPopup /> : null}
      <PortalAttribute portal={portal} />
    </div>
  );
}
