"use client";

import { motion } from "framer-motion";
import {
  AudioLines,
  CircleCheck,
  Clock,
  Hourglass,
  Lock,
  RefreshCcwDot,
  ScanFace,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import { PersonAvatar } from "@/components/people/person-avatar";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { cancelIdentityChange, requestIdentityChange } from "@/lib/actions/identity";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApprovalStatus, ChangeRequestStatus } from "@/types/database";

export type IdentitySummary = {
  name: string;
  avatarUrl: string | null;
  faceSamples: number;
  voiceSamples: number;
  approvalStatus: ApprovalStatus;
  reviewNote: string | null;
  lockedAt: string | null;
  reviewedAt: string | null;
};

export type ChangeRequestSummary = {
  id: string;
  status: ChangeRequestStatus;
  reason: string;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

const requestBadge: Record<ChangeRequestStatus, string> = {
  pending: "border-warning/40 text-warning-foreground",
  approved: "border-success/40 text-success-foreground",
  rejected: "border-danger/40 text-danger-foreground",
  completed: "border-brand/40 text-brand",
  cancelled: "text-muted-foreground",
};

/** The locked identity: status timeline, samples, and the "request a change" flow. */
export function IdentityCard({
  identity,
  requests,
}: {
  identity: IdentitySummary;
  requests: ChangeRequestSummary[];
}) {
  const { run, busyKey } = useServerAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const pending = requests.find((r) => r.status === "pending") ?? null;
  const approved = identity.approvalStatus === "approved";

  const timeline = [
    { label: "Submitted & locked", at: identity.lockedAt, state: "done" as const },
    {
      label: approved ? "Approved by admin" : "Waiting for admin review",
      at: approved ? identity.reviewedAt : null,
      state: approved ? ("done" as const) : ("current" as const),
    },
    {
      label: "Attendance & biometric login active",
      at: null,
      state: approved ? ("done" as const) : ("upcoming" as const),
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative grid justify-items-center gap-4 overflow-hidden rounded-2xl border bg-card p-6 text-center"
      >
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 size-56 -translate-x-1/2 animate-aurora rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative">
          <motion.span
            aria-hidden
            className={cn(
              "absolute -inset-2 rounded-full border-2 border-dashed",
              approved ? "border-success/60" : "border-warning/60",
            )}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <PersonAvatar name={identity.name} url={identity.avatarUrl} className="size-28" />
          <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-4 border-card bg-brand text-primary-foreground">
            <Lock className="size-4" aria-hidden />
          </span>
        </div>
        <div className="relative grid gap-1">
          <h2 className="text-xl font-semibold">{identity.name}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge
              variant="outline"
              className={approved ? requestBadge.approved : requestBadge.pending}
            >
              {approved ? (
                <ShieldCheck className="size-3" aria-hidden />
              ) : (
                <Hourglass className="size-3" aria-hidden />
              )}
              {approved ? "Verified" : "Pending approval"}
            </Badge>
            <Badge variant="outline">
              <Lock className="size-3" aria-hidden /> Final
            </Badge>
          </div>
        </div>
        <div className="relative grid w-full grid-cols-2 gap-3">
          <Stat icon={ScanFace} label="Face samples" value={identity.faceSamples} />
          <Stat icon={AudioLines} label="Voice samples" value={identity.voiceSamples} />
        </div>
      </motion.div>

      <div className="grid content-start gap-6">
        <section className="grid gap-3 rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-medium">Status</h3>
          <ol className="grid gap-0">
            {timeline.map((item, i) => (
              <motion.li
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {i < timeline.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 left-3.5 h-[calc(100%-1.75rem)] w-px",
                      item.state === "done" ? "bg-success" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative grid size-7 shrink-0 place-items-center rounded-full border",
                    item.state === "done" && "border-success bg-success/15 text-success-foreground",
                    item.state === "current" &&
                      "border-warning bg-warning/15 text-warning-foreground",
                    item.state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {item.state === "current" ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-warning/30" />
                  ) : null}
                  {item.state === "done" ? (
                    <CircleCheck className="size-4" aria-hidden />
                  ) : (
                    <Clock className="size-4" aria-hidden />
                  )}
                </span>
                <span className="grid gap-0.5 pt-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.at ? (
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                  ) : null}
                </span>
              </motion.li>
            ))}
          </ol>
        </section>

        <section className="grid gap-3 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">Need to change it?</h3>
              <p className="text-xs text-muted-foreground">
                Your face and voice are final. Ask your admin for one more enrollment.
              </p>
            </div>
            {pending ? null : (
              <Button
                variant="outline"
                onClick={() => {
                  setReason("");
                  setOpen(true);
                }}
              >
                <RefreshCcwDot aria-hidden /> Request a change
              </Button>
            )}
          </div>

          {pending ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm"
            >
              <Hourglass className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-medium">
                  Request sent {formatRelative(pending.createdAt)}
                </span>
                <span className="text-muted-foreground">&ldquo;{pending.reason}&rdquo;</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyKey === pending.id}
                onClick={() =>
                  run(pending.id, () => cancelIdentityChange({ requestId: pending.id }), {
                    success: "Request withdrawn",
                  })
                }
              >
                <X aria-hidden /> Withdraw
              </Button>
            </motion.div>
          ) : null}

          {requests.filter((r) => r.status !== "pending").length > 0 ? (
            <ul className="grid gap-2 border-t pt-3">
              {requests
                .filter((r) => r.status !== "pending")
                .map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className={cn("capitalize", requestBadge[r.status])}>
                      {r.status}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {r.decisionNote ? `Admin: ${r.decisionNote}` : r.reason}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatRelative(r.decidedAt ?? r.createdAt)}
                    </span>
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to change your identity</DialogTitle>
            <DialogDescription>
              Your admin checks that the request is genuine. If approved, you can enroll your face
              and voice one more time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="change-reason">Why do you need to change it?</Label>
            <Textarea
              id="change-reason"
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. My face samples were taken in bad light and attendance often fails."
            />
            <span className="text-right font-mono text-[10px] text-muted-foreground">
              {reason.length}/1000
            </span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 10 || busyKey === "request"}
              onClick={() =>
                run("request", () => requestIdentityChange({ reason }), {
                  success: "Request sent to your admin",
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ScanFace;
  label: string;
  value: number;
}) {
  return (
    <div className="grid gap-1 rounded-xl border bg-muted/30 p-3">
      <Icon className="mx-auto size-4 text-brand" aria-hidden />
      <span className="font-mono text-lg font-semibold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
