"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DEFAULT_TABLES = ["attendance", "absence_reviews", "people"];

/**
 * Subscribes to Supabase Realtime for the given tables (RLS applies) and refreshes the page
 * when anything changes (debounced), with a soft sound and a pulse.
 */
export function LiveUpdates({
  className,
  tables = DEFAULT_TABLES,
}: {
  className?: string;
  tables?: readonly string[];
}) {
  const router = useRouter();
  const { play } = useSoundFeedback();
  const [connected, setConnected] = useState(false);
  const [pulse, setPulse] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(`live-${tables.join("-")}`);
    for (const table of tables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          play("step");
          setPulse((n) => n + 1);
          router.refresh();
        }, 400);
      });
    }
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when the list changes
  }, [router, play, tables.join(",")]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
      title={connected ? "Updates appear automatically" : "Connecting to live updates…"}
    >
      <span className="relative flex size-2">
        {connected ? (
          <span
            key={pulse}
            className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75"
          />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            connected ? "bg-success" : "bg-muted-foreground",
          )}
        />
      </span>
      {connected ? "Live" : "Connecting"}
    </span>
  );
}
