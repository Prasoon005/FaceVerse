"use client";

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CircleCheck,
  Fingerprint,
  LoaderCircle,
  Lock,
  ScanFace,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type CapturedSample, FaceCaptureStep } from "@/components/enroll/face-capture-step";
import { VoiceCaptureStep } from "@/components/enroll/voice-capture-step";
import { HoldToConfirm } from "@/components/shared/hold-to-confirm";
import { StepperRail } from "@/components/shared/stepper-rail";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import type { VoiceSample } from "@/lib/audio/process-recording";
import type { IdentityResponse } from "@/app/api/identity/route";

type StepId = "intro" | "face" | "voice" | "review" | "saving" | "done";

const STEPS = [
  { id: "intro", label: "Start" },
  { id: "face", label: "Face" },
  { id: "voice", label: "Voice", note: "optional" },
  { id: "review", label: "Confirm" },
  { id: "done", label: "Sent" },
];

const SAVING_STAGES = [
  "Packing face samples",
  "Packing voice samples",
  "Locking your identity",
  "Sending to your admin",
];

async function toDataUrl(blob: Blob): Promise<string> {
  const file = new File([blob], "face.jpg", { type: "image/jpeg" });
  const small = await imageCompression(file, {
    maxWidthOrHeight: 256,
    initialQuality: 0.8,
    fileType: "image/jpeg",
    useWebWorker: false,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(small);
  });
}

/**
 * First-time (or admin-approved re-) enrollment of the user's own face and voice. Ends with a
 * final, hold-to-confirm submit: after that the identity is locked until an admin unlocks it.
 */
