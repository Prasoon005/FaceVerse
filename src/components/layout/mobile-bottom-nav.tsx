"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck,
  Fingerprint,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  MessagesSquare,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Portal } from "@/config/site";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { isActive } from "./nav-links";

type Item = { title: string; href: string; icon: LucideIcon; exact?: boolean };

const items: Record<Portal, Item[]> = {
  user: [
    { title: "Home", href: "/dashboard", icon: LayoutDashboard },
    { title: "Attendance", href: "/attendance", icon: CalendarCheck },
    { title: "Messages", href: "/messages", icon: MessagesSquare },
    { title: "Identity", href: "/identity", icon: Fingerprint },
  ],
  admin: [
    { title: "Overview", href: "/admin", icon: ShieldCheck, exact: true },
    { title: "Users", href: "/admin/users", icon: UserCog },
    { title: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
    { title: "Messages", href: "/admin/messages", icon: MessagesSquare },
  ],
};

/** Floating glass tab bar for phones (below md). "More" opens the full navigation drawer. */
export function MobileBottomNav({ portal }: { portal: Portal }) {
  const pathname = usePathname();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const list = items[portal];
  const activeHref = list.find((i) =>
    i.exact ? pathname === i.href : isActive(pathname, i.href),
  )?.href;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <ul className="grid grid-cols-5 rounded-[22px] bg-card p-1.5 shadow-(--shadow-card-hover) backdrop-blur-2xl backdrop-saturate-[1.8]">
        {list.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-muted-foreground transition-colors",
                  active && "text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-active"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-xl bg-foreground/[0.07]"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                ) : null}
                <motion.span
                  key={active ? "on" : "off"}
                  animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <item.icon className={cn("size-5", active && "text-brand")} aria-hidden />
                </motion.span>
                {item.title}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="size-5" aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
