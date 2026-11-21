"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Flame, Plane, Trophy } from "lucide-react";

import { AnimatedNumber } from "@/components/shared/motion";
import { cn } from "@/lib/utils";

/** Streak, this month's attendance rate and counts, with a little celebration for streaks. */
export function AttendanceInsights({
  streak,
  rate,
  present,
  leave,
}: {
  streak: number;
  rate: number | null;
  present: number;
  leave: number;
}) {
  const pct = rate === null ? null : Math.round(rate * 100);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hover-lift relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-4"
      >
        <span
          className={cn(
            "relative grid size-12 place-items-center rounded-xl",
            streak > 0 ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground",
          )}
        >
          <motion.span
            animate={streak > 0 ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="size-6" aria-hidden />
          </motion.span>
        </span>
        <span className="grid">
          <span className="font-mono text-2xl font-semibold">
            <AnimatedNumber value={streak} />
          </span>
          <span className="text-xs text-muted-foreground">
            day streak {streak >= 5 ? "· on fire!" : ""}
          </span>
        </span>
        {streak >= 10 ? (
          <Trophy
            className="absolute top-3 right-3 size-4 text-warning"
            aria-label="10+ day streak"
          />
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-4"
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          role="img"
          aria-label={pct === null ? "No rate yet" : `${pct}% this month`}
        >
          <circle cx="32" cy="32" r={radius} className="fill-none stroke-muted" strokeWidth="6" />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            className={cn(
              "fill-none",
              pct === null
                ? "stroke-muted"
                : pct >= 90
                  ? "stroke-success"
                  : pct >= 70
                    ? "stroke-warning"
                    : "stroke-danger",
            )}
            strokeWidth="6"
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - (rate ?? 0)) }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          <text
            x="32"
            y="36"
            textAnchor="middle"
            className="fill-foreground font-mono text-[13px] font-semibold"
          >
            {pct === null ? "–" : `${pct}%`}
          </text>
        </svg>
        <span className="grid">
          <span className="text-sm font-medium">This month</span>
          <span className="text-xs text-muted-foreground">attendance rate</span>
        </span>
      </motion.div>

      <Tile
        icon={CalendarCheck}
        label="Days present this month"
        value={present}
        tone="bg-success/10 text-success-foreground"
        delay={0.12}
      />
      <Tile
        icon={Plane}
        label="Leave days this month"
        value={leave}
        tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        delay={0.18}
      />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  tone: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-4"
    >
      <span className={cn("grid size-12 place-items-center rounded-xl", tone)}>
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="grid">
        <span className="font-mono text-2xl font-semibold">
          <AnimatedNumber value={value} />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </motion.div>
  );
}
