/** Enrollment quality checks (PROJECT_SPEC §7.1). */
import { recognitionConfig } from "@/config/recognition";

import type { FaceResult } from "./types";

export type QualityReason =
  "no_face" | "multiple_faces" | "too_small" | "blurry" | "extreme_pose" | "low_confidence";

export type QualityCheck = { ok: boolean; reasons: QualityReason[] };

export const qualityLabels: Record<QualityReason, string> = {
  no_face: "No face detected",
  multiple_faces: "Only one face, please",
  too_small: "Move closer",
  blurry: "Hold still / more light",
  extreme_pose: "Face the camera more",
  low_confidence: "Face not clear",
};

type QualityInput = Pick<FaceResult, "box" | "score" | "yaw"> & { sharpness?: number };

/** Rejects faces that would make a poor enrollment sample. */
export function qualityCheck(faces: readonly QualityInput[]): QualityCheck {
  const cfg = recognitionConfig.quality;
  if (faces.length === 0) return { ok: false, reasons: ["no_face"] };

  const reasons: QualityReason[] = [];
  if (faces.length > 1) reasons.push("multiple_faces");

  const face = faces[0]!;
  if (face.box.width < cfg.minFaceSize) reasons.push("too_small");
  if (face.score < cfg.minScore) reasons.push("low_confidence");
  if (Math.abs(face.yaw) > cfg.maxYawDeg) reasons.push("extreme_pose");
  if (face.sharpness !== undefined && face.sharpness < cfg.minSharpness) reasons.push("blurry");

  return { ok: reasons.length === 0, reasons };
}

/** 0..1 quality score stored alongside each embedding (higher is better). */
export function qualityScore(face: QualityInput): number {
  const cfg = recognitionConfig.quality;
  const size = Math.min(1, face.box.width / (cfg.minFaceSize * 2));
  const pose = 1 - Math.min(1, Math.abs(face.yaw) / (cfg.maxYawDeg * 2));
  const sharp =
    face.sharpness === undefined ? 1 : Math.min(1, face.sharpness / (cfg.minSharpness * 3));
  return Number(((face.score + size + pose + sharp) / 4).toFixed(3));
}

/**
 * Sharpness of a grayscale image: variance of the 4-neighbour Laplacian.
 * `gray` is row-major luminance (0..255) of size width×height.
 */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i]! - gray[i - 1]! - gray[i + 1]! - gray[i - width]! - gray[i + width]!;
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}