export function IdentityWizard({ isChange }: { isChange: boolean }) {
  const router = useRouter();
  const { play } = useSoundFeedback();
  const [step, setStep] = useState<StepId>("intro");
  const [faces, setFaces] = useState<CapturedSample[]>([]);
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [understood, setUnderstood] = useState(false);
  const [stage, setStage] = useState(0);

  // Free preview object URLs when the wizard goes away.
  useEffect(() => () => faces.forEach((f) => URL.revokeObjectURL(f.previewUrl)), [faces]);

  // Walk through the saving stages while the request runs (visual only).
  useEffect(() => {
    if (step !== "saving") return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, SAVING_STAGES.length - 1)), 450);
    return () => clearInterval(id);
  }, [step]);

  async function submit() {
    setStage(0);
    setStep("saving");
    try {
      const thumbnail = faces[0] ? await toDataUrl(faces[0].thumbnail).catch(() => null) : null;
      const res = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceSamples: faces.map((f) => ({
            embedding: Array.from(f.embedding),
            quality: f.quality,
          })),
          voiceSamples: voices.map((v) => Array.from(v.embedding)),
          thumbnail,
        }),
      });
      const body = (await res.json()) as IdentityResponse;
      if (!body.ok) throw new Error(body.message);
      await new Promise((r) => setTimeout(r, 600));
      play("success");
      setStep("done");
      // Let the success animation play before the page swaps to the locked identity card.
      setTimeout(() => router.refresh(), 2600);
    } catch (err) {
      play("error");
      toast.error("Couldn't submit your identity", {
        description: err instanceof Error ? err.message : undefined,
      });
      setStep("review");
    }
  }

  return (
    <div className="grid gap-6">
      <StepperRail steps={STEPS} current={step === "saving" ? "review" : step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {step === "intro" ? <Intro isChange={isChange} onStart={() => setStep("face")} /> : null}

          {step === "face" ? (
            <FaceCaptureStep
              onBack={() => setStep("intro")}
              onComplete={(captured) => {
                setFaces(captured);
                setStep("voice");
              }}
            />
          ) : null}

          {step === "voice" ? (
            <VoiceCaptureStep
              onBack={() => setStep("face")}
              onSkip={() => {
                setVoices([]);
                setStep("review");
              }}
              onComplete={(captured) => {
                setVoices(captured);
                setStep("review");
              }}
            />
          ) : null}

          {step === "review" ? (
            <div className="grid max-w-2xl gap-5">
              <div className="grid gap-4 rounded-xl border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <ScanFace className="size-4 text-brand" aria-hidden /> Face samples
                  <span className="font-mono text-muted-foreground">({faces.length})</span>
                </h3>
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {faces.map((s, i) => (
                    <motion.li
                      key={s.previewUrl}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                      <img
                        src={s.previewUrl}
                        alt={`Face sample ${i + 1}`}
                        className="aspect-square rounded-lg border object-cover"
                      />
                    </motion.li>
                  ))}
                </ul>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <AudioLines className="size-4 text-brand" aria-hidden /> Voice samples
                  <span className="font-mono text-muted-foreground">({voices.length})</span>
                </h3>
                {voices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Skipped (optional). Attendance and biometric login will use your face only.
                  </p>
                ) : (
                  <ul className="grid gap-1.5">
                    {voices.map((v, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CircleCheck className="size-4 text-success-foreground" aria-hidden />
                        <span className="truncate">&ldquo;{v.phrase.text}&rdquo;</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {v.speechSeconds.toFixed(1)}s
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                role="alert"
                className="grid gap-3 rounded-xl border border-warning/50 bg-warning/5 p-5"
              >
                <p className="flex items-start gap-2 font-semibold">
                  <TriangleAlert
                    className="mt-0.5 size-5 shrink-0 animate-pulse text-warning-foreground"
                    aria-hidden
                  />
                  These are final changes
                </p>
                <ul className="grid list-disc gap-1 pl-6 text-sm text-muted-foreground">
                  <li>
                    After you submit, your face and voice are locked. You can&apos;t change them.
                  </li>
                  <li>
                    To change them later, you send a request; an admin checks it&apos;s genuine and
                    allows one more enrollment.
                  </li>
                  <li>
                    An admin also approves this enrollment before attendance and biometric login
                    work.
                  </li>
                </ul>
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="understood"
                    checked={understood}
                    onCheckedChange={(v) => setUnderstood(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="understood" className="leading-snug">
                    I understand that this is final and these samples are really me.
                  </Label>
                </div>
              </motion.div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => setStep("voice")}>
                  <ArrowLeft aria-hidden /> Back
                </Button>
                <HoldToConfirm onConfirm={submit} disabled={!understood}>
                  Hold to submit &amp; lock
                </HoldToConfirm>
              </div>
            </div>
          ) : null}

          {step === "saving" ? <Saving stage={stage} /> : null}
          {step === "done" ? <Done /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Intro({ isChange, onStart }: { isChange: boolean; onStart: () => void }) {
  const items = [
    { icon: ScanFace, title: "Face", text: "3–5 photos from slightly different angles." },
    { icon: AudioLines, title: "Voice (optional)", text: "Read 3 short phrases, or skip it." },
    { icon: Lock, title: "Final lock", text: "Submitted once; changes need admin approval." },
    { icon: ShieldCheck, title: "Admin approval", text: "Your admin verifies it's really you." },
  ];
  return (
    <div className="grid max-w-2xl gap-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 size-48 animate-aurora rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative grid gap-2">
          <span className="grid size-12 animate-float place-items-center rounded-xl bg-brand/15 text-brand">
            <Fingerprint className="size-6" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold">
            {isChange ? "Re-enroll your identity" : "Set up your biometric identity"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChange
              ? "Your admin approved a change. You can enroll your face (and optionally your voice) one more time; the old samples are replaced."
              : "Your face lets you mark attendance and sign in without a password; voice is an optional extra check. Only numbers (embeddings) and one small thumbnail are stored."}
          </p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.li
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className="hover-lift flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <item.icon className="size-4" aria-hidden />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.text}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <div>
        <Button size="lg" onClick={onStart}>
          Start with my face <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Saving({ stage }: { stage: number }) {
  return (
    <div className="grid max-w-md gap-3 rounded-xl border bg-card p-6" aria-live="polite">
      {SAVING_STAGES.map((label, i) => (
        <motion.p
          key={label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: i <= stage ? 1 : 0.4, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 text-sm"
        >
          {i < stage ? (
            <CircleCheck className="size-4 text-success-foreground" aria-hidden />
          ) : (
            <LoaderCircle
              className={
                i === stage ? "size-4 animate-spin text-brand" : "size-4 text-muted-foreground"
              }
              aria-hidden
            />
          )}
          {label}
        </motion.p>
      ))}
    </div>
  );
}

const BURST = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  return { x: Math.cos(angle) * 90, y: Math.sin(angle) * 90, hue: i % 3 };
});
const burstColors = ["bg-brand", "bg-success", "bg-warning"];

function Done() {
  return (
    <div className="grid justify-items-center gap-4 py-10 text-center" aria-live="polite">
      <div className="relative grid size-20 place-items-center">
        {BURST.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={`absolute size-2 rounded-full ${burstColors[p.hue]}`}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
          />
        ))}
        <motion.span
          initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="grid size-20 place-items-center rounded-full bg-success/10 text-success-foreground"
        >
          <Lock className="size-9" aria-hidden />
        </motion.span>
      </div>
      <h2 className="text-xl font-semibold">Identity submitted and locked</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your admin has been notified. You&apos;ll get a notification when it&apos;s approved; this
        page updates by itself.
      </p>
    </div>
  );
}
