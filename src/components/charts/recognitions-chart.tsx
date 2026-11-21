"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyPoint } from "@/lib/data/dashboard";
import { areaCursor, glassTooltip, gridProps, tooltipLabelStyle } from "@/lib/ui/chart-theme";

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Recognitions over time: recognised vs unknown faces per day. */
export function RecognitionsChart({ data }: { data: DailyPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.recognised + d.unknown, 0);

  return (
    <figure className="grid gap-3">
      <div
        className="chart-glow h-64 w-full"
        role="img"
        aria-label={`Area chart of recognitions over the last ${data.length} days, ${total} in total.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="fill-recognised" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fill-unknown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              fontSize={12}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              labelFormatter={(v) => dayLabel(String(v))}
              cursor={areaCursor}
              contentStyle={glassTooltip}
              labelStyle={tooltipLabelStyle}
            />
            <Area
              type="monotone"
              dataKey="recognised"
              name="Recognised"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#fill-recognised)"
            />
            <Area
              type="monotone"
              dataKey="unknown"
              name="Unknown"
              stroke="var(--chart-4)"
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#fill-unknown)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-chart-1" aria-hidden /> Recognised
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-chart-4" aria-hidden />{" "}
          Unknown
        </span>
      </figcaption>
    </figure>
  );
}
