"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { announcementKeys } from "@/lib/data/announcements";
import { createClient } from "@/lib/supabase/client";

/** Refetches announcements (and the bell) whenever an admin posts, pins or deletes one. */
export function useAnnouncementsRealtime(onInsert?: () => void) {
  const queryClient = useQueryClient();
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`announcements-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          if (payload.eventType === "INSERT") onInsertRef.current?.();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
