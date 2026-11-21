import type { Metadata } from "next";

import type { DecisionItem } from "@/components/admin/decision-board";
import { LiveUpdates } from "@/components/admin/live-updates";
import { LeaveBoard } from "@/components/admin/request-boards";
import { leaveKinds } from "@/components/leave/leave-kinds";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { countWorkdays } from "@/lib/attendance/days";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Leave requests" };

const LIVE_TABLES = ["leave_requests"];

export default async function AdminLeavesPage() {
  const { admin } = await requireAdminPage();
  const [users, settings, { data: requests }] = await Promise.all([
    listWorkspaceUsers(admin),
    getAttendanceSettings(admin),
    admin.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const items: DecisionItem[] = (requests ?? []).map((r) => {
    const days = countWorkdays(r.start_day, r.end_day, settings.work_days);
    const range =
      r.start_day === r.end_day
        ? formatDay(r.start_day, { weekday: "short" })
        : `${formatDay(r.start_day)} – ${formatDay(r.end_day)}`;
    return {
      id: r.id,
      status: r.status,
      userName: userById.get(r.user_id)?.name ?? "Unknown user",
      userEmail: userById.get(r.user_id)?.email ?? "",
      createdAt: r.created_at,
      title: `${leaveKinds[r.kind].label} leave · ${range} · ${days} working day${days === 1 ? "" : "s"}`,
      body: r.reason,
      decisionNote: r.decision_note,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Leave requests"
        description="Approve planned time off. Approved days show as “On leave” in reports."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <LeaveBoard items={items} />
    </div>
  );
}
