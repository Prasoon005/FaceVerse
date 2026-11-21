import type { Metadata } from "next";

import { LiveUpdates } from "@/components/admin/live-updates";
import { UsersTable } from "@/components/admin/users-table";
import { PageHeader } from "@/components/shared/page-header";
import type { PresenceStatus } from "@/components/shared/user-avatar";
import { listWorkspaceUsers, loadApprovedLeave } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import {
  attendanceRate,
  dayStatus,
  eachDay,
  localDay,
  monthRange,
  summarize,
  type DayStatus,
} from "@/lib/attendance/days";
import { computeScore, lateMinutes } from "@/lib/attendance/score";

function presence(status: DayStatus | undefined): PresenceStatus {
  switch (status) {
    case "present":
      return "present";
    case "late":
      return "late";
    case "leave":
      return "leave";
    case "holiday":
      return "holiday";
    case "today":
      return "away";
    default:
      return "none";
  }
}

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const { admin, adminId } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  const today = localDay(new Date(), settings.timezone);
  const { from } = monthRange(today);

  const [users, attendance, reviews, leave] = await Promise.all([
    listWorkspaceUsers(admin),
    admin.from("attendance").select("user_id, day, check_in_at").gte("day", from).lte("day", today),
    admin.from("absence_reviews").select("user_id, day, status").gte("day", from).lte("day", today),
    loadApprovedLeave(admin, from, today),
  ]);

  const records = new Map((attendance.data ?? []).map((a) => [`${a.user_id}:${a.day}`, a]));
  const reviewMap = new Map((reviews.data ?? []).map((r) => [`${r.user_id}:${r.day}`, r]));
  const days = eachDay(from, today);

  const rows = users.map((u) => {
    const joinedDay = localDay(new Date(u.joinedAt), settings.timezone);
    const cells = days.map((day) => {
      const record = records.get(`${u.id}:${day}`) ?? null;
      const review = reviewMap.get(`${u.id}:${day}`) ?? null;
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
          onLeave: leave.get(u.id)?.has(day) ?? false,
          late: lateBy > 0,
        }),
      };
    });
    const summary = summarize(cells.map((c) => c.status));
    const score = computeScore(cells, settings);
    return {
      ...u,
      monthRate: attendanceRate(summary),
      monthAbsent: summary.absent,
      month: {
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        leave: summary.leave,
      },
      score: score.score,
      scoreBase: score.base,
      today: u.role === "member" ? presence(cells.at(-1)?.status) : ("none" as PresenceStatus),
      todayCheckIn: records.get(`${u.id}:${today}`)?.check_in_at ?? null,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Everyone in the workspace. Change roles, disable accounts or remove data."
        actions={<LiveUpdates />}
      />
      <UsersTable users={rows} currentUserId={adminId} />
    </div>
  );
}
