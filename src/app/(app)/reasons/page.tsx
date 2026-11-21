import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LiveUpdates } from "@/components/admin/live-updates";
import {
  type ReasonHistoryItem,
  type ReasonTodo,
  ReasonsView,
} from "@/components/reasons/reasons-view";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { localDay, monthRange } from "@/lib/attendance/days";
import { formatClock, parseClock } from "@/lib/attendance/score";
import { loadUserDays } from "@/lib/attendance/user-days";

export const metadata: Metadata = { title: "Reasons & score" };

const LIVE_TABLES = ["absence_reviews", "attendance"];

/** Absence and late reasons in one place, with the monthly deduction score. */
export default async function ReasonsPage({ searchParams }: PageProps<"/reasons">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user, profile } = viewer;
  const params = await searchParams;

  const settings = await getAttendanceSettings(supabase);
  const today = localDay(new Date(), settings.timezone);
  const requested =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : today.slice(0, 7);
  const month = requested > today.slice(0, 7) ? today.slice(0, 7) : requested;
  const { from, to } = monthRange(`${month}-01`);
  const joinedDay = localDay(new Date(profile?.created_at ?? user.created_at), settings.timezone);

  const [{ days, score }, { data: asked }, { data: reviews }] = await Promise.all([
    loadUserDays({
      client: supabase,
      userId: user.id,
      joinedDay,
      from,
      to: to > today ? today : to,
      today,
      settings,
    }),
    supabase
      .from("absence_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "asked")
      .order("day", { ascending: false }),
    supabase
      .from("absence_reviews")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "asked")
      .order("day", { ascending: false })
      .limit(50),
  ]);

  // Admin questions first (any month), then this month's absent/late days without a reason.
  const todos: ReasonTodo[] = (asked ?? []).map((r) => ({
    day: r.day,
    kind: r.kind,
    lateBy: 0,
    question: r.question,
    reason: r.reason,
  }));
  const askedDays = new Set(todos.map((t) => t.day));
  for (const d of [...days].reverse()) {
    if (askedDays.has(d.day) || d.review || d.day === today) continue;
    if (d.status === "absent") {
      todos.push({ day: d.day, kind: "absence", lateBy: 0, question: null, reason: null });
    } else if (d.status === "late") {
      todos.push({ day: d.day, kind: "late", lateBy: d.lateBy, question: null, reason: null });
    }
  }
  // Late today can be explained right away.
  const todayRow = days.find((d) => d.day === today);
  if (todayRow?.status === "late" && !todayRow.review && !askedDays.has(today)) {
    todos.unshift({
      day: today,
      kind: "late",
      lateBy: todayRow.lateBy,
      question: null,
      reason: null,
    });
  }
  for (const t of todos) {
    if (t.kind === "late" && t.lateBy === 0) {
      t.lateBy = days.find((d) => d.day === t.day)?.lateBy ?? 0;
    }
  }

  const history: ReasonHistoryItem[] = (reviews ?? []).map((r) => ({
    id: r.id,
    day: r.day,
    kind: r.kind,
    status: r.status,
    reason: r.reason,
    decisionNote: r.decision_note,
    updatedAt: r.decided_at ?? r.answered_at ?? r.created_at,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Reasons & score"
        description="Explain absences and late arrivals. Your admin reviews them; approved reasons save your points."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <ReasonsView
        userId={user.id}
        month={month}
        isCurrentMonth={month === today.slice(0, 7)}
        score={score}
        todos={todos}
        history={history}
        norms={{
          workStart: formatClock(parseClock(settings.work_start)),
          grace: settings.late_grace_minutes,
          base: settings.score_base,
          absent: settings.deduct_absent,
          late: settings.deduct_late,
          excused: settings.deduct_excused,
          lateExcused: settings.deduct_late_excused,
        }}
      />
    </div>
  );
}
