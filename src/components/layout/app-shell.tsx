import type { ReactNode } from "react";

import { CommandMenu } from "./command-menu";
import { MobileSidebar, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { ShellUser } from "./user-menu";

/** Sidebar + topbar frame for every page in the (app) route group. */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
      <CommandMenu />
    </div>
  );
}
