import { Flame, Trophy } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import {
  addDays,
  bestStreak,
  currentStreak,
  type DayStatus,
  dayStatusLabels,
  isoWeekday,
  localDay,
} from "@/lib/attendance/days";
import { loadUserDays } from "@/lib/attendance/user-days";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKS = 26;

const cellColor: Partial<Record<DayStatus, string>> = {
  present: "bg-success",
  late: "bg-orange-500",
  absent: "bg-danger",
  excused: "bg-brand",
  leave: "bg-sky-500",
  holiday: "bg-violet-500",
  pending: "bg-warning",
};

const legend: DayStatus[] = ["present", "late", "absent", "leave", "holiday"];

/**
 * The last six months as a calendar heatmap (one column per week), with the current and best
 * attendance streaks. Server-rendered; each cell has a text label for screen readers.
 */
export async function AttendanceHeatmap() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { supabase, user, profile } = viewer;
  const settings = await getAttendanceSettings(supabase);
  const today = localDay(new Date(), settings.timezone);

  // Start on the Monday WEEKS weeks ago, so columns line up with weeks.
  const thisMonday = addDays(today, -(isoWeekday(today) - 1));
  const from = addDays(thisMonday, -(WEEKS - 1) * 7);
  const joinedDay = localDay(new Date(profile?.created_at ?? user.created_at), settings.timezone);
  const { days } = await loadUserDays({
    client: supabase,
    userId: user.id,
    joinedDay,
    from,
    to: today,
    today,
    settings,
  });

  const statuses = days.map((d) => d.status);
  const streak = currentStreak([...statuses].reverse());
  const best = bestStreak(statuses);
  const attended = statuses.filter((s) => s === "present" || s === "late").length;

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const monthLabels = weeks.map((w, i) => {
    const first = w[0]?.day;
    if (!first) return "";
    const prev = weeks[i - 1]?.[0]?.day;
    return !prev || prev.slice(5, 7) !== first.slice(5, 7)
      ? formatDay(first, { weekday: undefined, day: undefined, month: "short" })
      : "";
  });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>Your last six months</CardTitle>
          <CardDescription>{attended} days attended. Every square is one day.</CardDescription>
        </div>
        <div className="flex gap-2">
          <StreakPill icon={Flame} label="Current streak" value={streak} tone="text-orange-500" />
          <StreakPill
            icon={Trophy}
            label="Best streak"
            value={best}
            tone="text-warning-foreground"
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="overflow-x-auto pb-1">
          <div className="inline-grid gap-1.5">
            <div className="flex gap-[3px] pl-8 text-[10px] text-muted-foreground">
              {monthLabels.map((m, i) => (
                <span key={i} className="w-3 shrink-0 overflow-visible whitespace-nowrap">
                  {m}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              <div className="grid w-7 shrink-0 grid-rows-7 gap-[3px] text-[10px] text-muted-foreground">
                {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                  <span key={i} className="h-3 leading-3">
                    {d}
                  </span>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-rows-7 gap-[3px]">
                  {week.map((d) => (
                    <Link
                      key={d.day}
                      href={`/attendance?month=${d.day.slice(0, 7)}`}
                      title={`${formatDay(d.day)}: ${
                        d.status === "holiday"
                          ? (settings.holidays[d.day] ?? "Holiday")
                          : dayStatusLabels[d.status]
                      }`}
                      aria-label={`${formatDay(d.day)}: ${dayStatusLabels[d.status]}`}
                      className={cn(
                        "size-3 rounded-[3px] transition-transform hover:scale-125",
                        cellColor[d.status] ?? "bg-foreground/[0.07]",
                        d.day === today && "ring-2 ring-brand ring-offset-1 ring-offset-background",
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {legend.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", cellColor[s])} />
              {dayStatusLabels[s]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-foreground/[0.07]" /> Day off / no data
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StreakPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-foreground/[0.04] px-3 py-2 ring-1 ring-foreground/[0.06]">
      <Icon className={cn("icon-glow size-5 rounded-full", tone)} aria-hidden />
      <span className="grid leading-tight">
        <span className="text-lg font-semibold tabular-nums">
          {value} <span className="text-xs font-normal text-muted-foreground">days</span>
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}
