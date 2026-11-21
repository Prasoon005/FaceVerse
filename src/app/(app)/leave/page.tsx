import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LiveUpdates } from "@/components/admin/live-updates";
import { LeavePanel } from "@/components/leave/leave-panel";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { localDay } from "@/lib/attendance/days";

export const metadata: Metadata = { title: "Leave" };

const LIVE_TABLES = ["leave_requests"];

export default async function LeavePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user } = viewer;

  const settings = await getAttendanceSettings(supabase);
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("start_day", { ascending: false })
    .limit(100);

  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader
        title="Leave"
        description="Request time off in advance. Approved leave days don't count as absent."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <LeavePanel
        requests={requests ?? []}
        today={localDay(new Date(), settings.timezone)}
        workDays={settings.work_days}
      />
    </div>
  );
}
