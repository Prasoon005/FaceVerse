import type { Metadata } from "next";

import { LiveUpdates } from "@/components/admin/live-updates";
import { UsersTable } from "@/components/admin/users-table";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, loadApprovedLeave } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import {
  attendanceRate,
  dayStatus,
  eachDay,
  localDay,
  monthRange,
  summarize,
} from "@/lib/attendance/days";

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

  const present = new Set((attendance.data ?? []).map((a) => `${a.user_id}:${a.day}`));
  const reviewMap = new Map((reviews.data ?? []).map((r) => [`${r.user_id}:${r.day}`, r]));
  const days = eachDay(from, today);

  const rows = users.map((u) => {
    const joinedDay = localDay(new Date(u.joinedAt), settings.timezone);
    const summary = summarize(
      days.map((day) =>
        dayStatus({
          day,
          today,
          joinedDay,
          workDays: settings.work_days,
          attendance: present.has(`${u.id}:${day}`) ? { check_in_at: day } : null,
          review: reviewMap.get(`${u.id}:${day}`) ?? null,
          onLeave: leave.get(u.id)?.has(day) ?? false,
        }),
      ),
    );
    return { ...u, monthRate: attendanceRate(summary), monthAbsent: summary.absent };
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
