"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

function partsIn(date: Date, timeZone: string) {
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone, ...o }).format(date);
  return {
    hour: Number(fmt({ hour: "numeric", hour12: false })),
    time: fmt({ hour: "2-digit", minute: "2-digit", hour12: false }),
    seconds: fmt({ second: "2-digit" }).padStart(2, "0"),
    date: fmt({ weekday: "long", day: "numeric", month: "short" }),
  };
}

function periodIcon(hour: number) {
  if (hour >= 5 && hour < 9) return { Icon: Sunrise, tone: "text-warning-foreground" };
  if (hour >= 9 && hour < 17) return { Icon: Sun, tone: "text-warning-foreground" };
  if (hour >= 17 && hour < 20) return { Icon: Sunset, tone: "text-danger-foreground" };
  return { Icon: Moon, tone: "text-brand" };
}

/** A live clock in the workspace time zone, with an icon for the time of day. */
export function LiveClock({ timeZone, className }: { timeZone: string; className?: string }) {
  const seconds = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const parts = seconds === null ? null : partsIn(new Date(seconds * 1000), timeZone);
  const { Icon, tone } = periodIcon(parts?.hour ?? 12);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border bg-background/40 px-3 py-2 backdrop-blur-md",
        className,
      )}
    >
      <motion.span
        animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className={cn("grid size-9 place-items-center rounded-xl bg-foreground/5", tone)}
      >
        <Icon className="size-5" aria-hidden />
      </motion.span>
      <span className="grid leading-tight">
        <span className="font-mono text-lg font-semibold tabular-nums" aria-live="off">
          {parts ? parts.time : "--:--"}
          <span className="ml-0.5 inline-block w-[2ch] text-xs text-muted-foreground">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={parts?.seconds ?? "s"}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                {parts?.seconds ?? "--"}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{parts?.date ?? " "}</span>
      </span>
    </div>
  );
}
