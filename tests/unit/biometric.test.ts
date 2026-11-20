import { describe, expect, it } from "vitest";

import { recognitionConfig } from "@/config/recognition";
import {
  biometricLoginSchema,
  canRetryVoiceOnly,
  evaluateAttempt,
  failureTips,
  isLockedOut,
  lockoutWindowStart,
} from "@/lib/auth/biometric";

const { face, voice } = recognitionConfig;
const good = {
  livenessPassed: true,
  faceScore: face.match + 0.05,
  voiceScore: voice.match + 0.05,
  phraseScore: 1,
};

describe("evaluateAttempt", () => {
  it("passes when every factor passes", () => {
    expect(evaluateAttempt(good)).toEqual({ success: true, reasons: [] });
  });

  it("passes without a phrase score (transcription unsupported)", () => {
    expect(evaluateAttempt({ ...good, phraseScore: null }).success).toBe(true);
  });

  it("lists every failing factor", () => {
    expect(
      evaluateAttempt({ livenessPassed: false, faceScore: 0.1, voiceScore: 0.1, phraseScore: 0.2 }),
    ).toEqual({ success: false, reasons: ["liveness", "face", "voice", "phrase"] });
  });

  it("rejects a different voice even when the face matches", () => {
    expect(evaluateAttempt({ ...good, voiceScore: voice.match - 0.01 }).reasons).toEqual(["voice"]);
  });
});

describe("canRetryVoiceOnly", () => {
  it("allows a voice-only retry for voice and phrase failures", () => {
    expect(canRetryVoiceOnly(["voice"])).toBe(true);
    expect(canRetryVoiceOnly(["phrase"])).toBe(true);
    expect(canRetryVoiceOnly(["voice", "phrase"])).toBe(true);
  });

  it("requires starting over when face or liveness failed", () => {
    expect(canRetryVoiceOnly(["face"])).toBe(false);
    expect(canRetryVoiceOnly(["voice", "face"])).toBe(false);
    expect(canRetryVoiceOnly(["liveness"])).toBe(false);
    expect(canRetryVoiceOnly([])).toBe(false);
  });

  it("has tips for every failure reason", () => {
    for (const tips of Object.values(failureTips)) expect(tips.length).toBeGreaterThan(0);
  });
});

describe("lockout", () => {
  it("locks at the failure limit", () => {
    const limit = recognitionConfig.biometricLogin.maxFailures;
    expect(isLockedOut(limit - 1)).toBe(false);
    expect(isLockedOut(limit)).toBe(true);
    expect(isLockedOut(9, 10)).toBe(false);
  });

  it("window starts N minutes ago", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const minutes = recognitionConfig.biometricLogin.windowMinutes;
    expect(now.getTime() - lockoutWindowStart(now).getTime()).toBe(minutes * 60_000);
  });
});

describe("biometricLoginSchema", () => {
  const valid = {
    email: "me@example.com",
    faceEmbedding: Array<number>(face.embeddingSize).fill(0.01),
    voiceEmbedding: Array<number>(voice.embeddingSize).fill(0.01),
    livenessPassed: true,
    phraseScore: null,
  };

  it("accepts a well-formed request", () => {
    expect(biometricLoginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects wrong embedding sizes, non-finite values and bad emails", () => {
    expect(biometricLoginSchema.safeParse({ ...valid, faceEmbedding: [0.1] }).success).toBe(false);
    expect(
      biometricLoginSchema.safeParse({
        ...valid,
        voiceEmbedding: [...valid.voiceEmbedding.slice(1), Number.NaN],
      }).success,
    ).toBe(false);
    expect(biometricLoginSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});
