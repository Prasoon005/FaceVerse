import { describe, expect, it } from "vitest";

import { classifyFaceMatch, classifyFaceSimilarity, recognitionConfig } from "@/config/recognition";
import { laplacianVariance, qualityCheck, qualityScore } from "@/lib/ai/quality";
import { FaceTracker, iou } from "@/lib/ai/tracker";

const q = recognitionConfig.quality;
const goodFace = {
  box: { x: 0, y: 0, width: q.minFaceSize + 50, height: q.minFaceSize + 50 },
  score: 0.95,
  yaw: 0,
  sharpness: q.minSharpness * 2,
};

describe("qualityCheck", () => {
  it("accepts a single, large, sharp, frontal face", () => {
    expect(qualityCheck([goodFace])).toEqual({ ok: true, reasons: [] });
  });

  it("reports every problem", () => {
    expect(qualityCheck([])).toEqual({ ok: false, reasons: ["no_face"] });
    const bad = {
      box: { x: 0, y: 0, width: 50, height: 50 },
      score: 0.3,
      yaw: 40,
      sharpness: 1,
    };
    expect(qualityCheck([bad, goodFace]).reasons).toEqual([
      "multiple_faces",
      "too_small",
      "low_confidence",
      "extreme_pose",
      "blurry",
    ]);
  });

  it("skips the blur check when sharpness was not computed", () => {
    expect(qualityCheck([{ ...goodFace, sharpness: undefined }]).ok).toBe(true);
  });

  it("scores better faces higher", () => {
    expect(qualityScore(goodFace)).toBeGreaterThan(qualityScore({ ...goodFace, yaw: 20 }));
    expect(qualityScore(goodFace)).toBeLessThanOrEqual(1);
  });
});

describe("laplacianVariance", () => {
  it("is 0 for a flat image and higher for edges", () => {
    const flat = new Array(25).fill(128);
    const edges = Array.from({ length: 25 }, (_, i) => (i % 2 ? 255 : 0));
    expect(laplacianVariance(flat, 5, 5)).toBe(0);
    expect(laplacianVariance(edges, 5, 5)).toBeGreaterThan(1000);
  });
});

describe("classifyFaceSimilarity", () => {
  it("maps similarity to match / uncertain / unknown", () => {
    const { match, uncertain } = recognitionConfig.face;
    expect(classifyFaceSimilarity(0.99)).toBe("match");
    expect(classifyFaceSimilarity(match)).toBe("match");
    expect(classifyFaceSimilarity((match + uncertain) / 2)).toBe("uncertain");
    expect(classifyFaceSimilarity(uncertain - 0.01)).toBe("unknown");
    expect(classifyFaceSimilarity(null)).toBe("unknown");
  });
});

describe("classifyFaceMatch", () => {
  const { match, margin } = recognitionConfig.face;

  it("keeps a clear match", () => {
    expect(classifyFaceMatch(match + 0.1, match + 0.1 - margin * 2)).toBe("match");
    expect(classifyFaceMatch(match + 0.1, null)).toBe("match");
  });

  it("downgrades a match when the next person is too close", () => {
    expect(classifyFaceMatch(match + 0.1, match + 0.1 - margin / 2)).toBe("uncertain");
  });

  it("never upgrades low scores", () => {
    expect(classifyFaceMatch(0.1, 0)).toBe("unknown");
  });
});

describe("iou", () => {
  it("is 1 for identical boxes, 0 for disjoint ones", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(iou(a, a)).toBe(1);
    expect(iou(a, { x: 20, y: 20, width: 5, height: 5 })).toBe(0);
    expect(iou(a, { x: 5, y: 0, width: 10, height: 10 })).toBeCloseTo(50 / 150);
  });
});

describe("FaceTracker", () => {
  const box = (x: number) => ({ x, y: 0, width: 100, height: 100 });

  it("keeps ids stable for moving faces and assigns new ids to new faces", () => {
    const tracker = new FaceTracker(0.3, 2);
    const [a] = tracker.update([box(0)]);
    const [a2, b] = tracker.update([box(10), box(500)]);
    expect(a2).toBe(a);
    expect(b).not.toBe(a);
  });

  it("drops tracks after too many missed frames", () => {
    const tracker = new FaceTracker(0.3, 1);
    const [a] = tracker.update([box(0)]);
    tracker.update([]);
    expect(tracker.update([box(0)])[0]).toBe(a); // missed once: still alive
    tracker.update([]);
    tracker.update([]);
    expect(tracker.update([box(0)])[0]).not.toBe(a); // missed twice: new id
  });

  it("never assigns one track to two detections", () => {
    const tracker = new FaceTracker(0.1, 2);
    tracker.update([box(0)]);
    const ids = tracker.update([box(5), box(10)]);
    expect(new Set(ids).size).toBe(2);
  });
});
