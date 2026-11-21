"use client";

import { motion, useAnimationControls } from "framer-motion";
import { Lock } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { cn } from "@/lib/utils";

/**
 * A button that must be held down for `ms` before it fires: for final, hard-to-undo actions.
 * Keyboard users hold Space/Enter. A fill sweeps across while holding.
 */
export function HoldToConfirm({
  onConfirm,
  disabled = false,
  ms = 1600,
  children,
  className,
}: {
  onConfirm: () => void;
  disabled?: boolean;
  ms?: number;
  children: ReactNode;
  className?: string;
}) {
  const fill = useAnimationControls();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [holding, setHolding] = useState(false);
  const { play } = useSoundFeedback();

  function start() {
    if (disabled || timer.current) return;
    setHolding(true);
    play("step");
    void fill.start({ scaleX: 1, transition: { duration: ms / 1000, ease: "linear" } });
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      onConfirm();
    }, ms);
  }

  function cancel() {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
    void fill.start({ scaleX: 0, transition: { duration: 0.2 } });
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      className={cn(
        "relative isolate inline-flex h-11 touch-none items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={fill}
        style={{ originX: 0 }}
        className="absolute inset-0 -z-10 bg-white/25"
      />
      <Lock className={cn("size-4", holding && "animate-pulse")} aria-hidden />
      {holding ? "Keep holding…" : children}
    </button>
  );
}
