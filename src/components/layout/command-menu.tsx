"use client";

import {
  CalendarCheck,
  CalendarRange,
  Clock,
  Fingerprint,
  LogOut,
  Megaphone,
  MonitorSmartphone,
  Moon,
  Radar,
  UserPlus,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navFor, type Portal } from "@/config/site";
import { useThemeTransition } from "@/lib/ui/theme-transition";
import { useUiStore } from "@/stores/ui-store";

const RECENT_KEY = "faceverse-recent-pages";

function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const quickActions: Record<Portal, { label: string; href: string; icon: typeof Radar }[]> = {
  user: [
    { label: "Mark attendance", href: "/attendance", icon: CalendarCheck },
    { label: "Start live scan", href: "/live", icon: Radar },
    { label: "Enroll new person", href: "/enroll", icon: UserPlus },
    { label: "Request leave", href: "/leave", icon: CalendarRange },
    { label: "Explain absence / late", href: "/reasons", icon: CalendarCheck },
    { label: "My identity", href: "/identity", icon: Fingerprint },
    { label: "Message admin", href: "/messages", icon: Megaphone },
  ],
  admin: [
    { label: "Post announcement", href: "/admin/announcements", icon: Megaphone },
    { label: "Messages", href: "/admin/messages", icon: Megaphone },
    { label: "Open kiosk mode", href: "/admin/kiosk", icon: MonitorSmartphone },
    { label: "Attendance report", href: "/admin/attendance", icon: CalendarCheck },
  ],
};

/** Global Ctrl/Cmd + K palette: navigate anywhere and run quick actions. */
export function CommandMenu({ portal = "user" }: { portal?: Portal }) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleTheme = useThemeTransition();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  // Remember the last few pages for the "Recent" group.
  useEffect(() => {
    try {
      const next = [pathname, ...readRecent().filter((p) => p !== pathname)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode): the palette just has no recent group.
    }
  }, [pathname]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.replace(portal === "admin" ? "/admin/login" : "/login");
    router.refresh();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search pages and actions"
    >
      {/* shadcn's CommandDialog no longer wraps children in <Command>; cmdk needs that context. */}
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <RecentGroup
            portal={portal}
            current={pathname}
            onGo={(href) => run(() => router.push(href))}
          />
          <CommandGroup heading="Quick actions">
            {quickActions[portal].map((a) => (
              <CommandItem key={a.label} onSelect={() => run(() => router.push(a.href))}>
                <a.icon aria-hidden />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          {navFor(portal).map((section) => (
            <CommandGroup key={section.title} heading={section.title}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${section.title} ${item.title}`}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon aria-hidden />
                  {item.title}
                  {item.comingInPhase ? (
                    <CommandShortcut>Phase {item.comingInPhase}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem onSelect={() => run(() => toggleTheme())}>
              <Moon aria-hidden />
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => run(signOut)}>
              <LogOut aria-hidden />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> move
          </span>
          <span>
            <Kbd>Enter</Kbd> open
          </span>
          <span className="ml-auto">
            <Kbd>Esc</Kbd> close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">{children}</kbd>;
}

/** Pages visited recently (mounted only while the palette is open, so storage is safe to read). */
function RecentGroup({
  portal,
  current,
  onGo,
}: {
  portal: Portal;
  current: string;
  onGo: (href: string) => void;
}) {
  const [recent] = useState(readRecent);
  const items = navFor(portal).flatMap((s) => s.items);
  const pages = recent
    .filter((href) => href !== current)
    .map((href) => items.find((i) => i.href === href))
    .filter((i): i is (typeof items)[number] => Boolean(i))
    .slice(0, 4);
  if (pages.length === 0) return null;
  return (
    <>
      <CommandGroup heading="Recent">
        {pages.map((item) => (
          <CommandItem
            key={item.href}
            value={`recent ${item.title}`}
            onSelect={() => onGo(item.href)}
          >
            <Clock aria-hidden />
            {item.title}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
    </>
  );
}
