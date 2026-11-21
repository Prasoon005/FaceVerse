"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarRange,
  LogOut,
  type LucideIcon,
  MessageSquareText,
  MessagesSquare,
  RefreshCcwDot,
  Zap,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type TickerKind = "checkin" | "checkout" | "leave" | "reason" | "change" | "message";
export type TickerEvent = { id: string; kind: TickerKind; userId: string; at: string };

const meta: Record<TickerKind, { icon: LucideIcon; tone: string; text: string }> = {
  checkin: {
    icon: CalendarCheck,
    tone: "bg-success/10 text-success-foreground",
    text: "checked in",
  },
  checkout: { icon: LogOut, tone: "bg-muted text-muted-foreground", text: "checked out" },
  leave: { icon: CalendarRange, tone: "bg-brand/10 text-brand", text: "requested leave" },
  reason: {
    icon: MessageSquareText,
    tone: "bg-warning/10 text-warning-foreground",
    text: "sent a reason",
  },
  change: {
    icon: RefreshCcwDot,
    tone: "bg-warning/10 text-warning-foreground",
    text: "asked to change their identity",
  },
  message: { icon: MessagesSquare, tone: "bg-brand/10 text-brand", text: "sent you a message" },
};

const MAX = 7;

// Re-render every 30s so "2 min ago" stays fresh.
function subscribeTick(cb: () => void) {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
}
const tickSnapshot = () => Math.floor(Date.now() / 30_000);

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

type Row = Record<string, unknown>;

/** Admin dashboard: a live feed of what members are doing, sliding in as it happens. */
export function ActivityTicker({
  initial,
  names,
}: {
  initial: TickerEvent[];
  names: Record<string, string>;
}) {
  const [events, setEvents] = useState(initial.slice(0, MAX));
  const tick = useSyncExternalStore(subscribeTick, tickSnapshot, () => 0);
  // Server/hydration render: measure from the newest event so the text matches; then the clock.
  const now = tick === 0 ? new Date(initial[0]?.at ?? 0).getTime() : (tick + 1) * 30_000;

  useEffect(() => {
    const supabase = createClient();
    const push = (e: TickerEvent) =>
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [e, ...prev].slice(0, MAX)));
    const at = () => new Date().toISOString();

    const channel = supabase
      .channel("admin-activity-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, (p) => {
        const r = p.new as Row;
        push({ id: `in-${r.id}`, kind: "checkin", userId: String(r.user_id), at: at() });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "attendance" }, (p) => {
        const r = p.new as Row;
        if (r.check_out_at)
          push({ id: `out-${r.id}`, kind: "checkout", userId: String(r.user_id), at: at() });
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leave_requests" },
        (p) => {
          const r = p.new as Row;
          push({ id: `leave-${r.id}`, kind: "leave", userId: String(r.user_id), at: at() });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "absence_reviews" },
        (p) => {
          const r = p.new as Row;
          if (r.status === "answered")
            push({ id: `reason-${r.id}`, kind: "reason", userId: String(r.user_id), at: at() });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "identity_change_requests" },
        (p) => {
          const r = p.new as Row;
          push({ id: `change-${r.id}`, kind: "change", userId: String(r.user_id), at: at() });
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const r = p.new as Row;
        if (r.sender_id === r.thread_user_id)
          push({ id: `msg-${r.id}`, kind: "message", userId: String(r.sender_id), at: at() });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="dot-glow relative inline-flex size-2 rounded-full bg-success text-success" />
          </span>
          Live activity
        </CardTitle>
        <CardDescription>What members are doing right now</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="grid justify-items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Zap className="size-6" aria-hidden />
            Waiting for activity. New events slide in here live.
          </div>
        ) : (
          <ul className="grid gap-1" aria-live="polite">
            <AnimatePresence initial={false}>
              {events.map((e) => {
                const m = meta[e.kind];
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -24, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-foreground/5"
                  >
                    <span className={cn("grid size-9 place-items-center rounded-xl", m.tone)}>
                      <m.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{names[e.userId] ?? "A member"}</span>{" "}
                      <span className="text-muted-foreground">{m.text}</span>
                    </span>
                    <time dateTime={e.at} className="shrink-0 text-xs text-muted-foreground">
                      {ago(e.at, now)}
                    </time>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
