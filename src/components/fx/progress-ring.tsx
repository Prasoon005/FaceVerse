"use client";

import { motion } from "framer-motion";

import { AnimatedNumber } from "@/components/shared/motion";

type Tone = "success" | "brand" | "warning" | "danger";

/** Colour by how good the value is (0..1). */
export function ringTone(ratio: number): Tone {
  if (ratio >= 0.9) return "success";
  if (ratio >= 0.75) return "brand";
  if (ratio >= 0.5) return "warning";
  return "danger";
}

/**
 * Circular progress that draws itself on mount, with a counting number in the middle.
 * `ratio` is 0..1 (null = nothing to show yet); `value` is the number printed in the centre.
 */
export function ProgressRing({
  ratio,
  value,
  suffix = "%",
  label,
  size = 88,
  stroke = 7,
}: {
  ratio: number | null;
  value: number | null;
  suffix?: string;
  label: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = ratio === null ? 0 : Math.max(0, Math.min(1, ratio));
  const tone = ratio === null ? "brand" : ringTone(clamped);
  const color = `var(--${tone === "brand" ? "brand" : tone})`;

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={value === null ? `${label}: no data yet` : `${label}: ${value}${suffix}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/[0.08]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <span className="absolute text-lg font-semibold tracking-tight tabular-nums">
        {value === null ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <>
            <AnimatedNumber value={value} duration={1.2} />
            <span className="text-xs text-muted-foreground">{suffix}</span>
          </>
        )}
      </span>
    </div>
  );
}
