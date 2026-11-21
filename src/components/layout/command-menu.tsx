"use client";

import {
  CalendarCheck,
  CalendarRange,
  Fingerprint,
  LogOut,
  Megaphone,
  MonitorSmartphone,
  Moon,
  Radar,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
import { useUiStore } from "@/stores/ui-store";

const quickActions: Record<Portal, { label: string; href: string; icon: typeof Radar }[]> = {
  user: [
    { label: "Mark attendance", href: "/attendance", icon: CalendarCheck },
    { label: "Start live scan", href: "/live", icon: Radar },
    { label: "Enroll new person", href: "/enroll", icon: UserPlus },
    { label: "Request leave", href: "/leave", icon: CalendarRange },
    { label: "Explain absence / late", href: "/reasons", icon: CalendarCheck },
    { label: "My identity", href: "/identity", icon: Fingerprint },
  ],
  admin: [
    { label: "Post announcement", href: "/admin/announcements", icon: Megaphone },
    { label: "Open kiosk mode", href: "/admin/kiosk", icon: MonitorSmartphone },
    { label: "Attendance report", href: "/admin/attendance", icon: CalendarCheck },
  ],
};

/** Global Ctrl/Cmd + K palette: navigate anywhere and run quick actions. */
export function CommandMenu({ portal = "user" }: { portal?: Portal }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
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
            <CommandItem
              onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
            >
              <Moon aria-hidden />
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => run(signOut)}>
              <LogOut aria-hidden />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
