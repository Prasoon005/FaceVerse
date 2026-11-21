"use client";

import { Menu, Search } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Portal } from "@/config/site";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { Breadcrumbs } from "./breadcrumbs";
import { NotificationsBell } from "./notifications-bell";
import { SoundToggle } from "./sound-toggle";
import { ThemeToggle } from "./theme-toggle";
import { VoiceCommandButton } from "./voice-command-button";
import { type ShellUser, UserMenu } from "./user-menu";

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** The top bar is borderless at the top of the page and frosts over once content scrolls under it. */
export function Topbar({ user, portal }: { user: ShellUser; portal: Portal }) {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 4,
    () => false,
  );
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 md:px-6">
      <div
        className={cn(
          "glass-panel flex h-14 items-center gap-2 rounded-[20px] px-3 transition-shadow duration-300 md:px-4",
          scrolled && "shadow-(--shadow-card-hover)",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu aria-hidden />
        </Button>
        <div className="hidden min-w-0 flex-1 sm:block">
          <Breadcrumbs />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            className="hidden h-9 w-64 justify-start gap-2 rounded-full border-transparent bg-foreground/[0.05] px-3.5 text-muted-foreground shadow-none sm:flex dark:bg-white/[0.06]"
            onClick={() => setCommandOpen(true)}
          >
            <Search aria-hidden />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">
              Ctrl K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Open command palette"
            onClick={() => setCommandOpen(true)}
          >
            <Search aria-hidden />
          </Button>
          <VoiceCommandButton portal={portal} />
          <SoundToggle />
          <ThemeToggle />
          <NotificationsBell portal={portal} />
          <UserMenu user={user} portal={portal} />
        </div>
      </div>
    </header>
  );
}
