"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleCheck,
  History,
  LoaderCircle,
  LogIn,
  LogOut,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { FaceScanner, type ScannedFace } from "@/components/camera/face-scanner";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { peopleKeys } from "@/lib/data/people";
import { matchFace } from "@/lib/data/recognition";
import {
  checkInVisitor,
  checkOutVisit,
  getVisitorProfile,
  registerVisitor,
  type VisitorProfile,
  visitorKeys,
} from "@/lib/data/visitors";
import { formatDateTime, formatRelative } from "@/lib/format";

type Phase =
  | { kind: "scan" }
  | { kind: "matching"; face: ScannedFace }
  | { kind: "confirm"; face: ScannedFace; profile: VisitorProfile }
  | { kind: "known"; face: ScannedFace; profile: VisitorProfile }
  | { kind: "new"; face: ScannedFace }
  | { kind: "done"; title: string; subtitle: string };

/**
 * PROJECT_SPEC §8 screen 7: scan → recognised (history + one-click check-in/out) or new
 * (quick form). An uncertain match asks "Is this …?" before using it.
 */
export function ScanVisitorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const [phase, setPhase] = useState<Phase>({ kind: "scan" });
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const previewRef = useRef<string | null>(null);
  // Free the last preview URL when the dialog unmounts.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function reset() {
    setPhase({ kind: "scan" });
    setRound((n) => n + 1);
  }

  async function onCaptured(scanned: ScannedFace) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(scanned.thumbnail);
    setPreviewUrl(previewRef.current);
    setPhase({ kind: "matching", face: scanned });
    try {
      const match = await matchFace(scanned.embedding);
      if (match.personId && match.status !== "unknown") {
        const profile = await getVisitorProfile(match.personId);
        if (profile) {
          if (match.status === "match") {
            play("recognized");
            setPhase({ kind: "known", face: scanned, profile });
          } else {
            play("step");
            setPhase({ kind: "confirm", face: scanned, profile });
          }
          return;
        }
      }
      play("unknown");
      setPhase({ kind: "new", face: scanned });
    } catch (err) {
      play("error");
      toast.error("Couldn't match the face", {
        description: err instanceof Error ? err.message : undefined,
      });
      reset();
    }
  }

  async function finish(title: string, subtitle: string) {
    play("success");
    setPhase({ kind: "done", title, subtitle });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: visitorKeys.all }),
      queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
    ]);
    setTimeout(() => onOpenChange(false), 1800);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      play("error");
      toast.error("That didn't work", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundSearch className="size-5 text-brand" aria-hidden /> Scan visitor
          </DialogTitle>
          <DialogDescription>
            Ask the visitor to look at the camera. Returning visitors are recognised automatically.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={phase.kind}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {phase.kind === "scan" && open ? (
              <FaceScanner key={round} onCaptured={onCaptured} maxHeight="45vh" />
            ) : null}

            {phase.kind === "matching" ? (
              <div className="grid justify-items-center gap-3 py-8" aria-live="polite">
                <LoaderCircle className="size-8 animate-spin text-brand" aria-hidden />
                <p className="text-sm text-muted-foreground">Checking your visitor list…</p>
              </div>
            ) : null}

            {phase.kind === "confirm" ? (
              <div className="grid gap-4">
                <ProfileHeader profile={phase.profile} previewUrl={previewUrl} />
                <p className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
                  Not completely sure. Is this <strong>{phase.profile.name}</strong>?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      setPhase({ kind: "known", face: phase.face, profile: phase.profile })
                    }
                  >
                    <CircleCheck aria-hidden /> Yes, that&apos;s them
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPhase({ kind: "new", face: phase.face })}
                  >
                    <UserPlus aria-hidden /> No, new visitor
                  </Button>
                </div>
              </div>
            ) : null}

            {phase.kind === "known" ? (
              <KnownVisitor
                profile={phase.profile}
                previewUrl={previewUrl}
                busy={busy}
                onCheckIn={(details, saveSnapshot) =>
                  run(async () => {
                    await checkInVisitor(
                      phase.profile.personId,
                      details,
                      saveSnapshot ? phase.face.thumbnail : null,
                    );
                    await finish(`Welcome back, ${phase.profile.name}`, "Checked in");
                  })
                }
                onCheckOut={(visitId) =>
                  run(async () => {
                    await checkOutVisit(visitId);
                    await finish(`Goodbye, ${phase.profile.name}`, "Checked out");
                  })
                }
                onRescan={reset}
              />
            ) : null}

            {phase.kind === "new" ? (
              <NewVisitorForm
                previewUrl={previewUrl}
                busy={busy}
                onRescan={reset}
                onSubmit={(name, details, saveSnapshot) =>
                  run(async () => {
                    await registerVisitor({
                      name,
                      details,
                      embedding: phase.face.embedding,
                      quality: phase.face.quality,
                      thumbnail: phase.face.thumbnail,
                      saveSnapshot,
                    });
                    await finish(`${name} registered`, "Checked in · recognised next time");
                  })
                }
              />
            ) : null}

            {phase.kind === "done" ? (
              <div className="grid justify-items-center gap-3 py-8 text-center" aria-live="polite">
                <div className="relative grid size-20 place-items-center">
                  {[0, 1, 2].map((ring) => (
                    <motion.span
                      key={ring}
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-success"
                      initial={{ scale: 0.8, opacity: 0.7 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1.3, delay: ring * 0.2, ease: "easeOut" }}
                    />
                  ))}
                  <motion.span
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="grid size-20 place-items-center rounded-full bg-success/10 text-success-foreground"
                  >
                    <CircleCheck className="size-10" aria-hidden />
                  </motion.span>
                </div>
                <p className="text-lg font-semibold">{phase.title}</p>
                <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function ProfileHeader({
  profile,
  previewUrl,
}: {
  profile: VisitorProfile;
  previewUrl: string | null;
}) {
  const last = profile.visits[0];
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <PersonAvatar
          name={profile.name}
          url={profile.avatarUrl ?? previewUrl}
          className="size-16"
        />
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-popover bg-success text-white">
          <CircleCheck className="size-3.5" aria-hidden />
        </span>
      </div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate text-lg font-semibold">{profile.name}</p>
        <p className="text-xs text-muted-foreground">
          {profile.visits.length === 0
            ? "Known person, first visit"
            : `${profile.visits.length}${profile.visits.length === 10 ? "+" : ""} visit${profile.visits.length === 1 ? "" : "s"} · last ${formatRelative(last!.checkIn).toLowerCase()}`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {profile.label ? (
            <Badge variant="secondary" className="capitalize">
              {profile.label}
            </Badge>
          ) : null}
          {profile.listType === "allowed" ? (
            <Badge variant="outline" className="text-success-foreground">
              <ShieldCheck className="size-3" aria-hidden /> Allowed
            </Badge>
          ) : null}
          {profile.listType === "flagged" ? (
            <Badge variant="outline" className="text-danger-foreground">
              <ShieldAlert className="size-3" aria-hidden /> Flagged
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function KnownVisitor({
  profile,
  previewUrl,
  busy,
  onCheckIn,
  onCheckOut,
  onRescan,
}: {
  profile: VisitorProfile;
  previewUrl: string | null;
  busy: boolean;
  onCheckIn: (
    details: { purpose: string; host: string; phone: string },
    saveSnapshot: boolean,
  ) => void;
  onCheckOut: (visitId: string) => void;
  onRescan: () => void;
}) {
  const last = profile.visits[0];
  const [purpose, setPurpose] = useState(last?.purpose ?? "");
  const [host, setHost] = useState(last?.host ?? "");
  const [phone, setPhone] = useState(last?.phone ?? "");
  const [snapshot, setSnapshot] = useState(false);

  return (
    <div className="grid gap-4">
      <ProfileHeader profile={profile} previewUrl={previewUrl} />
      {profile.listType === "flagged" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/50 bg-danger/5 p-3 text-sm"
        >
          <ShieldAlert
            className="mt-0.5 size-4 shrink-0 animate-pulse text-danger-foreground"
            aria-hidden
          />
          This person is on your flagged list. Check with the person in charge before letting them
          in.
        </p>
      ) : null}

      {profile.openVisitId ? (
        <div className="grid gap-3 rounded-lg border p-3">
          <p className="text-sm">
            Inside since <strong>{formatDateTime(profile.visits[0]!.checkIn)}</strong>
          </p>
          <Button size="lg" disabled={busy} onClick={() => onCheckOut(profile.openVisitId!)}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
            Check out
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              id="kv-purpose"
              label="Purpose"
              value={purpose}
              onChange={setPurpose}
              max={200}
            />
            <Field id="kv-host" label="Meeting" value={host} onChange={setHost} max={120} />
            <Field
              id="kv-phone"
              label="Phone"
              value={phone}
              onChange={setPhone}
              max={32}
              type="tel"
            />
          </div>
          <SnapshotToggle id="kv-snapshot" checked={snapshot} onChange={setSnapshot} />
          <Button
            size="lg"
            disabled={busy}
            onClick={() => onCheckIn({ purpose, host, phone }, snapshot)}
          >
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
            Check in
          </Button>
        </div>
      )}

      {profile.visits.length > 0 ? (
        <details className="group rounded-lg border p-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <History className="size-4" aria-hidden /> Visit history
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {profile.visits.map((v) => (
              <li key={v.id} className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{formatDateTime(v.checkIn)}</span>
                {v.purpose ? <span>· {v.purpose}</span> : null}
                {v.host ? <span>· meets {v.host}</span> : null}
                {v.checkOut ? null : <span className="text-success-foreground">· inside</span>}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Button variant="ghost" size="sm" className="w-fit" onClick={onRescan}>
        <RotateCw aria-hidden /> Not them? Scan again
      </Button>
    </div>
  );
}

function NewVisitorForm({
  previewUrl,
  busy,
  onRescan,
  onSubmit,
}: {
  previewUrl: string | null;
  busy: boolean;
  onRescan: () => void;
  onSubmit: (
    name: string,
    details: { purpose: string; host: string; phone: string },
    saveSnapshot: boolean,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [host, setHost] = useState("");
  const [phone, setPhone] = useState("");
  const [snapshot, setSnapshot] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length >= 2) onSubmit(name.trim(), { purpose, host, phone }, snapshot);
      }}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={name || "New"} url={previewUrl} className="size-16" />
        <div className="grid gap-0.5">
          <p className="font-semibold">New visitor</p>
          <p className="text-xs text-muted-foreground">
            Their face is saved so they&apos;re recognised next time.
          </p>
        </div>
      </div>
      <Field id="nv-name" label="Full name" value={name} onChange={setName} max={80} autoFocus />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="nv-phone" label="Phone" value={phone} onChange={setPhone} max={32} type="tel" />
        <Field id="nv-purpose" label="Purpose" value={purpose} onChange={setPurpose} max={200} />
        <Field id="nv-host" label="Meeting" value={host} onChange={setHost} max={120} />
      </div>
      <SnapshotToggle id="nv-snapshot" checked={snapshot} onChange={setSnapshot} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={busy || name.trim().length < 2}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
          Register &amp; check in
        </Button>
        <Button type="button" variant="ghost" onClick={onRescan}>
          <RotateCw aria-hidden /> Scan again
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  max,
  type = "text",
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={max}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

function SnapshotToggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <div className="grid gap-0.5">
        <Label htmlFor={id}>Save a snapshot with this visit</Label>
        <p className="text-xs text-muted-foreground">
          Optional. A small private photo in the visit record.
        </p>
      </div>
    </div>
  );
}
