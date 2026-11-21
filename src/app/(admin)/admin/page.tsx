import {
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  Clock,
  MessageSquareText,
  Plane,
  RefreshCcwDot,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AbsentList, type AbsentEntry } from "@/components/admin/absent-list";
import { LiveUpdates } from "@/components/admin/live-updates";
import { TodoStrip } from "@/components/admin/todo-strip";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem, StaggerList, StaggerListItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWorkspaceUsers, loadApprovedLeave } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { addDays, isoWeekday, localDay } from "@/lib/attendance/days";
import { formatDay, formatTimeIn } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };

const LIVE_TABLES = [
  "attendance",
  "absence_reviews",
  "people",
  "leave_requests",
  "identity_change_requests",
];

export default async function AdminOverviewPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  const today = localDay(new Date(), settings.timezone);
  const isWorkday = (day: string) => settings.work_days.includes(isoWeekday(day));

  // The most recent working day before today (for "who was absent").
  let lastWorkday = addDays(today, -1);
  for (let i = 0; i < 7 && !isWorkday(lastWorkday); i++) lastWorkday = addDays(lastWorkday, -1);

  const [allUsers, todayRows, lastRows, pending, reviews, leave, changeRequests, leaveRequests] =
    await Promise.all([
      listWorkspaceUsers(admin),
      admin.from("attendance").select("user_id, check_in_at, check_out_at").eq("day", today),
      admin.from("attendance").select("user_id").eq("day", lastWorkday),
      admin
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending"),
      admin.from("absence_reviews").select("user_id, day, status"),
      loadApprovedLeave(admin, lastWorkday, today),
      admin
        .from("identity_change_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
  // Admins have no attendance; everything below is about members.
  const users = allUsers.filter((u) => u.role === "member");

  const active = users.filter((u) => !u.disabled);
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const checkedIn = todayRows.data ?? [];
  const presentLast = new Set((lastRows.data ?? []).map((r) => r.user_id));
  const reviewFor = new Map(
    (reviews.data ?? []).filter((r) => r.day === lastWorkday).map((r) => [r.user_id, r.status]),
  );
  const answered = (reviews.data ?? []).filter((r) => r.status === "answered").length;

  const absent: AbsentEntry[] = active
    .filter(
      (u) =>
        localDay(new Date(u.joinedAt), settings.timezone) <= lastWorkday &&
        !presentLast.has(u.id) &&
        !leave.get(u.id)?.has(lastWorkday) &&
        reviewFor.get(u.id) !== "approved",
    )
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      day: lastWorkday,
      reviewStatus: reviewFor.get(u.id) ?? null,
    }));

  const onLeaveToday = active.filter((u) => leave.get(u.id)?.has(today)).length;
  const checkedInIds = new Set(checkedIn.map((r) => r.user_id));
  const notYet = active.filter((u) => !checkedInIds.has(u.id) && !leave.get(u.id)?.has(today));

  const cards = [
    {
      label: "Checked in today",
      value: checkedIn.length,
      icon: CalendarCheck,
      tone: "success",
      hint: `${active.length} active users`,
    },
    {
      label: "Not checked in yet",
      value: isWorkday(today) ? notYet.length : 0,
      icon: Clock,
      tone: "warning",
      hint: isWorkday(today) ? "Working day" : "Day off today",
    },
    {
      label: "On leave today",
      value: onLeaveToday,
      icon: Plane,
      tone: "default",
      hint: "Approved leave",
    },
  ] as const;

  const todos = [
    {
      label: "Enrollments to approve",
      count: pending.count ?? 0,
      href: "/admin/approvals",
      icon: ClipboardCheck,
    },
    {
      label: "Change requests",
      count: changeRequests.count ?? 0,
      href: "/admin/change-requests",
      icon: RefreshCcwDot,
    },
    {
      label: "Leave requests",
      count: leaveRequests.count ?? 0,
      href: "/admin/leaves",
      icon: CalendarRange,
    },
    { label: "Absence reasons", count: answered, href: "/admin/reviews", icon: MessageSquareText },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Admin overview"
        description="Everyone's attendance, approvals and absence reasons in one place."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />

      <TodoStrip items={todos} />

      <Stagger aria-label="Key stats" className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s check-ins</CardTitle>
            <CardDescription>{formatDay(today, { weekday: "long" })}</CardDescription>
          </CardHeader>
          <CardContent>
            {checkedIn.length === 0 ? (
              <EmptyState
                title="No check-ins yet"
                description="They appear here live as people mark attendance."
              />
            ) : (
              <StaggerList className="divide-y">
                {[...checkedIn]
                  .sort((a, b) => b.check_in_at.localeCompare(a.check_in_at))
                  .map((r) => (
                    <StaggerListItem
                      key={r.user_id}
                      className="flex items-center gap-3 py-2.5 text-sm"
                    >
                      <span className="size-2 rounded-full bg-success" aria-hidden />
                      <span className="font-medium">
                        {nameById.get(r.user_id) ?? "Unknown user"}
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        in {formatTimeIn(r.check_in_at, settings.timezone)}
                        {r.check_out_at
                          ? ` · out ${formatTimeIn(r.check_out_at, settings.timezone)}`
                          : ""}
                      </span>
                    </StaggerListItem>
                  ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absent on {formatDay(lastWorkday, { weekday: "long" })}</CardTitle>
            <CardDescription>Last working day. Ask for a reason with one click.</CardDescription>
          </CardHeader>
          <CardContent>
            <AbsentList entries={absent} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/approvals">Review approvals</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/reviews">Absence reviews</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/attendance">Full attendance report</Link>
        </Button>
      </div>
    </div>
  );
}
