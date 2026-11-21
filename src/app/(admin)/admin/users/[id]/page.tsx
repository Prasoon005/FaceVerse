import {
  ArrowLeft,
  AudioLines,
  CalendarCheck,
  CalendarRange,
  Gauge,
  MessagesSquare,
  Lock,
  LockOpen,
  Mail,
  Percent,
  ScanFace,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { actionLabel } from "@/components/admin/audit-labels";
import { MessageUserButton } from "@/components/admin/message-user-button";
import { statusStyle } from "@/components/attendance/status-style";
import { leaveKinds, leaveStatusBadge } from "@/components/leave/leave-kinds";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWorkspaceUsers, loadApprovedLeave, signPaths } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import {
  addDays,
  attendanceRate,
  dayStatus,
  dayStatusCodes,
  dayStatusLabels,
  eachDay,
  localDay,
  summarize,
} from "@/lib/attendance/days";
import { computeScore, lateMinutes } from "@/lib/attendance/score";
import { formatDay, formatDateTime, formatRelative, formatTimeIn } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "User" };

const DAYS = 42;

/** Everything about one user for the admin: identity, attendance, requests and activity. */
export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  const today = localDay(new Date(), settings.timezone);
  const from = addDays(today, -(DAYS - 1));

  const users = await listWorkspaceUsers(admin);
  const user = users.find((u) => u.id === id);
  if (!user) notFound();

  const [{ data: identity }, attendance, reviews, leaveMap, { data: leaves }, { data: logs }] =
    await Promise.all([
      admin
        .from("people_overview")
        .select("*")
        .eq("owner_id", id)
        .eq("linked_user_id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from("attendance")
        .select("*")
        .eq("user_id", id)
        .gte("day", from)
        .order("day", { ascending: false }),
      admin.from("absence_reviews").select("day, status").eq("user_id", id).gte("day", from),
      loadApprovedLeave(admin, from, today),
      admin
        .from("leave_requests")
        .select("*")
        .eq("user_id", id)
        .order("start_day", { ascending: false })
        .limit(5),
      admin
        .from("audit_logs")
        .select("id, action, created_at")
        .eq("actor_id", id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const avatarUrls = await signPaths(admin, "avatars", [identity?.avatar_path ?? null]);
  const avatarUrl = identity?.avatar_path ? (avatarUrls.get(identity.avatar_path) ?? null) : null;
  const byDay = new Map((attendance.data ?? []).map((a) => [a.day, a]));
  const reviewByDay = new Map((reviews.data ?? []).map((r) => [r.day, r]));
  const joinedDay = localDay(new Date(user.joinedAt), settings.timezone);
  const leaveDays = leaveMap.get(id) ?? new Set<string>();

  const cells = eachDay(from, today).map((day) => {
    const record = byDay.get(day) ?? null;
    const review = reviewByDay.get(day) ?? null;
    const lateBy = record ? lateMinutes(record.check_in_at, settings) : 0;
    return {
      day,
      lateBy,
      reviewStatus: review?.status ?? null,
      status: dayStatus({
        day,
        today,
        joinedDay,
        workDays: settings.work_days,
        holidays: settings.holidays,
        attendance: record,
        review,
        onLeave: leaveDays.has(day),
        late: lateBy > 0,
      }),
    };
  });
  const summary = summarize(cells.map((c) => c.status));
  const rate = attendanceRate(summary);
  // This month's deduction score (company norms).
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthScore = computeScore(
    cells.filter((c) => c.day >= monthStart),
    settings,
  );

  const cards = [
    {
      label: `Attendance (${DAYS} days)`,
      value: rate === null ? "–" : `${Math.round(rate * 100)}%`,
      icon: Percent,
      tone: "success",
      hint: `${summary.present + summary.late} present (${summary.late} late) · ${summary.absent} absent`,
    },
    {
      label: "Score this month",
      value: `${monthScore.score}/${monthScore.base}`,
      icon: Gauge,
      tone: monthScore.score / monthScore.base >= 0.85 ? "success" : "danger",
      hint: `−${monthScore.deducted} deducted · ${monthScore.pending} under review`,
    },
    {
      label: "Leave days",
      value: summary.leave,
      icon: CalendarRange,
      tone: "default",
      hint: "Approved, same period",
    },
    {
      label: "Last sign-in",
      value: user.lastSignInAt ? formatRelative(user.lastSignInAt) : "Never",
      icon: CalendarCheck,
      tone: "warning",
      hint: user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/admin/users">
          <ArrowLeft aria-hidden /> All users
        </Link>
      </Button>

      <section className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border bg-card p-5">
        <div
          aria-hidden
          className="absolute -top-16 -right-10 size-56 animate-aurora rounded-full bg-brand/10 blur-3xl"
        />
        <PersonAvatar name={user.name} url={avatarUrl} className="size-20" />
        <div className="relative grid flex-1 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5" aria-hidden /> {user.email} · joined {formatDay(joinedDay)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {user.role === "admin" ? <ShieldCheck className="size-3" aria-hidden /> : null}
              {user.role}
            </Badge>
            {user.disabled ? (
              <Badge variant="outline" className="text-danger-foreground">
                Disabled
              </Badge>
            ) : null}
          </div>
        </div>
        {user.role === "member" ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/admin/messages?user=${user.id}`}>
                <MessagesSquare aria-hidden /> Chat
              </Link>
            </Button>
            <MessageUserButton userId={user.id} name={user.name} />
          </div>
        ) : null}
      </section>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Biometric identity</CardTitle>
            <CardDescription>
              Face and voice they submitted for attendance and login
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {identity ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {identity.approval_status}
                  </Badge>
                  <Badge variant="outline">
                    {identity.biometrics_locked ? (
                      <Lock className="size-3" aria-hidden />
                    ) : (
                      <LockOpen className="size-3" aria-hidden />
                    )}
                    {identity.biometrics_locked ? "Locked (final)" : "Unlocked"}
                  </Badge>
                </div>
                <p className="flex items-center gap-2">
                  <ScanFace className="size-4 text-brand" aria-hidden /> {identity.face_samples}{" "}
                  face samples
                </p>
                <p className="flex items-center gap-2">
                  <AudioLines className="size-4 text-brand" aria-hidden /> {identity.voice_samples}{" "}
                  voice samples
                </p>
                {identity.locked_at ? (
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDateTime(identity.locked_at)}
                  </p>
                ) : null}
                {identity.review_note ? (
                  <p className="text-xs text-muted-foreground">
                    Review note: {identity.review_note}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Not enrolled yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last {DAYS} days</CardTitle>
            <CardDescription>Hover a day for details</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-7 gap-1.5" aria-label="Attendance by day">
              {cells.map((c) => {
                const record = byDay.get(c.day);
                const label = `${formatDay(c.day, { weekday: "short" })}: ${dayStatusLabels[c.status]}${
                  record ? ` (in ${formatTimeIn(record.check_in_at, settings.timezone)})` : ""
                }`;
                return (
                  <li
                    key={c.day}
                    title={label}
                    aria-label={label}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md border text-[10px] font-semibold transition-transform hover:scale-110",
                      statusStyle[c.status].cell,
                    )}
                  >
                    {dayStatusCodes[c.status] || Number(c.day.slice(8))}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent leave</CardTitle>
          </CardHeader>
          <CardContent>
            {(leaves ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {(leaves ?? []).map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("capitalize", leaveStatusBadge[l.status])}
                    >
                      {l.status}
                    </Badge>
                    <span>
                      {formatDay(l.start_day)}
                      {l.end_day !== l.start_day ? ` – ${formatDay(l.end_day)}` : ""}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {leaveKinds[l.kind].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(logs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {(logs ?? []).map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                    <span className="first-letter:uppercase">{actionLabel(l.action)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelative(l.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
