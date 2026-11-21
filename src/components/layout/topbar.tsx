"use client";

import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Portal } from "@/config/site";
import { useUiStore } from "@/stores/ui-store";

import { Breadcrumbs } from "./breadcrumbs";
import { NotificationsBell } from "./notifications-bell";
import { SoundToggle } from "./sound-toggle";
import { ThemeToggle } from "./theme-toggle";
import { VoiceCommandButton } from "./voice-command-button";
import { type ShellUser, UserMenu } from "./user-menu";

export function Topbar({ user, portal }: { user: ShellUser; portal: Portal }) {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/40 px-4 backdrop-blur-xl backdrop-saturate-150 md:px-6">
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
          className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground sm:flex"
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
    </header>
  );
}
