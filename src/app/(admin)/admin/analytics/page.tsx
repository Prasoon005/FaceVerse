import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Hourglass,
  MonitorSmartphone,
  Percent,
  Smartphone,
  TrendingDown,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";

import {
  AttendanceTrendChart,
  type TrendPoint,
  WeekdayChart,
  type WeekdayPoint,
} from "@/components/admin/analytics-charts";
import { LiveUpdates } from "@/components/admin/live-updates";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWorkspaceUsers, loadApprovedLeave } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { addDays, eachDay, isoWeekday, localDay, WEEKDAYS } from "@/lib/attendance/days";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const WINDOW = 30;
const LIVE_TABLES = ["attendance", "people", "leave_requests"];

function minutesIn(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

const asClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;

export default async function AnalyticsPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  const today = localDay(new Date(), settings.timezone);
  // Completed days only (today is still in progress).
  const to = addDays(today, -1);
  const from = addDays(today, -WINDOW);

  const [users, { data: attendance }, leave] = await Promise.all([
    listWorkspaceUsers(admin),
    admin
      .from("attendance")
      .select("user_id, day, check_in_at, source")
      .gte("day", from)
      .lte("day", to),
    loadApprovedLeave(admin, from, to),
  ]);
  const members = users.filter((u) => u.role === "member" && !u.disabled);
  const present = new Set((attendance ?? []).map((a) => `${a.user_id}:${a.day}`));
  const workdays = eachDay(from, to).filter(
    (d) => settings.work_days.includes(isoWeekday(d)) && !settings.holidays[d],
  );

  const perUser = new Map(members.map((m) => [m.id, { present: 0, expected: 0 }]));
  const perWeekday = new Map<number, { present: number; expected: number }>();
  const trend: TrendPoint[] = workdays.map((day) => {
    let dayPresent = 0;
    let dayExpected = 0;
    for (const m of members) {
      if (localDay(new Date(m.joinedAt), settings.timezone) > day) continue;
      if (leave.get(m.id)?.has(day)) continue;
      const here = present.has(`${m.id}:${day}`);
      dayExpected++;
      if (here) dayPresent++;
      const u = perUser.get(m.id)!;
      u.expected++;
      if (here) u.present++;
    }
    const wd = perWeekday.get(isoWeekday(day)) ?? { present: 0, expected: 0 };
    wd.present += dayPresent;
    wd.expected += dayExpected;
    perWeekday.set(isoWeekday(day), wd);
    return {
      day,
      present: dayPresent,
      expected: dayExpected,
      rate: dayExpected ? (dayPresent / dayExpected) * 100 : null,
    };
  });

  const weekdays: WeekdayPoint[] = WEEKDAYS.filter((w) => settings.work_days.includes(w.iso)).map(
    (w) => {
      const v = perWeekday.get(w.iso);
      return { label: w.short, rate: v?.expected ? (v.present / v.expected) * 100 : null };
    },
  );

  const totals = trend.reduce(
    (acc, t) => ({ present: acc.present + t.present, expected: acc.expected + t.expected }),
    { present: 0, expected: 0 },
  );
  const overallRate = totals.expected ? Math.round((totals.present / totals.expected) * 100) : null;
  const checkIns = attendance ?? [];
  const avgCheckIn = checkIns.length
    ? checkIns.reduce((s, a) => s + minutesIn(a.check_in_at, settings.timezone), 0) /
      checkIns.length
    : null;
  const kioskShare = checkIns.length
    ? Math.round((checkIns.filter((a) => a.source === "kiosk").length / checkIns.length) * 100)
    : null;

  const ranked = members
    .map((m) => {
      const s = perUser.get(m.id)!;
      return { ...m, rate: s.expected ? s.present / s.expected : null, ...s };
    })
    .filter((m) => m.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.present - a.present);
  const top = ranked.slice(0, 5);
  const bottom = [...ranked]
    .reverse()
    .slice(0, 5)
    .filter((m) => (m.rate ?? 1) < 0.9);

  const enrollment = [
    {
      key: "approved",
      label: "Approved",
      icon: CircleCheck,
      bar: "bg-success",
      count: members.filter((m) => m.enrollment === "approved").length,
    },
    {
      key: "pending",
      label: "Pending",
      icon: Hourglass,
      bar: "bg-warning",
      count: members.filter((m) => m.enrollment === "pending").length,
    },
    {
      key: "rejected",
      label: "Rejected",
      icon: CircleX,
      bar: "bg-danger",
      count: members.filter((m) => m.enrollment === "rejected").length,
    },
    {
      key: "none",
      label: "Not enrolled",
      icon: CircleDashed,
      bar: "bg-muted-foreground/40",
      count: members.filter((m) => m.enrollment === "none").length,
    },
  ];

  const cards = [
    {
      label: `Attendance rate (${WINDOW} days)`,
      value: overallRate === null ? "–" : `${overallRate}%`,
      icon: Percent,
      tone: "success",
      hint: `${totals.present} of ${totals.expected} expected check-ins`,
    },
    {
      label: "Average check-in",
      value: avgCheckIn === null ? "–" : asClock(avgCheckIn),
      icon: Clock,
      tone: "default",
      hint: settings.timezone.replace("_", " "),
    },
    {
      label: "Via kiosk",
      value: kioskShare === null ? "–" : `${kioskShare}%`,
      icon: MonitorSmartphone,
      tone: "warning",
      hint: "of check-ins; the rest from phones",
    },
    {
      label: "Active members",
      value: members.length,
      icon: Smartphone,
      tone: "default",
      hint: `${enrollment[0]!.count} with an approved identity`,
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Analytics"
        description={`Attendance over the last ${WINDOW} days (working days, approved leave excluded).`}
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daily attendance rate</CardTitle>
            <CardDescription>
              Share of expected members who checked in, per working day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By weekday</CardTitle>
            <CardDescription>Average attendance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <WeekdayChart data={weekdays} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-warning" aria-hidden /> Top attendance
            </CardTitle>
            <CardDescription>Best rate over the period</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList rows={top} empty="No attendance data yet." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="size-4 text-danger-foreground" aria-hidden /> Needs attention
            </CardTitle>
            <CardDescription>Below 90% attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList rows={bottom} empty="Everyone is at 90% or above." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identity enrollment</CardTitle>
            <CardDescription>Members by status of their face + voice</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div
              className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={enrollment.map((e) => `${e.label}: ${e.count}`).join(", ")}
            >
              {enrollment.map((e) =>
                e.count > 0 ? (
                  <span key={e.key} className={cn("h-full", e.bar)} style={{ flexGrow: e.count }} />
                ) : null,
              )}
            </div>
            <ul className="grid gap-2">
              {enrollment.map((e) => (
                <li key={e.key} className="flex items-center gap-2 text-sm">
                  <span className={cn("size-2.5 rounded-full", e.bar)} aria-hidden />
                  <e.icon className="size-4 text-muted-foreground" aria-hidden />
                  {e.label}
                  <span className="ml-auto font-mono font-semibold">{e.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RankList({
  rows,
  empty,
}: {
  rows: { id: string; name: string; rate: number | null; present: number; expected: number }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="grid gap-3">
      {rows.map((r, i) => {
        const pct = Math.round((r.rate ?? 0) * 100);
        return (
          <li key={r.id} className="grid gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <PersonAvatar name={r.name} url={null} className="size-6" />
              <span className="truncate font-medium">{r.name}</span>
              <span className="ml-auto font-mono text-xs">
                {pct}%{" "}
                <span className="text-muted-foreground">
                  ({r.present}/{r.expected})
                </span>
              </span>
            </div>
            <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
