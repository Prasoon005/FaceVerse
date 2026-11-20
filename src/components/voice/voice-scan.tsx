"use client";

import { motion, useReducedMotion } from "framer-motion";

const BARS = 28;
// Fixed envelope so the "voiceprint" looks like speech, louder in the middle.
const ENVELOPE = Array.from({ length: BARS }, (_, i) => {
  const x = i / (BARS - 1);
  return 0.35 + 0.65 * Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7)));
});

/**
 * Animated "analysing voiceprint" visual: rippling bars with a sweeping scan line and
 * pulsing rings. Static (no motion) when the user prefers reduced motion.
 */
export function VoiceScan({ label = "Analysing voiceprint…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative grid gap-3 overflow-hidden rounded-xl border border-brand/30 bg-brand/5 p-4"
    >
      <div className="relative flex h-16 items-center justify-center gap-[3px]">
        {!reduceMotion
          ? [0, 1].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden
                className="absolute size-16 rounded-full border border-brand/40"
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay: ring * 0.9, ease: "easeOut" }}
              />
            ))
          : null}
        {ENVELOPE.map((height, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="w-1 rounded-full bg-brand"
            style={{ height: `${height * 100}%` }}
            animate={reduceMotion ? undefined : { scaleY: [0.3, 1, 0.45, 0.85, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: (i % 7) * 0.08 + i * 0.015,
              ease: "easeInOut",
            }}
          />
        ))}
        {!reduceMotion ? (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-brand/25 to-transparent"
            initial={{ left: "-15%" }}
            animate={{ left: "105%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
      </div>
      <p className="text-center font-mono text-xs tracking-wide text-brand">{label}</p>
    </div>
  );
}
