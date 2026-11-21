"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { useAnnouncementsRealtime } from "@/components/announcements/use-announcements-realtime";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import {
  announcementKeys,
  listAnnouncements,
  markAnnouncementsRead,
} from "@/lib/data/announcements";

/**
 * Pops up unread urgent/important announcements anywhere in the user app, live: an admin
 * posts, and every signed-in user sees it within a second (with a chime).
 */
export function AnnouncementPopup() {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const { data = [] } = useQuery({
    queryKey: announcementKeys.all,
    queryFn: () => listAnnouncements(),
    staleTime: 60_000,
  });
  useAnnouncementsRealtime(() => play("recognized"));

  const queue = data.filter((a) => !a.read && a.priority !== "normal" && !dismissed.has(a.id));
  const current = queue[0];

  async function acknowledge() {
    if (!current) return;
    const id = current.id;
    setDismissed((s) => new Set(s).add(id));
    await markAnnouncementsRead([id]);
    void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={(open) => (open ? null : void acknowledge())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <motion.span
              key={current?.id}
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: [0, -12, 10, -6, 0], scale: 1 }}
              transition={{ duration: 0.8 }}
              className="grid size-10 place-items-center rounded-full bg-brand/15 text-brand"
            >
              <Megaphone className="size-5" aria-hidden />
            </motion.span>
            <div className="grid text-left">
              <DialogTitle>Message from your admin</DialogTitle>
              <DialogDescription>
                {queue.length > 1 ? `${queue.length} new messages` : "New message"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnnouncementCard
              title={current.title}
              body={current.body}
              priority={current.priority}
              pinned={current.pinned}
              createdAt={current.created_at}
              direct={current.recipient_id !== null}
            />
          </motion.div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" asChild>
            <Link href="/announcements" onClick={() => void acknowledge()}>
              See all
            </Link>
          </Button>
          <Button onClick={() => void acknowledge()}>{queue.length > 1 ? "Next" : "Got it"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
