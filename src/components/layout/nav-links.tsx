"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type NavItem, navFor, type Portal } from "@/config/site";
import { cn } from "@/lib/utils";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Sectioned navigation used by both the desktop sidebar and the mobile drawer. */
export function NavLinks({
  collapsed = false,
  onNavigate,
  portal,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  portal: Portal;
}) {
  const pathname = usePathname();
  const sections = navFor(portal);
  // The most specific match wins, so /admin/users highlights "Users", not "Admin overview".
  const activeHref = sections
    .flatMap((s) => s.items.map((i) => i.href))
    .filter((href) => isActive(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
  // Scopes the sliding highlight to this instance (sidebar and mobile drawer).
  const groupId = useId();

  return (
    <LayoutGroup id={groupId}>
      <nav aria-label="Main" className="grid gap-5">
        {sections.map((section) => (
          <div key={section.title} className="grid gap-1">
            {collapsed ? (
              <span className="sr-only">{section.title}</span>
            ) : (
              <span className="px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {section.title}
              </span>
            )}
            <ul className="grid gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={item.href === activeHref}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.title : undefined}
      className={cn(
        "relative isolate flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "font-medium text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        // Slides between links when the page changes.
        <motion.span
          layoutId="nav-active"
          aria-hidden
          className="nav-pill absolute inset-0 -z-10 rounded-[10px]"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      ) : null}
      <Icon className={cn("size-4 shrink-0", active && "text-brand")} aria-hidden />
      {collapsed ? null : (
        <>
          <span className="truncate">{item.title}</span>
          {item.comingInPhase ? (
            <span className="ml-auto rounded border px-1 font-mono text-[10px] text-muted-foreground">
              P{item.comingInPhase}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}
