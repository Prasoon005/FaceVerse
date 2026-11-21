"use client";

import { motion } from "framer-motion";
import { Download, Filter } from "lucide-react";
import { useState } from "react";

import { statusStyle } from "@/components/attendance/status-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import {
  type DayStatus,
  dayStatusCodes,
  dayStatusLabels,
  isoWeekday,
  type StatusSummary,
  toCsv,
} from "@/lib/attendance/days";
import { formatDay, formatPercent, formatTimeIn } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/database";

import { AskReasonDialog, type AskTarget } from "./ask-reason-dialog";

export type ReportRow = {
  userId: string;
  name: string;
  email: string;
  disabled: boolean;
  cells: {
    day: string;
    status: DayStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    reviewStatus: ReviewStatus | null;
  }[];
  summary: StatusSummary;
  rate: number | null;
};

const LEGEND: DayStatus[] = ["present", "absent", "leave", "excused", "pending", "off", "today"];

/** Users × days grid with a legend, date-range filter, CSV export and "Ask reason". */
export function AttendanceReport({
  from,
  to,
  today,
  timezone,
  days,
  rows,
}: {
  from: string;
  to: string;
  today: string;
  timezone: string;
  days: string[];
  rows: ReportRow[];
}) {
  const { play } = useSoundFeedback();
  const [target, setTarget] = useState<AskTarget | null>(null);

  function exportCsv() {
    const header = ["Name", "Email", ...days, "Present", "Absent", "Excused", "Pending", "Rate"];
    const body = rows.map((r) => [
      r.name,
      r.email,
      ...r.cells.map((c) =>
        c.status === "present"
          ? `P ${formatTimeIn(c.checkInAt, timezone)}-${c.checkOutAt ? formatTimeIn(c.checkOutAt, timezone) : ""}`
          : dayStatusCodes[c.status],
      ),
      r.summary.present,
      r.summary.absent,
      r.summary.excused,
      r.summary.pending,
      r.rate == null ? "" : `${Math.round(r.rate * 100)}%`,
    ]);
    const blob = new Blob(["﻿" + toCsv([header, ...body])], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    play("success");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="grid gap-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={from} max={today} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={to} max={today} />
          </div>
          <Button type="submit" variant="outline">
            <Filter aria-hidden /> Apply
          </Button>
        </form>
        <Button className="ml-auto" onClick={exportCsv} disabled={rows.length === 0}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      <ul className="flex flex-wrap gap-3 text-xs" aria-label="Legend">
        {LEGEND.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "grid size-5 place-items-center rounded border font-semibold",
                statusStyle[s].cell,
              )}
            >
              {dayStatusCodes[s]}
            </span>
            {dayStatusLabels[s]}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-44 bg-card px-3 py-2 text-left font-medium"
              >
                User
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={cn(
                    "min-w-8 px-0.5 py-2 text-center text-[10px] font-medium text-muted-foreground",
                    day === today && "text-brand",
                  )}
                  title={formatDay(day, { weekday: "long" })}
                >
                  <span className="block">
                    {["M", "T", "W", "T", "F", "S", "S"][isoWeekday(day) - 1]}
                  </span>
                  <span className="font-mono">{Number(day.slice(8))}</span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <motion.tr
                key={row.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: r * 0.04 }}
                className={cn("border-b last:border-0", row.disabled && "opacity-50")}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal"
                >
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.summary.present}P · {row.summary.absent}A · {row.summary.excused}E
                  </span>
                </th>
                {row.cells.map((cell) => {
                  const label = `${row.name}, ${formatDay(cell.day)}: ${dayStatusLabels[cell.status]}${
                    cell.checkInAt
                      ? ` (in ${formatTimeIn(cell.checkInAt, timezone)}${cell.checkOutAt ? `, out ${formatTimeIn(cell.checkOutAt, timezone)}` : ""})`
                      : ""
                  }`;
                  const askable = cell.status === "absent" && cell.reviewStatus === null;
                  return (
                    <td key={cell.day} className="p-0.5 text-center">
                      {askable ? (
                        <button
                          type="button"
                          title={`${label}. Click to ask for a reason.`}
                          aria-label={`${label}. Ask for a reason`}
                          onClick={() =>
                            setTarget({ userId: row.userId, name: row.name, day: cell.day })
                          }
                          className={cn(
                            "grid size-7 place-items-center rounded border text-[10px] font-semibold transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            statusStyle[cell.status].cell,
                          )}
                        >
                          {dayStatusCodes[cell.status]}
                        </button>
                      ) : (
                        <span
                          title={label}
                          aria-label={label}
                          className={cn(
                            "grid size-7 place-items-center rounded border text-[10px] font-semibold",
                            statusStyle[cell.status].cell,
                          )}
                        >
                          {dayStatusCodes[cell.status]}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatPercent(row.rate)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <AskReasonDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
