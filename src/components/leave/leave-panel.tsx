"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, CalendarRange, Hourglass, Send, X } from "lucide-react";
import { useState } from "react";

import { AnimatedNumber } from "@/components/shared/motion";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { cancelLeave, requestLeave } from "@/lib/actions/leave";
import { countWorkdays } from "@/lib/attendance/days";
import { formatDay, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaveKind, LeaveRequest } from "@/types/database";

import { leaveKinds, leaveStatusBadge } from "./leave-kinds";

export function formatRange(start: string, end: string) {
  return start === end
    ? formatDay(start, { weekday: "short" })
    : `${formatDay(start)} – ${formatDay(end)}`;
}

/** The user's leave: summary tiles, request dialog and request history. */
export function LeavePanel({
  requests,
  today,
  workDays,
}: {
  requests: LeaveRequest[];
  today: string;
  workDays: number[];
}) {
  const { run, busyKey } = useServerAction();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [kind, setKind] = useState<LeaveKind>("casual");
  const [reason, setReason] = useState("");

  const year = today.slice(0, 4);
  const approvedDays = requests
    .filter((r) => r.status === "approved" && r.start_day.startsWith(year))
    .reduce((sum, r) => sum + countWorkdays(r.start_day, r.end_day, workDays), 0);
  const pending = requests.filter((r) => r.status === "pending").length;
  const upcoming = requests.filter((r) => r.status === "approved" && r.end_day >= today).length;
  const days = countWorkdays(start, end, workDays);

  const tiles = [
    {
      label: `Leave days taken in ${year}`,
      value: approvedDays,
      icon: CalendarRange,
      tone: "text-sky-600 dark:text-sky-300 bg-sky-500/10",
    },
    {
      label: "Waiting for approval",
      value: pending,
      icon: Hourglass,
      tone: "text-warning-foreground bg-warning/10",
    },
    {
      label: "Upcoming approved",
      value: upcoming,
      icon: CalendarPlus,
      tone: "text-success-foreground bg-success/10",
    },
  ];

  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.li
            key={t.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <span className={cn("grid size-10 place-items-center rounded-lg", t.tone)}>
              <t.icon className="size-5" aria-hidden />
            </span>
            <span className="grid">
              <span className="font-mono text-2xl font-semibold">
                <AnimatedNumber value={t.value} />
              </span>
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">My requests</h2>
        <Button
          onClick={() => {
            setStart(today);
            setEnd(today);
            setKind("casual");
            setReason("");
            setOpen(true);
          }}
        >
          <CalendarPlus aria-hidden /> Request leave
        </Button>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="No leave requests"
          description="Plan time off in advance; approved days won't count as absent."
        />
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {requests.map((r) => {
              const K = leaveKinds[r.kind];
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="hover-lift grid gap-2 rounded-xl border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-muted">
                      <K.icon className="size-4" aria-hidden />
                    </span>
                    <span className="font-medium">{formatRange(r.start_day, r.end_day)}</span>
                    <span className="text-xs text-muted-foreground">
                      {countWorkdays(r.start_day, r.end_day, workDays)} working day(s) · {K.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("ml-auto capitalize", leaveStatusBadge[r.status])}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  {r.decision_note ? (
                    <p className="text-xs">
                      <span className="font-medium">Admin:</span> {r.decision_note}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Requested {formatRelative(r.created_at)}</span>
                    {r.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyKey === r.id}
                        onClick={() =>
                          run(r.id, () => cancelLeave({ requestId: r.id }), {
                            success: "Request cancelled",
                          })
                        }
                      >
                        <X aria-hidden /> Cancel
                      </Button>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
            <DialogDescription>
              Your admin gets notified and approves or rejects it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="leave-start">From</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (e.target.value > end) setEnd(e.target.value);
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="leave-end">To</Label>
                <Input
                  id="leave-end"
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <motion.p
              key={days}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              <span className="font-mono font-semibold text-foreground">{days}</span> working day
              {days === 1 ? "" : "s"}
            </motion.p>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Type</span>
              <div role="radiogroup" aria-label="Leave type" className="grid grid-cols-4 gap-2">
                {(Object.keys(leaveKinds) as LeaveKind[]).map((k) => {
                  const K = leaveKinds[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={kind === k}
                      onClick={() => setKind(k)}
                      className={cn(
                        "grid justify-items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                        kind === k
                          ? "border-brand bg-brand/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <K.icon className="size-4" aria-hidden />
                      {K.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Family function out of town"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 3 || days === 0 || busyKey === "request"}
              onClick={() =>
                run("request", () => requestLeave({ startDay: start, endDay: end, kind, reason }), {
                  success: "Leave request sent",
                  onSuccess: () => setOpen(false),
                })
              }
            >
              <Send aria-hidden /> Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
