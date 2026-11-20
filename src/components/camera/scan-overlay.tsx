"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * "Scanning face" overlay for the camera view: a sweeping scan line, a faint grid and
 * a label. Decorative; the parent announces state changes in its own live region.
 */
export function ScanOverlay({ label = "Scanning face" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--brand)_1px,transparent_1px),linear-gradient(to_bottom,var(--brand)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.07]" />
      {!reduceMotion ? (
        <motion.div
          className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-brand/30 to-transparent"
          initial={{ top: "-25%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-brand shadow-[0_0_12px_2px_var(--brand)]" />
        </motion.div>
      ) : null}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-brand/40 bg-background/80 px-2 py-0.5 font-mono text-[11px] tracking-wide text-brand backdrop-blur">
        {label}
      </span>
    </div>
  );
}
