"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AnimatedNumber } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dayStatusCodes,
  dayStatusLabels,
  isoWeekday,
  summarize,
  WEEKDAYS,
} from "@/lib/attendance/days";
import { formatDay, formatTimeIn } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AbsenceAnswerDialog } from "./absence-answer-dialog";
import { type CalendarDay, statusStyle } from "./status-style";

const reviewLabels = {
  asked: "Admin asked for a reason",
  answered: "Reason sent, waiting for admin",
  approved: "Approved as excused",
  rejected: "Reason rejected",
} as const;

function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** Month view of the user's attendance with a detail panel for the selected day. */
export function AttendanceCalendar({
  month,
  today,
  timezone,
  days,
  userId,
}: {
  month: string;
  today: string;
  timezone: string;
  days: CalendarDay[];
  userId: string;
}) {
  const [selected, setSelected] = useState<string>(
    days.find((d) => d.day === today)?.day ?? days[0]!.day,
  );
  const [explaining, setExplaining] = useState(false);
  const summary = summarize(days.map((d) => d.status));
  const leading = isoWeekday(days[0]!.day) - 1;
  const detail = days.find((d) => d.day === selected) ?? null;
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  const canExplain =
    detail !== null &&
    (detail.status === "absent" || detail.status === "pending") &&
    detail.review?.status !== "rejected";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <CardTitle className="mr-auto">{monthLabel}</CardTitle>
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/attendance?month=${shiftMonth(month, -1)}`} aria-label="Previous month">
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/attendance">Today</Link>
        </Button>
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/attendance?month=${shiftMonth(month, 1)}`} aria-label="Next month">
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Month summary">
          {(["present", "absent", "leave", "excused", "pending"] as const).map((key) => {
            const Icon = statusStyle[key].icon;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5",
                  statusStyle[key].cell,
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="text-xs">{dayStatusLabels[key]}</span>
                <span className="ml-auto font-mono text-lg font-semibold">
                  <AnimatedNumber value={summary[key]} />
                </span>
              </li>
            );
          })}
        </ul>

        <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((w) => (
            <span
              key={w.iso}
              className="text-xs font-medium text-muted-foreground"
              role="columnheader"
            >
              {w.short}
            </span>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden />
          ))}
          {days.map((d, i) => (
            <motion.button
              key={d.day}
              type="button"
              role="gridcell"
              aria-selected={d.day === selected}
              aria-label={`${formatDay(d.day, { weekday: "long" })}: ${dayStatusLabels[d.status]}`}
              onClick={() => setSelected(d.day)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.012, type: "spring", stiffness: 420, damping: 28 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg border text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                statusStyle[d.status].cell,
                d.day === selected && "ring-2 ring-brand ring-offset-2 ring-offset-background",
              )}
            >
              <span className="font-mono">{Number(d.day.slice(8))}</span>
              <span className="absolute bottom-0.5 text-[9px] font-semibold opacity-70" aria-hidden>
                {dayStatusCodes[d.status]}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {detail ? (
            <motion.div
              key={detail.day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="grid gap-3 rounded-xl border bg-muted/30 p-4"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{formatDay(detail.day, { weekday: "long" })}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
                    statusStyle[detail.status].cell,
                  )}
                >
                  {dayStatusLabels[detail.status]}
                </span>
              </div>
              {detail.checkInAt ? (
                <p className="text-sm text-muted-foreground">
                  In{" "}
                  <span className="font-mono text-foreground">
                    {formatTimeIn(detail.checkInAt, timezone)}
                  </span>
                  {" · "}Out{" "}
                  <span className="font-mono text-foreground">
                    {formatTimeIn(detail.checkOutAt, timezone)}
                  </span>
                </p>
              ) : null}
              {detail.review ? (
                <div className="grid gap-1 text-sm">
                  <p className="font-medium">{reviewLabels[detail.review.status]}</p>
                  {detail.review.question ? (
                    <p className="text-muted-foreground">Admin: {detail.review.question}</p>
                  ) : null}
                  {detail.review.reason ? (
                    <p className="text-muted-foreground">You: {detail.review.reason}</p>
                  ) : null}
                  {detail.review.decision_note ? (
                    <p className="text-muted-foreground">
                      Decision note: {detail.review.decision_note}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {canExplain && detail.day <= today ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setExplaining(true)}
                >
                  <MessageSquareText aria-hidden />
                  {detail.review?.reason ? "Update reason" : "Explain absence"}
                </Button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
      {explaining && detail ? (
        <AbsenceAnswerDialog
          key={detail.day}
          open
          onOpenChange={setExplaining}
          userId={userId}
          day={detail.day}
          question={detail.review?.question}
          initialReason={detail.review?.reason}
        />
      ) : null}
    </Card>
  );
}
