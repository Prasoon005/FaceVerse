/**
 * Recognition thresholds and tuning knobs (PROJECT_SPEC §4, §7).
 * Calibrate these with real data; everything that decides "match / unknown" lives here.
 */
export const recognitionConfig = {
  face: {
    /**
     * Cosine similarity at or above this is a confident match. Calibrated with the
     * "Scores" panel on /live: live scores for the right person were ~0.69–0.77, the
     * next-best person ~0.49–0.52. Same-person and different-people scores overlap, so
     * the margin rule below does most of the work.
     */
    match: 0.65,
    /** Between `uncertain` and `match` we show an amber "uncertain" result. */
    uncertain: 0.55,
    /** A match must beat the next-best person by at least this much, else it's uncertain. */
    margin: 0.1,
    embeddingSize: 1024,
  },
  voice: {
    /**
     * Cosine similarity at or above this is the same speaker. The spec's starting point
     * was 0.70 and the wavlm-base-plus-sv model card suggests 0.86 (clean studio audio).
     * Real logins with a laptop mic scored 0.73–0.93 for the right person, so 0.86
     * rejected most of them. Calibrate with the scores on Settings → Security.
     */
    match: 0.8,
    embeddingSize: 512,
    model: "Xenova/wavlm-base-plus-sv",
    sampleRate: 16_000,
    /** Minimum speech after silence trimming (PROJECT_SPEC §7.3). */
    minSpeechSeconds: 2,
    /** Recording stops automatically after this long. */
    maxRecordSeconds: 8,
    /** Share of the challenge phrase's tokens the transcript must contain. */
    phraseMatchRatio: 0.7,
  },
  biometricLogin: {
    /** Lockout after this many failed attempts within the window (PROJECT_SPEC §9). */
    maxFailures: 5,
    windowMinutes: 15,
    /** Looser per-IP limit, so one device can't try many accounts. */
    ipMaxFailures: 10,
    /** Voice-only retries after a passed liveness + face check, before starting over. */
    voiceAttempts: 3,
    /** A captured face is reused for voice retries only this long. */
    faceReuseSeconds: 180,
  },
  samples: {
    faceMin: 3,
    faceMax: 5,
    voice: 3,
  },
  quality: {
    /** Minimum face box width in source pixels. */
    minFaceSize: 112,
    /** Reject poses turned further than this (degrees). */
    maxYawDeg: 25,
    /** Minimum detector confidence (0..1). */
    minScore: 0.8,
    /** Laplacian variance of the 112px grayscale face crop; lower = blurrier. */
    minSharpness: 40,
  },
  enrollment: {
    /** |yaw| below this counts as "looking straight". */
    straightMaxYawDeg: 8,
    /** |yaw| range for the "slightly turned" poses. */
    sideMinYawDeg: 10,
    sideMaxYawDeg: 25,
    /** Consecutive good frames required before auto-capture. */
    stableFrames: 3,
  },
  live: {
    targetFps: 7,
    matchDebounceMs: 500,
    /** Re-match every track this often (fixes early mistakes and retries unknowns). */
    rematchIntervalMs: 2000,
    /** Each track is matched on the average of its last N usable embeddings. */
    embeddingWindow: 5,
    /** Frames turned further than this, or faces smaller than this, aren't used for matching. */
    maxMatchYawDeg: 30,
    minMatchFaceSize: 64,
    /** Max one recognition_events row per person per session in this window. */
    logThrottleMs: 30_000,
    trackIouThreshold: 0.3,
    /** Frames a track may go undetected before it is dropped. */
    trackMaxMissed: 5,
  },
  liveness: {
    challengeCount: 2,
    challengeTimeoutMs: 8000,
    /** Eye aspect ratio below this = eyes closed; above `earOpen` = open again. */
    earClosed: 0.2,
    earOpen: 0.25,
    turnYawDeg: 15,
    smileScore: 0.6,
    /** Max time the face may be missing between frames before the challenge fails. */
    maxFaceGapMs: 600,
    /**
     * Sign of Human's yaw when the person turns to THEIR left.
     * If "turn left" and "turn right" feel swapped on your device, flip this to -1.
     */
    yawLeftSign: 1 as 1 | -1,
  },
} as const;

export type MatchStatus = "match" | "uncertain" | "unknown";

export function classifyFaceSimilarity(similarity: number | null | undefined): MatchStatus {
  if (similarity == null) return "unknown";
  if (similarity >= recognitionConfig.face.match) return "match";
  if (similarity >= recognitionConfig.face.uncertain) return "uncertain";
  return "unknown";
}

/**
 * Classifies the best match, downgrading it to "uncertain" when the next-best person
 * is almost as close (two people the model can't tell apart).
 */
export function classifyFaceMatch(
  best: number | null | undefined,
  runnerUp?: number | null,
): MatchStatus {
  const status = classifyFaceSimilarity(best);
  if (status === "match" && runnerUp != null && best! - runnerUp < recognitionConfig.face.margin) {
    return "uncertain";
  }
  return status;
}
