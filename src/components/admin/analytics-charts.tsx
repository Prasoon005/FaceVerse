"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { areaCursor, glassTooltip, gridProps, tooltipLabelStyle } from "@/lib/ui/chart-theme";

export type TrendPoint = { day: string; rate: number | null; present: number; expected: number };
export type WeekdayPoint = { label: string; rate: number | null };

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

const pct = (v: unknown) => (typeof v === "number" ? `${Math.round(v)}%` : "–");

/** Daily attendance rate over working days (single series: the title names it). */
export function AttendanceTrendChart({ data }: { data: TrendPoint[] }) {
  const counted = data.filter((d) => d.rate !== null);
  const avg = counted.length
    ? Math.round(counted.reduce((s, d) => s + (d.rate ?? 0), 0) / counted.length)
    : null;
  return (
    <div
      className="chart-glow h-64 w-full"
      role="img"
      aria-label={`Attendance rate over the last ${data.length} working days${avg === null ? "" : `, average ${avg}%`}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="fill-rate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
              <stop offset="60%" stopColor="var(--chart-1)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={pct}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={areaCursor}
            contentStyle={glassTooltip}
            labelStyle={tooltipLabelStyle}
            labelFormatter={(v) => dayLabel(String(v))}
            formatter={(value, _name, item) => {
              const p = item.payload as TrendPoint;
              return [`${pct(value)} (${p.present}/${p.expected})`, "Present"];
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            name="Attendance"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#fill-rate)"
            connectNulls
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Average attendance rate per weekday (single series). */
export function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  return (
    <div
      className="chart-glow h-56 w-full"
      role="img"
      aria-label="Average attendance rate by weekday."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="fill-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={pct}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={{ fill: "var(--foreground)", opacity: 0.04, radius: 8 }}
            contentStyle={glassTooltip}
            labelStyle={tooltipLabelStyle}
            formatter={(value) => [pct(value), "Average"]}
          />
          <Bar
            dataKey="rate"
            fill="url(#fill-bar)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            animationDuration={900}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
