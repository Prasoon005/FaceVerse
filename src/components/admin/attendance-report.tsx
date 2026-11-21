"use client";

import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
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
    lateBy: number;
  }[];
  summary: StatusSummary;
  rate: number | null;
  /** Deduction score over the selected range (company norms). */
  score: number;
  scoreBase: number;
};

const LEGEND: DayStatus[] = [
  "present",
  "late",
  "absent",
  "leave",
  "holiday",
  "excused",
  "pending",
  "off",
  "today",
];

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Days that counted towards attendance (attended, absent, excused or pending). */
function workingDays(r: ReportRow) {
  const s = r.summary;
  return s.present + s.late + s.absent + s.excused + s.pending;
}

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
    const header = [
      "Name",
      "Email",
      ...days,
      "Present",
      "Late",
      "Absent",
      "Excused",
      "Pending",
      "Rate",
      "Score",
    ];
    const body = rows.map((r) => [
      r.name,
      r.email,
      ...r.cells.map((c) =>
        c.status === "present" || c.status === "late"
          ? `${dayStatusCodes[c.status]} ${formatTimeIn(c.checkInAt, timezone)}-${c.checkOutAt ? formatTimeIn(c.checkOutAt, timezone) : ""}`
          : dayStatusCodes[c.status],
      ),
      r.summary.present,
      r.summary.late,
      r.summary.absent,
      r.summary.excused,
      r.summary.pending,
      r.rate == null ? "" : `${Math.round(r.rate * 100)}%`,
      `${r.score}/${r.scoreBase}`,
    ]);
    download(toCsv([header, ...body]), `attendance-${from}-to-${to}.csv`);
  }

  /** One line per person with the totals: ready for payroll / HR. */
  function exportSummaryCsv() {
    const header = [
      "Name",
      "Email",
      "Working days",
      "Present",
      "Late",
      "Absent",
      "Excused",
      "On leave",
      "Holidays",
      "Attendance rate",
      "Score",
    ];
    const body = rows.map((r) => [
      r.name,
      r.email,
      workingDays(r),
      r.summary.present,
      r.summary.late,
      r.summary.absent,
      r.summary.excused,
      r.summary.leave,
      r.summary.holiday,
      r.rate == null ? "" : `${Math.round(r.rate * 100)}%`,
      `${r.score}/${r.scoreBase}`,
    ]);
    download(toCsv([header, ...body]), `attendance-summary-${from}-to-${to}.csv`);
  }

  /** Opens a clean, printable summary; the browser's "Save as PDF" turns it into a PDF. */
  function exportPdf() {
    const win = window.open("", "_blank");
    if (!win) return;
    const range = `${formatDay(from, { weekday: undefined })} – ${formatDay(to, { weekday: undefined })}`;
    const tr = rows
      .map(
        (r) => `<tr>
          <td><strong>${escapeHtml(r.name)}</strong><br><span class="muted">${escapeHtml(r.email)}</span></td>
          <td>${workingDays(r)}</td><td>${r.summary.present}</td><td>${r.summary.late}</td>
          <td>${r.summary.absent}</td><td>${r.summary.leave}</td><td>${r.summary.holiday}</td>
          <td>${r.rate == null ? "–" : Math.round(r.rate * 100) + "%"}</td>
          <td><strong>${r.score}</strong>/${r.scoreBase}</td></tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>Attendance report ${from} to ${to}</title>
      <style>
        body{font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1d1d1f;margin:32px}
        h1{font-size:22px;margin:0 0 4px;letter-spacing:-.02em}
        .muted{color:#6e6e73;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6e6e73;text-align:left;padding:8px;border-bottom:1px solid #d2d2d7}
        td{padding:8px;border-bottom:1px solid #ececf0;vertical-align:top}
        tr:nth-child(even) td{background:#fafafc}
        footer{margin-top:24px}
      </style></head><body>
      <h1>Attendance report</h1>
      <div class="muted">${escapeHtml(range)} · ${rows.length} members · generated ${new Date().toLocaleString()}</div>
      <table><thead><tr><th>Member</th><th>Working days</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Holidays</th><th>Rate</th><th>Score</th></tr></thead>
      <tbody>${tr}</tbody></table>
      <footer class="muted">FaceVerse · Holidays and approved leave are never counted as absences.</footer>
      <script>window.onload=()=>{window.print()}<\/script></body></html>`);
    win.document.close();
    play("success");
  }

  function download(csv: string, filename: string) {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download aria-hidden /> Daily CSV
          </Button>
          <Button variant="outline" onClick={exportSummaryCsv} disabled={rows.length === 0}>
            <FileSpreadsheet aria-hidden /> Summary CSV
          </Button>
          <Button onClick={exportPdf} disabled={rows.length === 0}>
            <FileText aria-hidden /> PDF report
          </Button>
        </div>
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
                className="sticky left-0 z-10 min-w-44 bg-card-solid px-3 py-2 text-left font-medium"
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
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Score
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
                  className="sticky left-0 z-10 bg-card-solid px-3 py-2 text-left font-normal"
                >
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.summary.present}P · {row.summary.late}T · {row.summary.absent}A ·{" "}
                    {row.summary.excused}E
                  </span>
                </th>
                {row.cells.map((cell) => {
                  const label = `${row.name}, ${formatDay(cell.day)}: ${dayStatusLabels[cell.status]}${
                    cell.checkInAt
                      ? ` (in ${formatTimeIn(cell.checkInAt, timezone)}${cell.lateBy ? `, ${cell.lateBy} min late` : ""}${cell.checkOutAt ? `, out ${formatTimeIn(cell.checkOutAt, timezone)}` : ""})`
                      : ""
                  }`;
                  const askable =
                    (cell.status === "absent" || cell.status === "late") &&
                    cell.reviewStatus === null;
                  return (
                    <td key={cell.day} className="p-0.5 text-center">
                      {askable ? (
                        <button
                          type="button"
                          title={`${label}. Click to ask for a reason.`}
                          aria-label={`${label}. Ask for a reason`}
                          onClick={() =>
                            setTarget({
                              userId: row.userId,
                              name: row.name,
                              day: cell.day,
                              kind: cell.status === "late" ? "late" : "absence",
                              lateBy: cell.lateBy,
                            })
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
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono font-semibold tabular-nums",
                    row.score / row.scoreBase >= 0.95
                      ? "text-success-foreground"
                      : row.score / row.scoreBase >= 0.7
                        ? "text-warning-foreground"
                        : "text-danger-foreground",
                  )}
                >
                  {row.score}
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
