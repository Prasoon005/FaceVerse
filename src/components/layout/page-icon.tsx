"use client";

import { usePathname } from "next/navigation";

import { navFor, type Portal } from "@/config/site";

import { isActive } from "./nav-links";

/** The current section's icon in a glass tile (from the navigation config), for page headers. */
export function PageIcon() {
  const pathname = usePathname();
  const portal: Portal = pathname.startsWith("/admin") ? "admin" : "user";
  const item = navFor(portal)
    .flatMap((s) => s.items)
    .filter((i) => isActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!item) return null;
  const Icon = item.icon;
  return (
    <span className="glass-panel icon-glow grid size-12 shrink-0 place-items-center rounded-2xl text-brand">
      <Icon className="size-[22px]" aria-hidden />
    </span>
  );
}
