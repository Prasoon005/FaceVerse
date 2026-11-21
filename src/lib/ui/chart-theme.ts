import type { CSSProperties } from "react";

/** Shared Recharts styling so every chart matches the glass UI. */
export const glassTooltip: CSSProperties = {
  background: "var(--popover)",
  border: "none",
  borderRadius: 14,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "var(--shadow-card-hover)",
  backdropFilter: "blur(24px) saturate(1.8)",
  WebkitBackdropFilter: "blur(24px) saturate(1.8)",
  padding: "8px 12px",
};

export const tooltipLabelStyle: CSSProperties = { fontWeight: 600, marginBottom: 2 };

export const gridProps = {
  vertical: false,
  stroke: "var(--border)",
  strokeDasharray: "3 4",
} as const;

export const axisProps = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  stroke: "var(--muted-foreground)",
} as const;

export const areaCursor = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 1,
  strokeDasharray: "3 3",
};
