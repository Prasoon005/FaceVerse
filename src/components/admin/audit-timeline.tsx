"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Fingerprint,
  Megaphone,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { actionLabel } from "./audit-labels";

export type AuditEntry = {
  id: string;
  action: string;
  actorName: string;
  actorIsAdmin: boolean;
  targetName: string | null;
  meta: string | null;
  createdAt: string;
};

const CATEGORIES = [
  { key: "all", label: "All", icon: ShieldCheck, match: () => true },
  {
    key: "users",
    label: "Users",
    icon: UserCog,
    match: (a: string) => /role|disable|enable|delete_user|biometrics/.test(a),
  },
  {
    key: "identity",
    label: "Identity",
    icon: Fingerprint,
    match: (a: string) => /identity|enrollment/.test(a),
  },
  {
    key: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    match: (a: string) => /absence|leave|attendance/.test(a),
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: Megaphone,
    match: (a: string) => a.includes("announcement"),
  },
  { key: "people", label: "People", icon: Users, match: (a: string) => a.startsWith("person.") },
] as const;

/** Searchable, filterable timeline of everything admins and users did. */
export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.key === category)!;
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        cat.match(e.action) &&
        (!q ||
          `${e.actorName} ${actionLabel(e.action)} ${e.targetName ?? ""} ${e.meta ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [entries, category, query]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or action…"
            className="h-9 pl-8"
            aria-label="Search the audit log"
          />
        </div>
        <div role="tablist" aria-label="Category" className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              role="tab"
              aria-selected={category === c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                category === c.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {category === c.key ? (
                <motion.span
                  layoutId="audit-cat"
                  className="absolute inset-0 -z-10 rounded-full border border-brand/40 bg-brand/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              ) : null}
              <c.icon className="size-3.5" aria-hidden /> {c.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} entries</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No matching entries" description="Try another category or search." />
      ) : (
        <ol className="relative grid gap-0 border-l pl-6">
          <AnimatePresence initial={false}>
            {visible.map((e, i) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 15) * 0.02 }}
                className="relative pb-4"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-background",
                    e.actorIsAdmin ? "bg-brand" : "bg-success",
                  )}
                />
                <p className="text-sm">
                  <span className="font-medium">{e.actorName}</span>{" "}
                  {e.actorIsAdmin ? (
                    <span className="mr-1 rounded border border-brand/40 px-1 text-[10px] text-brand">
                      ADMIN
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">{actionLabel(e.action)}</span>
                  {e.targetName ? <span className="font-medium"> · {e.targetName}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground" title={formatDateTime(e.createdAt)}>
                  {formatRelative(e.createdAt)}
                  {e.meta ? ` · ${e.meta}` : ""}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
