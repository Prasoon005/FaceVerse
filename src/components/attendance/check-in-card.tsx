"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck,
  CircleCheck,
  CircleX,
  Clock,
  Fingerprint,
  Hourglass,
  LogIn,
  LogOut,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { VerificationTips } from "@/components/auth/verification-tips";
import { LivenessChallenge } from "@/components/camera/liveness-challenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { formatDay, formatTimeIn } from "@/lib/format";
import type { AttendanceResponse } from "@/app/api/attendance/route";

type Enrollment = "none" | "pending" | "approved" | "rejected";

type Phase =
  | { kind: "scan" }
  | { kind: "saving" }
  | { kind: "done"; action: "check_in" | "check_out"; at: string }
  | { kind: "error"; message: string; faceTips: boolean };

/** Today's attendance: status plus the "Mark attendance" / "Check out" face check. */
export function CheckInCard({
  today,
  timezone,
  record,
  enrollment,
  reviewNote,
}: {
  today: string;
  timezone: string;
  record: { checkInAt: string; checkOutAt: string | null } | null;
  enrollment: Enrollment;
  reviewNote: string | null;
}) {
  const router = useRouter();
  const { play } = useSoundFeedback();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "scan" });
  const [run, setRun] = useState(0);

  const finished = Boolean(record?.checkOutAt);
  const actionLabel = record ? "Check out" : "Mark attendance";

  async function submit(embedding: Float32Array) {
    setPhase({ kind: "saving" });
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceEmbedding: Array.from(embedding), livenessPassed: true }),
      });
      const body = (await res.json()) as AttendanceResponse;
      if (body.ok) {
        play("success");
        setPhase({ kind: "done", action: body.action, at: body.at });
        router.refresh();
      } else {
        play("error");
        setPhase({ kind: "error", message: body.message, faceTips: body.error === "face" });
      }
    } catch {
      play("error");
      setPhase({ kind: "error", message: "Network error. Please try again.", faceTips: false });
    }
  }

  function start() {
    setPhase({ kind: "scan" });
    setRun((n) => n + 1);
    setOpen(true);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-brand" aria-hidden /> Today ·{" "}
          {formatDay(today, { weekday: "long" })}
        </CardTitle>
        <CardDescription>Times are in {timezone.replace("_", " ")}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TimeTile
            icon={LogIn}
            label="Check-in"
            value={formatTimeIn(record?.checkInAt, timezone)}
          />
          <TimeTile
            icon={LogOut}
            label="Check-out"
            value={formatTimeIn(record?.checkOutAt, timezone)}
          />
        </div>

        {enrollment === "approved" ? (
          finished ? (
            <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 p-3 text-sm font-medium">
              <CircleCheck className="size-4 text-success-foreground" aria-hidden /> All done for
              today. See you tomorrow!
            </p>
          ) : (
            <Button size="lg" onClick={start} className="w-full sm:w-fit">
              {record ? <LogOut aria-hidden /> : <LogIn aria-hidden />} {actionLabel}
            </Button>
          )
        ) : (
          <EnrollmentNotice enrollment={enrollment} reviewNote={reviewNote} />
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription>
              Two quick prompts, then hold still for a face scan.
            </DialogDescription>
          </DialogHeader>
          {phase.kind === "scan" && open ? (
            <LivenessChallenge key={run} captureFace autoStart onFaceCaptured={submit} />
          ) : phase.kind === "saving" ? (
            <p className="flex items-center gap-2 rounded-xl border p-4 text-sm" aria-live="polite">
              <Clock className="size-4 animate-pulse text-brand" aria-hidden /> Recording your
              attendance…
            </p>
          ) : phase.kind === "done" ? (
            <SuccessBurst
              title={phase.action === "check_in" ? "Checked in" : "Checked out"}
              time={formatTimeIn(phase.at, timezone)}
              onClose={() => setOpen(false)}
            />
          ) : phase.kind === "error" ? (
            <div role="alert" className="grid gap-3 rounded-xl border border-danger/40 p-4">
              <p className="flex items-start gap-2 text-sm font-medium">
                <CircleX className="mt-0.5 size-4 shrink-0 text-danger-foreground" aria-hidden />
                {phase.message}
              </p>
              {phase.faceTips ? <VerificationTips reasons={["face"]} /> : null}
              <Button size="sm" className="w-fit" onClick={start}>
                <RotateCw aria-hidden /> Try again
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TimeTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LogIn;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-auto font-mono text-lg font-semibold tabular-nums"
      >
        {value}
      </motion.span>
    </div>
  );
}

function EnrollmentNotice({
  enrollment,
  reviewNote,
}: {
  enrollment: Exclude<Enrollment, "approved">;
  reviewNote: string | null;
}) {
  if (enrollment === "pending") {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
        <Hourglass className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden />
        Your face enrollment is waiting for admin approval. You can mark attendance once it&apos;s
        approved; this page updates by itself.
      </p>
    );
  }
  return (
    <div className="grid gap-3 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm">
      <p className="flex items-start gap-2">
        <CircleX className="mt-0.5 size-4 shrink-0 text-danger-foreground" aria-hidden />
        {enrollment === "rejected"
          ? `Your face enrollment was rejected${reviewNote ? `: “${reviewNote}”` : "."} Enroll again and an admin will review it.`
          : "To mark attendance, first set up your face and voice in My identity. An admin then approves it."}
      </p>
      <Button size="sm" variant="outline" className="w-fit" asChild>
        <Link href="/identity">
          <Fingerprint aria-hidden />{" "}
          {enrollment === "rejected" ? "Enroll again" : "Open My identity"}
        </Link>
      </Button>
    </div>
  );
}

function SuccessBurst({
  title,
  time,
  onClose,
}: {
  title: string;
  time: string;
  onClose: () => void;
}) {
  return (
    <div className="grid justify-items-center gap-3 py-6 text-center" aria-live="polite">
      <div className="relative grid size-20 place-items-center">
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-success"
            initial={{ scale: 0.8, opacity: 0.7 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1.4, delay: ring * 0.25, ease: "easeOut" }}
          />
        ))}
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="grid size-20 place-items-center rounded-full bg-success/10 text-success-foreground"
        >
          <CircleCheck className="size-10" aria-hidden />
        </motion.span>
      </div>
      <p className="text-lg font-semibold">
        {title} at <span className="font-mono">{time}</span>
      </p>
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
