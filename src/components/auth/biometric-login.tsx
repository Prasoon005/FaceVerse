"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CircleX, Mic, RotateCw, ShieldCheck, SkipForward } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LivenessChallenge } from "@/components/camera/liveness-challenge";
import { SoundToggle } from "@/components/layout/sound-toggle";
import { StepperRail } from "@/components/shared/stepper-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceCapture } from "@/components/voice/voice-capture";
import { VoiceScan } from "@/components/voice/voice-scan";
import { recognitionConfig } from "@/config/recognition";
import { useIsClient } from "@/hooks/use-is-client";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import {
  type BiometricLoginResponse,
  canRetryVoiceOnly,
  type FailureReason,
} from "@/lib/auth/biometric";
import { generatePhrase } from "@/lib/audio/phrase";
import type { VoiceSample } from "@/lib/audio/process-recording";
import { isTranscriptionSupported } from "@/lib/audio/transcribe";

import { type Factors, type FactorState, VerificationStatus } from "./verification-status";
import { VerificationTips } from "./verification-tips";

type StepId = "email" | "liveness" | "face" | "voice" | "success";

const STEPS = [
  { id: "email", label: "Email" },
  { id: "liveness", label: "Liveness" },
  { id: "face", label: "Face" },
  { id: "voice", label: "Voice", note: "optional" },
  { id: "success", label: "Success" },
];

const { voiceAttempts: MAX_VOICE_ATTEMPTS, faceReuseSeconds } = recognitionConfig.biometricLogin;

type Failure = {
  message: string;
  reasons: FailureReason[];
  /** What the user can do next. */
  next: "retry-voice" | "restart" | "change-email" | "none";
};

/**
 * Multi-factor biometric login (PROJECT_SPEC §8 screen 5): email → liveness → face →
 * voice. Everything is computed on-device; the server re-verifies the embeddings and
 * issues the session. A voice-only failure can be retried (up to 3 tries) with the
 * same face capture; anything else starts again from liveness.
 */
