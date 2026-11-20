/**
 * Liveness detection (PROJECT_SPEC §7.2).
 *
 * Pure, framework-free logic: feed it one observation per frame and it advances a
 * random challenge sequence (blink / turn left / turn right / smile).
 */
import { recognitionConfig } from "@/config/recognition";

export type Point2D = readonly [number, number, number?];

/**
 * MediaPipe face-mesh indices for the six eye points used by EAR, ordered
 * p1 (outer corner), p2, p3 (upper lid), p4 (inner corner), p5, p6 (lower lid).
 */
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const;
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const;

function dist(a: Point2D, b: Point2D) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Eye aspect ratio (Soukupová & Čech): (|p2-p6| + |p3-p5|) / (2·|p1-p4|). ~0.3 open, <0.2 closed. */
export function eyeAspectRatio(eye: readonly Point2D[]): number {
  if (eye.length !== 6) throw new Error("eyeAspectRatio expects 6 points");
  const [p1, p2, p3, p4, p5, p6] = eye as [Point2D, Point2D, Point2D, Point2D, Point2D, Point2D];
  const horizontal = dist(p1, p4);
  if (horizontal === 0) return 0;
  return (dist(p2, p6) + dist(p3, p5)) / (2 * horizontal);
}

/** Mean EAR of both eyes from a 468/478-point face mesh, or null if the mesh is incomplete. */
export function meshEyeAspectRatio(mesh: readonly Point2D[]): number | null {
  if (mesh.length < 468) return null;
  const pick = (indices: readonly number[]) => indices.map((i) => mesh[i]!);
  return (eyeAspectRatio(pick(LEFT_EYE_INDICES)) + eyeAspectRatio(pick(RIGHT_EYE_INDICES))) / 2;
}

// ---------------------------------------------------------------------------
// Challenge engine
// ---------------------------------------------------------------------------

export type ChallengeType = "blink" | "turn_left" | "turn_right" | "smile";

export const CHALLENGE_TYPES: readonly ChallengeType[] = [
  "blink",
  "turn_left",
  "turn_right",
  "smile",
];

export const challengeLabels: Record<ChallengeType, string> = {
  blink: "Blink your eyes",
  turn_left: "Turn your head to your left",
  turn_right: "Turn your head to your right",
  smile: "Give us a smile",
};

export type StepStatus = "pending" | "active" | "passed" | "failed";

export type LivenessStep = {
  type: ChallengeType;
  status: StepStatus;
  startedAt: number | null;
  endedAt: number | null;
};

export type LivenessFailure = "timeout" | "face_lost" | "face_changed" | "multiple_faces";

export type LivenessState = {
  steps: LivenessStep[];
  current: number;
  startedAt: number;
  finishedAt: number | null;
  passed: boolean | null;
  failure: LivenessFailure | null;
  /** Track id of the face that started the sequence. */
  trackId: number | null;
  lastFaceAt: number;
  /** Blink sub-state: eyes have been seen closed during the current blink step. */
  eyesClosed: boolean;
};

export type LivenessObservation = {
  faceCount: number;
  trackId: number | null;
  ear: number | null;
  yawDeg: number;
  happy: number;
};

export type LivenessResult = {
  passed: boolean;
  steps: LivenessStep[];
  durationMs: number;
  failure: LivenessFailure | null;
};

/** Picks `count` distinct random challenges. `random` is injectable for tests. */
export function pickChallenges(
  count: number = recognitionConfig.liveness.challengeCount,
  random: () => number = Math.random,
): ChallengeType[] {
  const pool = [...CHALLENGE_TYPES];
  const picked: ChallengeType[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool.splice(index, 1)[0]!);
  }
  return picked;
}

export function createLivenessState(challenges: ChallengeType[], now: number): LivenessState {
  return {
    steps: challenges.map((type, i) => ({
      type,
      status: i === 0 ? "active" : "pending",
      startedAt: i === 0 ? now : null,
      endedAt: null,
    })),
    current: 0,
    startedAt: now,
    finishedAt: null,
    passed: null,
    failure: null,
    trackId: null,
    lastFaceAt: now,
    eyesClosed: false,
  };
}

function fail(state: LivenessState, failure: LivenessFailure, now: number): LivenessState {
  const steps = state.steps.map((s, i) =>
    i === state.current ? { ...s, status: "failed" as const, endedAt: now } : s,
  );
  return { ...state, steps, finishedAt: now, passed: false, failure };
}

function isStepSatisfied(
  type: ChallengeType,
  obs: LivenessObservation,
  eyesClosed: boolean,
): { done: boolean; eyesClosed: boolean } {
  const cfg = recognitionConfig.liveness;
  switch (type) {
    case "blink": {
      if (obs.ear == null) return { done: false, eyesClosed };
      if (obs.ear < cfg.earClosed) return { done: false, eyesClosed: true };
      // A blink is a closed phase followed by eyes open again.
      if (eyesClosed && obs.ear > cfg.earOpen) return { done: true, eyesClosed: false };
      return { done: false, eyesClosed };
    }
    case "turn_left":
      return { done: obs.yawDeg * cfg.yawLeftSign >= cfg.turnYawDeg, eyesClosed };
    case "turn_right":
      return { done: obs.yawDeg * cfg.yawLeftSign <= -cfg.turnYawDeg, eyesClosed };
    case "smile":
      return { done: obs.happy >= cfg.smileScore, eyesClosed };
  }
}

/** Advances the challenge sequence by one frame. Returns the same object when finished. */
export function updateLiveness(
  state: LivenessState,
  obs: LivenessObservation | null,
  now: number,
): LivenessState {
  if (state.finishedAt !== null) return state;
  const cfg = recognitionConfig.liveness;
  const step = state.steps[state.current]!;

  if (step.startedAt !== null && now - step.startedAt > cfg.challengeTimeoutMs) {
    return fail(state, "timeout", now);
  }

  if (!obs || obs.faceCount === 0) {
    return now - state.lastFaceAt > cfg.maxFaceGapMs ? fail(state, "face_lost", now) : state;
  }
  if (obs.faceCount > 1) return fail(state, "multiple_faces", now);

  // The same tracked face must stay in view for the whole sequence (no face swap).
  if (state.trackId !== null && obs.trackId !== null && obs.trackId !== state.trackId) {
    return fail(state, "face_changed", now);
  }

  const next: LivenessState = {
    ...state,
    trackId: state.trackId ?? obs.trackId,
    lastFaceAt: now,
  };

  const { done, eyesClosed } = isStepSatisfied(step.type, obs, state.eyesClosed);
  if (!done) return { ...next, eyesClosed };

  const steps = next.steps.map((s, i) => {
    if (i === state.current) return { ...s, status: "passed" as const, endedAt: now };
    if (i === state.current + 1) return { ...s, status: "active" as const, startedAt: now };
    return s;
  });
  const isLast = state.current === state.steps.length - 1;

  return {
    ...next,
    steps,
    eyesClosed: false,
    current: isLast ? state.current : state.current + 1,
    finishedAt: isLast ? now : null,
    passed: isLast ? true : null,
  };
}

export function toLivenessResult(state: LivenessState): LivenessResult {
  return {
    passed: state.passed === true,
    steps: state.steps,
    durationMs: (state.finishedAt ?? state.startedAt) - state.startedAt,
    failure: state.failure,
  };
}

export const failureLabels: Record<LivenessFailure, string> = {
  timeout: "Time ran out for this step.",
  face_lost: "We lost sight of your face.",
  face_changed: "A different face appeared mid-check.",
  multiple_faces: "More than one face is in view.",
};
