import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AbsenceQuestions } from "@/components/attendance/absence-questions";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { CheckInCard } from "@/components/attendance/check-in-card";
import type { CalendarDay } from "@/components/attendance/status-style";
import { LiveUpdates } from "@/components/admin/live-updates";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { AttendanceInsights } from "@/components/attendance/attendance-insights";
import {
  addDays,
  attendanceRate,
  currentStreak,
  dayStatus,
  eachDay,
  leaveDaySet,
  localDay,
  monthRange,
  summarize,
} from "@/lib/attendance/days";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: PageProps<"/attendance">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user, profile } = viewer;
  const params = await searchParams;

  const settings = await getAttendanceSettings(supabase);
  const today = localDay(new Date(), settings.timezone);
  const month =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : today.slice(0, 7);
  const { from, to } = monthRange(`${month}-01`);

  // The streak looks back up to 90 days from today.
  const streakFrom = addDays(today, -89);
  const [attendance, reviews, linked, leave, recent] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .gte("day", from)
      .lte("day", to > today ? today : to),
    supabase
      .from("absence_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("day", { ascending: false }),
    supabase
      .from("people_overview")
      .select("id, name, approval_status, review_note, face_samples")
      .eq("linked_user_id", user.id)
      .eq("owner_id", user.id),
    supabase
      .from("leave_requests")
      .select("start_day, end_day")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .lte("start_day", to > today ? to : today)
      .gte("end_day", from < streakFrom ? from : streakFrom),
    supabase.from("attendance").select("day").eq("user_id", user.id).gte("day", streakFrom),
  ]);
  const leaveDays = leaveDaySet(leave.data ?? []);

  const byDay = new Map((attendance.data ?? []).map((a) => [a.day, a]));
  const reviewByDay = new Map((reviews.data ?? []).map((r) => [r.day, r]));
  const joinedDay = localDay(new Date(profile?.created_at ?? user.created_at), settings.timezone);

  const days: CalendarDay[] = eachDay(from, to).map((day) => {
    const record = byDay.get(day) ?? null;
    const review = reviewByDay.get(day) ?? null;
    return {
      day,
      status: dayStatus({
        day,
        today,
        joinedDay,
        workDays: settings.work_days,
        attendance: record,
        review,
        onLeave: leaveDays.has(day),
      }),
      checkInAt: record?.check_in_at ?? null,
      checkOutAt: record?.check_out_at ?? null,
      review,
    };
  });

  // Today's record may be outside the viewed month.
  const { data: todayRecord } =
    today >= from && today <= to
      ? { data: byDay.get(today) ?? null }
      : await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("day", today)
          .maybeSingle();

  // Streak + this month's rate for the insights strip.
  const presentRecent = new Set((recent.data ?? []).map((r) => r.day));
  const streakStatuses = eachDay(streakFrom, today)
    .reverse()
    .map((day) =>
      dayStatus({
        day,
        today,
        joinedDay,
        workDays: settings.work_days,
        attendance: presentRecent.has(day) ? { check_in_at: day } : null,
        review: reviewByDay.get(day) ?? null,
        onLeave: leaveDays.has(day),
      }),
    );
  const monthSummary = summarize(days.map((d) => d.status));

  const people = linked.data ?? [];
  const enrollment = people.some((p) => p.approval_status === "approved")
    ? "approved"
    : people.some((p) => p.approval_status === "pending")
      ? "pending"
      : people.length > 0
        ? "rejected"
        : "none";

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Attendance"
        description="Mark today's attendance with a quick face check, and see your month."
        actions={<LiveUpdates />}
      />
      <AttendanceInsights
        streak={currentStreak(streakStatuses)}
        rate={attendanceRate(monthSummary)}
        present={monthSummary.present}
        leave={monthSummary.leave}
      />
      <AbsenceQuestions
        reviews={(reviews.data ?? []).filter((r) => r.status === "asked")}
        userId={user.id}
      />
      <CheckInCard
        today={today}
        timezone={settings.timezone}
        record={
          todayRecord
            ? { checkInAt: todayRecord.check_in_at, checkOutAt: todayRecord.check_out_at }
            : null
        }
        enrollment={enrollment}
        reviewNote={people.find((p) => p.review_note)?.review_note ?? null}
      />
      <AttendanceCalendar
        month={month}
        today={today}
        timezone={settings.timezone}
        days={days}
        userId={user.id}
      />
    </div>
  );
}