export function BiometricLogin({ next }: { next: string }) {
  const router = useRouter();
  const isClient = useIsClient();
  const sound = useSoundFeedback();
  const [step, setStep] = useState<StepId>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [face, setFace] = useState<{ embedding: Float32Array; capturedAt: number } | null>(null);
  const [phrase, setPhrase] = useState(generatePhrase);
  const [livenessRun, setLivenessRun] = useState(0);
  const [voiceFailures, setVoiceFailures] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  function restart() {
    setFace(null);
    setFailure(null);
    setVoiceFailures(0);
    setPhrase(generatePhrase());
    setLivenessRun((n) => n + 1);
    setStep("liveness");
  }

  function retryVoice() {
    // An old face capture isn't reused indefinitely.
    if (!face || Date.now() - face.capturedAt > faceReuseSeconds * 1000) {
      restart();
      return;
    }
    setFailure(null);
    setPhrase(generatePhrase());
  }

  /** `voice` is null when the user skips voice (face + liveness only). */
  async function submit(voice: VoiceSample | null) {
    if (!face) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const res = await fetch("/api/biometric-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          faceEmbedding: Array.from(face.embedding),
          voiceEmbedding: voice ? Array.from(voice.embedding) : null,
          livenessPassed: true,
          phraseScore: voice?.phraseScore ?? null,
        }),
      });
      const body = (await res.json()) as BiometricLoginResponse;
      if (body.ok) {
        sound.play("success");
        setStep("success");
        router.replace(next);
        router.refresh();
        return;
      }
      sound.play("error");
      const reasons = body.reasons ?? [];
      if (body.error === "failed" && canRetryVoiceOnly(reasons)) {
        const used = voiceFailures + 1;
        setVoiceFailures(used);
        const left = MAX_VOICE_ATTEMPTS - used;
        setFailure({
          message:
            left > 0
              ? `${body.message} ${left} voice ${left === 1 ? "try" : "tries"} left.`
              : `${body.message} That was the last voice try, so let's start again from the liveness check.`,
          reasons,
          next: left > 0 ? "retry-voice" : "restart",
        });
      } else if (body.error === "locked") {
        setFailure({ message: body.message, reasons: [], next: "none" });
      } else if (body.error === "not_available") {
        setFailure({ message: body.message, reasons: [], next: "change-email" });
      } else {
        setFailure({ message: body.message, reasons, next: "restart" });
      }
    } catch {
      sound.play("error");
      setFailure({
        message: "Network error. Check your connection and try again.",
        reasons: [],
        next: "retry-voice",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const failedFactor = (reasons: FailureReason[], ...keys: FailureReason[]) =>
    failure !== null && reasons.some((r) => keys.includes(r));
  const reasons = failure?.reasons ?? [];
  const after = (s: StepId) =>
    STEPS.findIndex((x) => x.id === step) > STEPS.findIndex((x) => x.id === s);
  const factorState = (s: "liveness" | "face" | "voice", ...keys: FailureReason[]): FactorState =>
    failedFactor(reasons, ...keys)
      ? "failed"
      : after(s)
        ? "passed"
        : step === s
          ? "active"
          : "pending";
  const factors: Factors = {
    liveness: factorState("liveness", "liveness"),
    face: factorState("face", "face"),
    voice: factorState("voice", "voice", "phrase"),
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <StepperRail steps={STEPS} current={step} />
        </div>
        <SoundToggle />
      </div>

      {step !== "email" ? (
        <VerificationStatus
          factors={factors}
          voiceNote={
            step === "voice"
              ? `Try ${Math.min(voiceFailures + 1, MAX_VOICE_ATTEMPTS)} of ${MAX_VOICE_ATTEMPTS}`
              : undefined
          }
        />
      ) : null}

      {step === "email" ? (
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const value = email.trim();
            if (!/^\S+@\S+\.\S+$/.test(value)) {
              setEmailError("Enter a valid email address.");
              return;
            }
            setEmail(value);
            setEmailError(null);
            sound.play("step");
            restart();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="bio-email">Email</Label>
            <Input
              id="bio-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "bio-email-error" : "bio-email-hint"}
            />
            {emailError ? (
              <p id="bio-email-error" className="text-sm text-danger-foreground">
                {emailError}
              </p>
            ) : (
              <p id="bio-email-hint" className="text-xs text-muted-foreground">
                Identifies your account. You&apos;ll then do a liveness check, a face scan and read
                a short phrase. Needs biometric login turned on in Settings → Security.
              </p>
            )}
          </div>
          <Button type="submit" size="lg">
            Continue <ArrowRight aria-hidden />
          </Button>
        </form>
      ) : null}

      {step === "liveness" || step === "face" ? (
        <LivenessChallenge
          key={livenessRun}
          captureFace
          onComplete={(result) => {
            if (result.passed) setStep("face");
          }}
          onFaceCaptured={(embedding) => {
            setFace({ embedding, capturedAt: Date.now() });
            setStep("voice");
          }}
        />
      ) : null}

      {step === "voice" ? (
        <div className="grid gap-4">
          {!isClient ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : failure ? (
            <div role="alert" className="grid gap-3 rounded-xl border border-danger/40 p-4">
              <p className="flex items-start gap-2 text-sm font-medium">
                <CircleX className="mt-0.5 size-4 shrink-0 text-danger-foreground" aria-hidden />
                {failure.message}
              </p>
              <VerificationTips reasons={failure.reasons} />
              <div className="flex flex-wrap gap-2">
                {failure.next === "retry-voice" ? (
                  <Button size="sm" onClick={retryVoice}>
                    <Mic aria-hidden /> Try voice again
                  </Button>
                ) : null}
                {failure.next === "restart" ? (
                  <Button size="sm" onClick={restart}>
                    <RotateCw aria-hidden /> Start again
                  </Button>
                ) : null}
                {failure.next === "change-email" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setFailure(null);
                      setStep("email");
                    }}
                  >
                    Change email
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/login">Use password</Link>
                </Button>
              </div>
            </div>
          ) : submitting ? (
            <VoiceScan label="Verifying your identity…" />
          ) : (
            <>
              <VoiceCapture
                key={phrase.text}
                phrase={phrase}
                recordLabel="Record phrase"
                onSample={(sample) => void submit(sample)}
              />
              {!isTranscriptionSupported() ? (
                <p className="text-xs text-muted-foreground">
                  This browser can&apos;t transcribe speech, so only your voice is checked, not the
                  words.
                </p>
              ) : null}
              <Button variant="outline" className="w-full" onClick={() => void submit(null)}>
                <SkipForward aria-hidden /> Skip voice, sign in with face only
              </Button>
            </>
          )}
        </div>
      ) : null}

      {step === "success" ? <VerifiedBadge /> : null}

      {step !== "success" ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in with password instead
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Success state: a shield that pops in with expanding rings. */
function VerifiedBadge() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="grid justify-items-center gap-3 py-6 text-center" aria-live="polite">
      <div className="relative grid size-20 place-items-center">
        {!reduceMotion
          ? [0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-success"
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.4, delay: ring * 0.25, ease: "easeOut" }}
              />
            ))
          : null}
        <motion.span
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="grid size-20 place-items-center rounded-full bg-success/10 text-success-foreground"
        >
          <ShieldCheck className="size-10" aria-hidden />
        </motion.span>
      </div>
      <p className="text-lg font-semibold">Identity verified</p>
      <p className="text-sm text-muted-foreground">
        Liveness, face and voice matched. Signing you in…
      </p>
    </div>
  );
}
