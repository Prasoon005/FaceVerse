"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Gavel,
  Hourglass,
  MessageCircleQuestion,
  MessageSquareText,
  TrendingDown,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AbsenceAnswerDialog } from "@/components/attendance/absence-answer-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedNumber } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Deduction, ScoreResult } from "@/lib/attendance/score";
import { scoreGrade } from "@/lib/attendance/score";
import { formatDay, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReviewKind, ReviewStatus } from "@/types/database";

export type ReasonTodo = {
  day: string;
  kind: ReviewKind;
  lateBy: number;
  question: string | null;
  reason: string | null;
};

export type ReasonHistoryItem = {
  id: string;
  day: string;
  kind: ReviewKind;
  status: ReviewStatus;
  reason: string | null;
  decisionNote: string | null;
  updatedAt: string | null;
};

export type Norms = {
  workStart: string;
  grace: number;
  base: number;
  absent: number;
  late: number;
  excused: number;
  lateExcused: number;
};

const gradeStyle = {
  excellent: { ring: "stroke-success", text: "text-success-foreground", label: "Excellent" },
  good: { ring: "stroke-brand", text: "text-brand", label: "Good" },
  warning: { ring: "stroke-warning", text: "text-warning-foreground", label: "Needs care" },
  poor: { ring: "stroke-danger", text: "text-danger-foreground", label: "Poor" },
} as const;

const deductionLabel: Record<Deduction["kind"], string> = {
  absent: "Absent",
  late: "Late",
  excused: "Excused absence",
  "late-excused": "Excused late",
};

const statusBadge: Record<
  ReviewStatus,
  { label: string; className: string; icon: typeof Hourglass }
> = {
  asked: {
    label: "Admin asked",
    className: "border-warning/40 text-warning-foreground",
    icon: MessageCircleQuestion,
  },
  answered: { label: "Under review", className: "border-brand/40 text-brand", icon: Hourglass },
  approved: {
    label: "Approved",
    className: "border-success/40 text-success-foreground",
    icon: CircleCheck,
  },
  rejected: {
    label: "Rejected",
    className: "border-danger/40 text-danger-foreground",
    icon: CircleX,
  },
};

