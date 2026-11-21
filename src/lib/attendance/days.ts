/**
 * Attendance day maths (Phase 4A). Days are "YYYY-MM-DD" strings in the workspace
 * timezone, so a check-in at 00:30 IST counts for the right day everywhere.
 */
import type { AbsenceReview, Attendance } from "@/types/database";

export type DayStatus =
  | "present"
  | "absent"
  | "excused"
  | "leave"
  | "pending"
  | "off"
  | "today"
  | "upcoming"
  | "untracked";

export const dayStatusLabels: Record<DayStatus, string> = {
  present: "Present",
  absent: "Absent",
  excused: "Excused",
  leave: "On leave",
  pending: "Reason pending",
  off: "Day off",
  today: "Not checked in yet",
  upcoming: "Upcoming",
  untracked: "Before joining",
};

/** Short code used in the report grid and CSV. */
export const dayStatusCodes: Record<DayStatus, string> = {
  present: "P",
  absent: "A",
  excused: "E",
  leave: "L",
  pending: "?",
  off: "-",
  today: "·",
  upcoming: "",
  untracked: "",
};

export const WEEKDAYS = [
  { iso: 1, short: "Mon", long: "Monday" },
  { iso: 2, short: "Tue", long: "Tuesday" },
  { iso: 3, short: "Wed", long: "Wednesday" },
  { iso: 4, short: "Thu", long: "Thursday" },
  { iso: 5, short: "Fri", long: "Friday" },
  { iso: 6, short: "Sat", long: "Saturday" },
  { iso: 7, short: "Sun", long: "Sunday" },
] as const;

/** Calendar day of `date` in `timeZone`, as YYYY-MM-DD. */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toUtcDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function addDays(day: string, n: number): string {
  const d = toUtcDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: string): number {
  return toUtcDate(day).getUTCDay() || 7;
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** First and last day of the month containing `day` ("YYYY-MM-DD"). */
export function monthRange(day: string): { from: string; to: string } {
  const from = `${day.slice(0, 7)}-01`;
  const next = toUtcDate(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(next.toISOString().slice(0, 10), -1) };
}

export function isValidDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    toUtcDate(value).toISOString().slice(0, 10) === value
  );
}

export function dayStatus({
  day,
  today,
  joinedDay,
  workDays,
  attendance,
  review,
  onLeave = false,
}: {
  day: string;
  today: string;
  /** Days before the user joined aren't counted. */
  joinedDay: string;
  workDays: readonly number[];
  attendance?: Pick<Attendance, "check_in_at"> | null;
  review?: Pick<AbsenceReview, "status"> | null;
  /** The day falls inside an approved leave request. */
  onLeave?: boolean;
}): DayStatus {
  if (attendance) return "present";
  const workday = workDays.includes(isoWeekday(day));
  if (onLeave && workday && day >= joinedDay) return "leave";
  if (day > today) return "upcoming";
  if (day < joinedDay) return "untracked";
  if (!workday) return "off";
  if (review?.status === "approved") return "excused";
  if (review?.status === "asked" || review?.status === "answered") return "pending";
  if (day === today) return "today";
  return "absent";
}

export type StatusSummary = Record<DayStatus, number>;

export function summarize(statuses: readonly DayStatus[]): StatusSummary {
  const summary = Object.fromEntries(
    Object.keys(dayStatusLabels).map((k) => [k, 0]),
  ) as StatusSummary;
  for (const s of statuses) summary[s]++;
  return summary;
}

/** Present share of the days that counted (present + absent + excused + pending). */
export function attendanceRate(summary: StatusSummary): number | null {
  const counted = summary.present + summary.absent + summary.excused + summary.pending;
  return counted === 0 ? null : summary.present / counted;
}

/** Every day covered by the given (approved) leave ranges. */
export function leaveDaySet(
  ranges: readonly { start_day: string; end_day: string }[],
): Set<string> {
  const days = new Set<string>();
  for (const r of ranges) {
    if (!isValidDay(r.start_day) || !isValidDay(r.end_day) || r.end_day < r.start_day) continue;
    for (const d of eachDay(r.start_day, r.end_day)) days.add(d);
  }
  return days;
}

/** Working days in an inclusive range (used to show how long a leave request is). */
export function countWorkdays(from: string, to: string, workDays: readonly number[]): number {
  if (!isValidDay(from) || !isValidDay(to) || to < from) return 0;
  return eachDay(from, to).filter((d) => workDays.includes(isoWeekday(d))).length;
}

/** Consecutive present working days ending today (or the last working day). Days off don't break it. */
export function currentStreak(statusesNewestFirst: readonly DayStatus[]): number {
  let streak = 0;
  for (const s of statusesNewestFirst) {
    if (s === "present") streak++;
    else if (s === "off" || s === "today" || s === "upcoming" || s === "leave") continue;
    else break;
  }
  return streak;
}

/** RFC 4180 CSV: quotes fields that contain commas, quotes or newlines. */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell == null ? "" : String(cell);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");
}
