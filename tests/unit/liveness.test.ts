import { describe, expect, it } from "vitest";

import { recognitionConfig } from "@/config/recognition";
import {
  createLivenessState,
  eyeAspectRatio,
  meshEyeAspectRatio,
  LEFT_EYE_INDICES,
  type LivenessObservation,
  pickChallenges,
  RIGHT_EYE_INDICES,
  toLivenessResult,
  updateLiveness,
} from "@/lib/ai/liveness";

/** Six eye points with a given opening (vertical half-height) and width. */
function eye(open: number, width = 1): [number, number][] {
  return [
    [0, 0],
    [width / 3, -open],
    [(2 * width) / 3, -open],
    [width, 0],
    [(2 * width) / 3, open],
    [width / 3, open],
  ];
}

describe("eyeAspectRatio", () => {
  it("is (|p2-p6| + |p3-p5|) / (2|p1-p4|)", () => {
    // vertical distances are 2*open each, horizontal is width
    expect(eyeAspectRatio(eye(0.15, 1))).toBeCloseTo((0.3 + 0.3) / 2);
  });

  it("is ~0 for a closed eye and larger for an open eye", () => {
    expect(eyeAspectRatio(eye(0))).toBe(0);
    expect(eyeAspectRatio(eye(0.2))).toBeGreaterThan(eyeAspectRatio(eye(0.05)));
  });

  it("is scale invariant", () => {
    const small = eyeAspectRatio(eye(0.1, 1));
    const big = eyeAspectRatio(eye(1, 10));
    expect(big).toBeCloseTo(small);
  });

  it("returns 0 when the eye width is 0 and validates point count", () => {
    expect(eyeAspectRatio(eye(0.1, 0))).toBe(0);
    expect(() => eyeAspectRatio([[0, 0]])).toThrow();
  });
});

describe("meshEyeAspectRatio", () => {
  it("averages both eyes from a 468-point mesh", () => {
    const mesh: [number, number][] = Array.from({ length: 468 }, () => [0, 0]);
    const left = eye(0.1);
    const right = eye(0.2);
    LEFT_EYE_INDICES.forEach((idx, i) => (mesh[idx] = left[i]!));
    RIGHT_EYE_INDICES.forEach((idx, i) => (mesh[idx] = right[i]!));
    expect(meshEyeAspectRatio(mesh)).toBeCloseTo((0.2 + 0.4) / 2);
  });

  it("returns null for an incomplete mesh", () => {
    expect(meshEyeAspectRatio([[0, 0]])).toBeNull();
  });
});

describe("pickChallenges", () => {
  it("picks distinct challenges", () => {
    const picked = pickChallenges(4);
    expect(new Set(picked).size).toBe(4);
  });

  it("is deterministic with an injected random source", () => {
    expect(pickChallenges(2, () => 0)).toEqual(["blink", "turn_left"]);
  });
});

const cfg = recognitionConfig.liveness;
const base: LivenessObservation = { faceCount: 1, trackId: 1, ear: 0.3, yawDeg: 0, happy: 0 };

describe("updateLiveness", () => {
  it("passes a blink only after closed-then-open", () => {
    let s = createLivenessState(["blink"], 0);
    s = updateLiveness(s, base, 100);
    expect(s.passed).toBeNull();
    s = updateLiveness(s, { ...base, ear: cfg.earClosed - 0.05 }, 200);
    expect(s.passed).toBeNull();
    s = updateLiveness(s, { ...base, ear: cfg.earOpen + 0.05 }, 300);
    expect(s.passed).toBe(true);
    expect(toLivenessResult(s)).toMatchObject({ passed: true, durationMs: 300 });
  });

  it("does not count half-closed eyes as a blink", () => {
    let s = createLivenessState(["blink"], 0);
    s = updateLiveness(s, { ...base, ear: (cfg.earClosed + cfg.earOpen) / 2 }, 100);
    s = updateLiveness(s, { ...base, ear: 0.35 }, 200);
    expect(s.passed).toBeNull();
  });

  it("detects head turns using the configured yaw sign", () => {
    const leftYaw = cfg.turnYawDeg * cfg.yawLeftSign + cfg.yawLeftSign;
    let s = createLivenessState(["turn_left", "turn_right"], 0);
    s = updateLiveness(s, { ...base, yawDeg: -leftYaw }, 100); // wrong way
    expect(s.current).toBe(0);
    s = updateLiveness(s, { ...base, yawDeg: leftYaw }, 200);
    expect(s.steps[0]!.status).toBe("passed");
    expect(s.steps[1]!.status).toBe("active");
    s = updateLiveness(s, { ...base, yawDeg: -leftYaw }, 300);
    expect(s.passed).toBe(true);
  });

  it("detects a smile", () => {
    let s = createLivenessState(["smile"], 0);
    s = updateLiveness(s, { ...base, happy: cfg.smileScore + 0.1 }, 100);
    expect(s.passed).toBe(true);
  });

  it("fails on timeout", () => {
    let s = createLivenessState(["smile"], 0);
    s = updateLiveness(s, base, cfg.challengeTimeoutMs + 1);
    expect(s.passed).toBe(false);
    expect(s.failure).toBe("timeout");
    expect(s.steps[0]!.status).toBe("failed");
  });

  it("tolerates a short face gap but fails on a long one", () => {
    let s = createLivenessState(["smile"], 0);
    s = updateLiveness(s, null, cfg.maxFaceGapMs - 1);
    expect(s.passed).toBeNull();
    s = updateLiveness(s, null, cfg.maxFaceGapMs + 1);
    expect(s.failure).toBe("face_lost");
  });

  it("fails when the tracked face changes or several faces appear", () => {
    let s = createLivenessState(["smile", "blink"], 0);
    s = updateLiveness(s, base, 100);
    expect(updateLiveness(s, { ...base, trackId: 2 }, 200).failure).toBe("face_changed");
    expect(updateLiveness(s, { ...base, faceCount: 2 }, 200).failure).toBe("multiple_faces");
  });

  it("ignores updates once finished", () => {
    let s = createLivenessState(["smile"], 0);
    s = updateLiveness(s, { ...base, happy: 1 }, 100);
    expect(updateLiveness(s, null, 99_999)).toBe(s);
  });
});
