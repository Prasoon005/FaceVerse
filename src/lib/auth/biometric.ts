/**
 * Biometric login rules (PROJECT_SPEC §4 "Biometric login flow", §9). Shared by the
 * /api/biometric-login route and the login UI; pure so it can be unit-tested.
 */
import { z } from "zod";

import { recognitionConfig } from "@/config/recognition";

const embedding = (size: number) =>
  z.array(z.number().refine(Number.isFinite, "Embedding values must be finite")).length(size);

export const biometricLoginSchema = z.object({
  email: z.email().max(320),
  faceEmbedding: embedding(recognitionConfig.face.embeddingSize),
  voiceEmbedding: embedding(recognitionConfig.voice.embeddingSize),
  livenessPassed: z.boolean(),
  /** Share of the challenge phrase heard by speech recognition; null when unsupported. */
  phraseScore: z.number().min(0).max(1).nullable(),
});

export type BiometricLoginRequest = z.infer<typeof biometricLoginSchema>;

export type FailureReason = "liveness" | "face" | "voice" | "phrase";

export const failureMessages: Record<FailureReason, string> = {
  liveness: "The liveness check didn't pass.",
  face: "Your face didn't match the enrolled samples.",
  voice: "Your voice didn't match the enrolled samples.",
  phrase: "The spoken words didn't match the challenge phrase.",
};

/** Practical suggestions shown with each failure reason. */
export const failureTips: Record<FailureReason, string[]> = {
  liveness: [
    "Keep your whole face in view and follow each prompt as soon as it appears.",
    "Blink slowly and fully; turn your head about 20°, not just your eyes.",
  ],
  face: [
    "Face a window or lamp so your face is evenly lit, without strong light behind you.",
    "Remove a mask, cap or sunglasses and look straight at the camera.",
    "If this keeps happening, add face samples in today's lighting (People → your page).",
  ],
  voice: [
    "Speak at your normal volume and pace, about an arm's length from the mic.",
    "Move somewhere quieter: fans, TV and other voices change how you sound.",
    "Use the same mic you enrolled with. Headset vs laptop mic sounds different.",
    "Still failing? Re-record your voice samples in this place (People → your page → Add voice).",
  ],
  phrase: [
    "Read all three words and both digits, in order, without long pauses.",
    'Say digits as words ("four", "seven") and pronounce each word clearly.',
    "Start speaking right after you press record, and stop only when you've finished.",
  ],
};

/** Voice and phrase failures can be retried with the same face; others need a fresh start. */
export function canRetryVoiceOnly(reasons: readonly FailureReason[]) {
  return reasons.length > 0 && reasons.every((r) => r === "voice" || r === "phrase");
}

export type BiometricLoginResponse =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "not_available" | "locked" | "failed" | "server";
      message: string;
      reasons?: FailureReason[];
    };

export function evaluateAttempt(input: {
  livenessPassed: boolean;
  faceScore: number;
  voiceScore: number;
  phraseScore: number | null;
}): { success: boolean; reasons: FailureReason[] } {
  const reasons: FailureReason[] = [];
  if (!input.livenessPassed) reasons.push("liveness");
  if (input.faceScore < recognitionConfig.face.match) reasons.push("face");
  if (input.voiceScore < recognitionConfig.voice.match) reasons.push("voice");
  if (input.phraseScore !== null && input.phraseScore < recognitionConfig.voice.phraseMatchRatio) {
    reasons.push("phrase");
  }
  return { success: reasons.length === 0, reasons };
}

/** Start of the lockout window: failures after this count towards the limit. */
export function lockoutWindowStart(now = new Date()) {
  return new Date(now.getTime() - recognitionConfig.biometricLogin.windowMinutes * 60_000);
}

export function isLockedOut(
  recentFailures: number,
  limit: number = recognitionConfig.biometricLogin.maxFailures,
) {
  return recentFailures >= limit;
}
