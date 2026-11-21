/**
 * Server helper: one user's days in a range with status, lateness, reason and leave, plus the
 * deduction score. Works with the user's own client (RLS) or the admin client.
 */
import type { WorkspaceSettings } from "@/lib/admin/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { AbsenceReview } from "@/types/database";

import { type DayStatus, dayStatus, eachDay, leaveDaySet } from "./days";
import { computeScore, lateMinutes, type ScoreResult } from "./score";

type Client = ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;

export type UserDay = {
  day: string;
  status: DayStatus;
  lateBy: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  review: AbsenceReview | null;
};

export async function loadUserDays({
  client,
  userId,
  joinedDay,
  from,
  to,
  today,
  settings,
}: {
  client: Client;
  userId: string;
  joinedDay: string;
  from: string;
  to: string;
  today: string;
  settings: WorkspaceSettings;
}): Promise<{ days: UserDay[]; score: ScoreResult }> {
  const [attendance, reviews, leave] = await Promise.all([
    client
      .from("attendance")
      .select("day, check_in_at, check_out_at")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    client
      .from("absence_reviews")
      .select("*")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    client
      .from("leave_requests")
      .select("start_day, end_day")
      .eq("user_id", userId)
      .eq("status", "approved")
      .lte("start_day", to)
      .gte("end_day", from),
  ]);
  const byDay = new Map((attendance.data ?? []).map((a) => [a.day, a]));
  const reviewByDay = new Map((reviews.data ?? []).map((r) => [r.day, r]));
  const leaveDays = leaveDaySet(leave.data ?? []);

  const days: UserDay[] = eachDay(from, to).map((day) => {
    const record = byDay.get(day) ?? null;
    const review = reviewByDay.get(day) ?? null;
    const lateBy = record ? lateMinutes(record.check_in_at, settings) : 0;
    return {
      day,
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
      lateBy,
      checkInAt: record?.check_in_at ?? null,
      checkOutAt: record?.check_out_at ?? null,
      review,
    };
  });

  const score = computeScore(
    days.map((d) => ({
      day: d.day,
      status: d.status,
      lateBy: d.lateBy,
      reviewStatus: d.review?.status ?? null,
    })),
    settings,
  );
  return { days, score };
}
