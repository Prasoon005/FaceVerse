/**
 * Late arrivals and the monthly deduction score (company norms set in Workspace settings).
 * Pure functions so they can be unit-tested and shared by server pages.
 */
import type { ReviewStatus } from "@/types/database";

import type { DayStatus } from "./days";

export type OfficeHours = {
  timezone: string;
  /** "HH:MM" or "HH:MM:SS". */
  work_start: string;
  late_grace_minutes: number;
};

export type ScoreRules = {
  score_base: number;
  deduct_absent: number;
  deduct_late: number;
  deduct_excused: number;
  deduct_late_excused: number;
};

export const DEFAULT_OFFICE: Omit<OfficeHours, "timezone"> = {
  work_start: "09:30",
  late_grace_minutes: 15,
};

export const DEFAULT_RULES: ScoreRules = {
  score_base: 100,
  deduct_absent: 10,
  deduct_late: 2,
  deduct_excused: 0,
  deduct_late_excused: 0,
};

/** Minutes since local midnight of an instant in a timezone. */
export function minutesOfDay(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

/** "09:30" / "09:30:00" → 570. */
export function parseClock(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

/** "570" → "09:30". */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Minutes after the office start time, if the check-in came after the grace period;
 * otherwise 0 (on time). E.g. start 09:30, grace 15: 09:44 → 0, 09:50 → 20.
 */
export function lateMinutes(checkInIso: string, office: OfficeHours): number {
  const start = parseClock(office.work_start);
  const at = minutesOfDay(checkInIso, office.timezone);
  const late = at - start;
  return late > office.late_grace_minutes ? late : 0;
}

export type ScoreInput = {
  day: string;
  status: DayStatus;
  /** Minutes late on a present day (0 = on time). */
  lateBy: number;
  /** Status of the reason (absence or late) for that day, if any. */
  reviewStatus: ReviewStatus | null;
};

export type DeductionKind = "absent" | "late" | "excused" | "late-excused";

export type Deduction = { day: string; kind: DeductionKind; points: number; lateBy?: number };

export type ScoreResult = {
  base: number;
  score: number;
  deducted: number;
  deductions: Deduction[];
  /** Days whose reason is still under review (no deduction yet). */
  pending: number;
};

/**
 * The score for a set of days: start at `score_base` and subtract per the rules.
 * - absent (no reason, or reason rejected) → deduct_absent
 * - excused absence (reason approved)      → deduct_excused
 * - late (no reason, or rejected)          → deduct_late
 * - late with an approved reason           → deduct_late_excused
 * - reason still under review              → nothing yet (counted as pending)
 * Leave, days off and on-time days cost nothing. The score never goes below 0.
 */
export function computeScore(days: readonly ScoreInput[], rules: ScoreRules): ScoreResult {
  const deductions: Deduction[] = [];
  let pending = 0;
  const push = (day: string, kind: DeductionKind, points: number, lateBy?: number) => {
    if (points > 0) deductions.push({ day, kind, points, ...(lateBy ? { lateBy } : {}) });
  };

  for (const d of days) {
    const underReview = d.reviewStatus === "asked" || d.reviewStatus === "answered";
    if (d.status === "absent") push(d.day, "absent", rules.deduct_absent);
    else if (d.status === "excused") push(d.day, "excused", rules.deduct_excused);
    else if (d.status === "pending") pending++;
    else if (d.lateBy > 0 && (d.status === "late" || d.status === "present")) {
      if (d.reviewStatus === "approved") {
        push(d.day, "late-excused", rules.deduct_late_excused, d.lateBy);
      } else if (underReview) {
        pending++;
      } else {
        push(d.day, "late", rules.deduct_late, d.lateBy);
      }
    }
  }

  const deducted = deductions.reduce((sum, x) => sum + x.points, 0);
  return {
    base: rules.score_base,
    score: Math.max(0, Math.round((rules.score_base - deducted) * 100) / 100),
    deducted,
    deductions,
    pending,
  };
}

/** Grade label for a score as a share of the base. */
export function scoreGrade(score: number, base: number): "excellent" | "good" | "warning" | "poor" {
  const ratio = base > 0 ? score / base : 0;
  if (ratio >= 0.95) return "excellent";
  if (ratio >= 0.85) return "good";
  if (ratio >= 0.7) return "warning";
  return "poor";
}
