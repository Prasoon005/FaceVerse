import {
  AlarmClock,
  CalendarClock,
  CalendarOff,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleX,
  PartyPopper,
  Clock,
  type LucideIcon,
  Plane,
  ShieldCheck,
} from "lucide-react";

import type { DayStatus } from "@/lib/attendance/days";

/** Colour + icon per day status. Colour is never the only signal: cells also show a code. */
export const statusStyle: Record<DayStatus, { cell: string; dot: string; icon: LucideIcon }> = {
  present: {
    cell: "bg-success/15 text-success-foreground border-success/30",
    dot: "bg-success",
    icon: CircleCheck,
  },
  late: {
    cell: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
    icon: AlarmClock,
  },
  absent: {
    cell: "bg-danger/15 text-danger-foreground border-danger/30",
    dot: "bg-danger",
    icon: CircleX,
  },
  excused: {
    cell: "bg-brand/15 text-brand border-brand/30",
    dot: "bg-brand",
    icon: ShieldCheck,
  },
  leave: {
    cell: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
    icon: Plane,
  },
  holiday: {
    cell: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    dot: "bg-violet-500",
    icon: PartyPopper,
  },
  pending: {
    cell: "bg-warning/15 text-warning-foreground border-warning/30",
    dot: "bg-warning",
    icon: CircleHelp,
  },
  off: {
    cell: "bg-muted/40 text-muted-foreground border-transparent",
    dot: "bg-muted-foreground/40",
    icon: CalendarOff,
  },
  today: { cell: "border-brand/60 border-dashed text-foreground", dot: "bg-brand/50", icon: Clock },
  upcoming: {
    cell: "border-transparent text-muted-foreground/60",
    dot: "bg-transparent",
    icon: CalendarClock,
  },
  untracked: {
    cell: "border-transparent text-muted-foreground/40",
    dot: "bg-transparent",
    icon: CircleDashed,
  },
};

export type CalendarDay = {
  day: string;
  status: import("@/lib/attendance/days").DayStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  review: import("@/types/database").AbsenceReview | null;
  /** Minutes late (0 = on time or absent). */
  lateBy?: number;
};
