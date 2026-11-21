"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarRange,
  CircleCheck,
  ClipboardCheck,
  Megaphone,
  MessageCircleQuestion,
  MessageSquareText,
  RefreshCcwDot,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import type { Portal } from "@/config/site";
import { getNotifications, type NotificationKind } from "@/lib/data/notifications";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const icons: Record<NotificationKind, typeof Bell> = {
  question: MessageCircleQuestion,
  decision: CircleCheck,
  approval: ShieldCheck,
  announcement: Megaphone,
  "identity-change": RefreshCcwDot,
  leave: CalendarRange,
  "admin-approvals": ClipboardCheck,
  "admin-replies": MessageSquareText,
  "admin-changes": RefreshCcwDot,
  "admin-leaves": CalendarRange,
};

const LIVE_TABLES = [
  "absence_reviews",
  "people",
  "identity_change_requests",
  "leave_requests",
  "announcements",
];

/** Live notifications: questions, decisions, announcements, and admin to-dos. */
export function NotificationsBell({ portal }: { portal: Portal }) {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", portal],
    queryFn: () => getNotifications(portal),
    refetchInterval: 120_000,
  });
  const actionable = items.filter((i) => i.actionable).length;
  const previous = useRef<number | null>(null);

  // Chime when a new to-do arrives (not on first load).
  useEffect(() => {
    if (previous.current !== null && actionable > previous.current) play("recognized");
    previous.current = actionable;
  }, [actionable, play]);

  useEffect(() => {
    const supabase = createClient();
    const refetch = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    let channel = supabase.channel("notifications");
    for (const table of LIVE_TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refetch);
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            actionable > 0 ? `Notifications, ${actionable} need attention` : "Notifications"
          }
        >
          <motion.span
            key={actionable}
            animate={actionable > 0 ? { rotate: [0, -18, 14, -8, 4, 0] } : undefined}
            transition={{ duration: 0.7 }}
            className="grid place-items-center"
          >
            <Bell aria-hidden />
          </motion.span>
          <AnimatePresence>
            {actionable > 0 ? (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[10px] leading-4 text-white"
                aria-hidden
              >
                {actionable > 9 ? "9+" : actionable}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          items.map((item) => {
            const Icon = icons[item.kind];
            return (
              <DropdownMenuItem key={item.id} asChild className="items-start gap-3 py-2">
                <Link href={item.href}>
                  <span className="relative mt-0.5">
                    <Icon className="size-4 text-brand" aria-hidden />
                    {item.actionable ? (
                      <span
                        className="absolute -top-1 -right-1 size-2 rounded-full bg-danger"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                    {item.at ? (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(item.at)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
