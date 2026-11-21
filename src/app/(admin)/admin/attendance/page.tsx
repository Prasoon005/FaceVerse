import type { Metadata } from "next";

import { AttendanceReport, type ReportRow } from "@/components/admin/attendance-report";
import { LiveUpdates } from "@/components/admin/live-updates";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, loadApprovedLeave } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import {
  addDays,
  attendanceRate,
  dayStatus,
  eachDay,
  isValidDay,
  localDay,
  monthRange,
  summarize,
} from "@/lib/attendance/days";

export const metadata: Metadata = { title: "Attendance report" };

const MAX_DAYS = 62;

export default async function AdminAttendancePage({
  searchParams,
}: PageProps<"/admin/attendance">) {
  const { admin } = await requireAdminPage();
  const params = await searchParams;
  const settings = await getAttendanceSettings(admin);
  const today = localDay(new Date(), settings.timezone);

  let from = isValidDay(params.from) ? params.from : monthRange(today).from;
  let to = isValidDay(params.to) ? params.to : today;
  if (to < from) [from, to] = [to, from];
  if (eachDay(from, to).length > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));

  const [allUsers, attendance, reviews, leave] = await Promise.all([
    listWorkspaceUsers(admin),
    admin
      .from("attendance")
      .select("user_id, day, check_in_at, check_out_at")
      .gte("day", from)
      .lte("day", to),
    admin
      .from("absence_reviews")
      .select("id, user_id, day, status, reason")
      .gte("day", from)
      .lte("day", to),
    loadApprovedLeave(admin, from, to),
  ]);
  // Admins don't mark attendance; the report covers members.
  const users = allUsers.filter((u) => u.role === "member");

  const attendanceMap = new Map((attendance.data ?? []).map((a) => [`${a.user_id}:${a.day}`, a]));
  const reviewMap = new Map((reviews.data ?? []).map((r) => [`${r.user_id}:${r.day}`, r]));
  const days = eachDay(from, to);

  const rows: ReportRow[] = users.map((u) => {
    const joinedDay = localDay(new Date(u.joinedAt), settings.timezone);
    const cells = days.map((day) => {
      const record = attendanceMap.get(`${u.id}:${day}`) ?? null;
      const review = reviewMap.get(`${u.id}:${day}`) ?? null;
      return {
        day,
        status: dayStatus({
          day,
          today,
          joinedDay,
          workDays: settings.work_days,
          attendance: record,
          review,
          onLeave: leave.get(u.id)?.has(day) ?? false,
        }),
        checkInAt: record?.check_in_at ?? null,
        checkOutAt: record?.check_out_at ?? null,
        reviewStatus: review?.status ?? null,
      };
    });
    const summary = summarize(cells.map((c) => c.status));
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      disabled: u.disabled,
      cells,
      summary,
      rate: attendanceRate(summary),
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Attendance report"
        description="Who was present or absent each day. Click an absent day to ask for a reason."
        actions={<LiveUpdates />}
      />
      <AttendanceReport
        from={from}
        to={to}
        today={today}
        timezone={settings.timezone}
        days={days}
        rows={rows}
      />
    </div>
  );
}
