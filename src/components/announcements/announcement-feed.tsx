"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  announcementKeys,
  listAnnouncements,
  markAnnouncementsRead,
} from "@/lib/data/announcements";

import { AnnouncementCard } from "./announcement-card";
import { useAnnouncementsRealtime } from "./use-announcements-realtime";

/** The user's announcement feed. Everything shown is marked read after a short moment. */
export function AnnouncementFeed() {
  const queryClient = useQueryClient();
  const { data = [], isPending } = useQuery({
    queryKey: announcementKeys.all,
    queryFn: () => listAnnouncements(),
  });
  useAnnouncementsRealtime();
  const unreadIds = data.filter((a) => !a.read).map((a) => a.id);
  const unreadKey = unreadIds.join(",");
  const marked = useRef(new Set<string>());

  // Keep the NEW markers visible for a moment, then mark them read.
  useEffect(() => {
    const ids = unreadKey ? unreadKey.split(",").filter((id) => !marked.current.has(id)) : [];
    if (ids.length === 0) return;
    const timer = setTimeout(async () => {
      ids.forEach((id) => marked.current.add(id));
      await markAnnouncementsRead(ids);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, 2500);
    return () => clearTimeout(timer);
  }, [unreadKey, queryClient]);

  if (isPending) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description="Messages from your admin appear here the moment they're posted."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {unreadIds.length > 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{unreadIds.length} new</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await markAnnouncementsRead(unreadIds);
              void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
              void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            }}
          >
            <CheckCheck aria-hidden /> Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-3">
        <AnimatePresence initial={false}>
          {data.map((a, i) => (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
            >
              <AnnouncementCard
                title={a.title}
                body={a.body}
                priority={a.priority}
                pinned={a.pinned}
                createdAt={a.created_at}
                direct={a.recipient_id !== null}
                unread={!a.read}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
