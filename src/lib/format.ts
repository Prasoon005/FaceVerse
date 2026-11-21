const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday", "just now". */
export function formatRelative(date: string | Date | null | undefined, now: Date = new Date()) {
  if (!date) return "Never";
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date),
  );
}

export function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

/** "09:12" in the given timezone (attendance times use the workspace timezone). */
export function formatTimeIn(date: string | Date | null | undefined, timeZone: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(date),
  );
}

/** "Fri, 20 Nov" for a YYYY-MM-DD day (no timezone shift). */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...options,
  }).format(new Date(`${day}T00:00:00Z`));
}
