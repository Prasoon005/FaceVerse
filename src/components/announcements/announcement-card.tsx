import { Megaphone, Pin, Siren, Sparkles, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnnouncementPriority } from "@/types/database";

export const priorityStyle: Record<
  AnnouncementPriority,
  { label: string; icon: typeof Megaphone; card: string; chip: string }
> = {
  normal: {
    label: "Update",
    icon: Megaphone,
    card: "border-border",
    chip: "bg-brand/10 text-brand",
  },
  important: {
    label: "Important",
    icon: Sparkles,
    card: "border-warning/50",
    chip: "bg-warning/15 text-warning-foreground",
  },
  urgent: {
    label: "Urgent",
    icon: Siren,
    card: "border-danger/50 shadow-lg shadow-danger/10",
    chip: "bg-danger/15 text-danger-foreground",
  },
};

/** One announcement: priority chip, title, body, time; unread ones glow. */
export function AnnouncementCard({
  title,
  body,
  priority,
  pinned,
  createdAt,
  direct = false,
  unread = false,
  actions,
  className,
}: {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  createdAt: string | null;
  /** Sent only to this user. */
  direct?: boolean;
  unread?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const style = priorityStyle[priority];
  const Icon = style.icon;
  return (
    <article
      className={cn(
        "hover-lift relative grid gap-2 overflow-hidden rounded-xl border bg-card p-4",
        style.card,
        className,
      )}
    >
      {unread ? <span aria-hidden className="absolute top-0 left-0 h-full w-1 bg-brand" /> : null}
      <header className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            style.chip,
          )}
        >
          <Icon className={cn("size-3", priority === "urgent" && "animate-pulse")} aria-hidden />
          {style.label}
        </span>
        {pinned ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Pin className="size-3" aria-hidden /> Pinned
          </span>
        ) : null}
        {direct ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <UserRound className="size-3" aria-hidden /> Just for you
          </span>
        ) : null}
        {unread ? (
          <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-primary-foreground">
            NEW
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {createdAt ? formatRelative(createdAt) : "Preview"}
        </span>
      </header>
      <h3 className="font-semibold">{title || "Untitled"}</h3>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{body || "…"}</p>
      {actions ? (
        <footer className="flex flex-wrap items-center gap-2 pt-1">{actions}</footer>
      ) : null}
    </article>
  );
}