function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** Monthly deduction score, days that need a reason, and the history of reasons. */
export function ReasonsView({
  userId,
  month,
  isCurrentMonth,
  score,
  todos,
  history,
  norms,
}: {
  userId: string;
  month: string;
  isCurrentMonth: boolean;
  score: ScoreResult;
  todos: ReasonTodo[];
  history: ReasonHistoryItem[];
  norms: Norms;
}) {
  const [answering, setAnswering] = useState<ReasonTodo | null>(null);
  const grade = gradeStyle[scoreGrade(score.score, score.base)];
  const ratio = score.base > 0 ? score.score / score.base : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Score */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative grid justify-items-center gap-3 overflow-hidden rounded-2xl border bg-card p-5 text-center"
        >
          <div
            aria-hidden
            className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 animate-aurora rounded-full bg-brand/10 blur-3xl"
          />
          <div className="relative flex w-full items-center justify-between">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={`/reasons?month=${shiftMonth(month, -1)}`} aria-label="Previous month">
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <span className="text-sm font-medium">{monthLabel}</span>
            <Button variant="ghost" size="icon-sm" asChild disabled={isCurrentMonth}>
              <Link
                href={`/reasons?month=${shiftMonth(month, 1)}`}
                aria-label="Next month"
                aria-disabled={isCurrentMonth}
                className={cn(isCurrentMonth && "pointer-events-none opacity-40")}
              >
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </div>
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            role="img"
            aria-label={`Score ${score.score} of ${score.base}`}
            className="relative"
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="fill-none stroke-muted"
              strokeWidth="10"
            />
            <motion.circle
              key={`${month}-${score.score}`}
              cx="70"
              cy="70"
              r={radius}
              className={cn("fill-none", grade.ring)}
              strokeWidth="10"
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - ratio) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute top-[118px] left-1/2 grid -translate-x-1/2 justify-items-center">
            <span className={cn("font-mono text-3xl font-bold", grade.text)}>
              <AnimatedNumber value={score.score} />
            </span>
            <span className="text-xs text-muted-foreground">of {score.base}</span>
          </div>
          <Badge variant="outline" className={cn("relative", grade.text)}>
            {grade.label}
          </Badge>
          <div className="relative grid w-full grid-cols-2 gap-2 text-xs">
            <span className="rounded-lg border bg-muted/30 p-2">
              <span className="block font-mono text-base font-semibold text-danger-foreground">
                −{score.deducted}
              </span>
              deducted
            </span>
            <span className="rounded-lg border bg-muted/30 p-2">
              <span className="block font-mono text-base font-semibold">{score.pending}</span>
              under review
            </span>
          </div>
        </motion.section>

        {/* Needs a reason */}
        <section className="grid content-start gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-4 text-brand" aria-hidden /> Needs your reason
            {todos.length > 0 ? (
              <span className="rounded-full bg-danger px-2 text-xs text-white">{todos.length}</span>
            ) : null}
          </h2>
          {todos.length === 0 ? (
            <EmptyState
              title="Nothing to explain"
              description="Absent or late days without a reason show up here. Explaining them can save your points."
            />
          ) : (
            <ul className="grid gap-2">
              <AnimatePresence initial={false}>
                {todos.map((t, i) => (
                  <motion.li
                    key={`${t.day}-${t.kind}`}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: Math.min(i, 8) * 0.04 }}
                    className={cn(
                      "hover-lift flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3",
                      t.question && "border-warning/50 bg-warning/5",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg",
                        t.kind === "late"
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-300"
                          : "bg-danger/10 text-danger-foreground",
                      )}
                    >
                      {t.kind === "late" ? (
                        <AlarmClock className="size-4" aria-hidden />
                      ) : (
                        <UserX className="size-4" aria-hidden />
                      )}
                    </span>
                    <div className="grid min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {t.kind === "late" ? `Late by ${t.lateBy} min` : "Absent"} ·{" "}
                        {formatDay(t.day, { weekday: "short" })}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t.question
                          ? `Admin asked: ${t.question}`
                          : `Without a reason this costs ${t.kind === "late" ? norms.late : norms.absent} points`}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => setAnswering(t)}>
                      {t.question ? "Answer" : "Explain"}
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {score.deductions.length > 0 ? (
            <div className="grid gap-2 rounded-xl border bg-card p-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <TrendingDown className="size-4 text-danger-foreground" aria-hidden /> Deductions
                this month
              </h3>
              <ul className="grid gap-1 text-sm">
                {score.deductions.map((d) => (
                  <li key={`${d.day}-${d.kind}`} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDay(d.day)}
                    </span>
                    <span>
                      {deductionLabel[d.kind]}
                      {d.lateBy ? ` (${d.lateBy} min)` : ""}
                    </span>
                    <span className="ml-auto font-mono text-danger-foreground">−{d.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,340px)]">
        {/* History */}
        <section className="grid content-start gap-3">
          <h2 className="font-semibold">My reasons</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t sent any reasons yet.</p>
          ) : (
            <ul className="grid gap-2">
              {history.map((h) => {
                const b = statusBadge[h.status];
                return (
                  <li key={h.id} className="grid gap-1 rounded-xl border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {h.kind === "late" ? "Late" : "Absent"} ·{" "}
                        {formatDay(h.day, { weekday: "short" })}
                      </span>
                      <Badge variant="outline" className={cn("ml-auto", b.className)}>
                        <b.icon className="size-3" aria-hidden /> {b.label}
                      </Badge>
                    </div>
                    {h.reason ? <p className="text-sm text-muted-foreground">{h.reason}</p> : null}
                    {h.decisionNote ? (
                      <p className="text-xs">
                        <span className="font-medium">Admin:</span> {h.decisionNote}
                      </p>
                    ) : null}
                    {h.updatedAt ? (
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelative(h.updatedAt)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Norms */}
        <section className="grid content-start gap-2 rounded-xl border bg-card p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Gavel className="size-4 text-brand" aria-hidden /> Company norms
          </h2>
          <p className="text-muted-foreground">
            Office starts at <strong className="text-foreground">{norms.workStart}</strong>.
            Checking in more than <strong className="text-foreground">{norms.grace} min</strong>{" "}
            later counts as late.
          </p>
          <ul className="grid gap-1">
            <Rule label="Monthly score starts at" value={`${norms.base}`} />
            <Rule label="Absent, no reason / rejected" value={`−${norms.absent}`} />
            <Rule label="Late, no reason / rejected" value={`−${norms.late}`} />
            <Rule
              label="Absence with approved reason"
              value={norms.excused ? `−${norms.excused}` : "0"}
            />
            <Rule
              label="Late with approved reason"
              value={norms.lateExcused ? `−${norms.lateExcused}` : "0"}
            />
            <Rule label="Approved leave" value="0" />
          </ul>
          <p className="text-xs text-muted-foreground">
            While a reason is under review, nothing is deducted.
          </p>
        </section>
      </div>

      {answering ? (
        <AbsenceAnswerDialog
          key={`${answering.day}-${answering.kind}`}
          open
          onOpenChange={(open) => !open && setAnswering(null)}
          userId={userId}
          day={answering.day}
          kind={answering.kind}
          lateBy={answering.lateBy}
          question={answering.question}
          initialReason={answering.reason}
        />
      ) : null}
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </li>
  );
}
