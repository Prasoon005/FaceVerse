import { Check, CircleHelp, X } from "lucide-react";

import type { MatchStatus } from "@/config/recognition";
import { cn } from "@/lib/utils";

const statusStyles: Record<MatchStatus, { ring: string; text: string; label: string }> = {
  match: { ring: "stroke-success", text: "text-success-foreground", label: "Match" },
  uncertain: { ring: "stroke-warning", text: "text-warning-foreground", label: "Uncertain" },
  unknown: { ring: "stroke-danger", text: "text-danger-foreground", label: "Unknown" },
};

const statusIcons = { match: Check, uncertain: CircleHelp, unknown: X };

/**
 * Circular confidence meter. Colour is never the only signal: it also shows an icon
 * and an accessible label (PROJECT_SPEC §8 quality bar).
 */
export function ConfidenceRing({
  value,
  status,
  size = 28,
  className,
}: {
  /** 0..1 similarity, or null when unknown. */
  value: number | null;
  status: MatchStatus;
  size?: number;
  className?: string;
}) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value ?? 0));
  const style = statusStyles[status];
  const Icon = statusIcons[status];

  return (
    <span
      role="img"
      aria-label={`${style.label}${value != null ? `, ${Math.round(pct * 100)}% confidence` : ""}`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-current opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={cn("fill-none transition-[stroke-dashoffset] duration-300", style.ring)}
        />
      </svg>
      <Icon className={cn("absolute size-3", style.text)} aria-hidden />
    </span>
  );
}

export const matchStatusLabel = (status: MatchStatus) => statusStyles[status].label;
