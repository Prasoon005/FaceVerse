/** Shared types for the face engine (worker ⇄ main thread). */

export type Box = { x: number; y: number; width: number; height: number };

export type FaceResult = {
  /** Face box in source pixels. */
  box: Box;
  /** Detection confidence 0..1. */
  score: number;
  /** L2-normalised 1024-d descriptor, or null if the description model didn't run. */
  embedding: Float32Array | null;
  /** Head rotation in degrees. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Mean eye aspect ratio of both eyes (blink detection), null without mesh. */
  ear: number | null;
  /** Probability of the "happy" emotion 0..1 (smile challenge). */
  happy: number;
  emotion?: { emotion: string; score: number };
  age?: number;
  /** Laplacian variance of the face crop, only when `quality` was requested. */
  sharpness?: number;
  /** 2-D mesh points in source pixels, only when `landmarks` was requested. */
  landmarks?: [number, number][];
};

export type DetectOptions = {
  /** Compute the sharpness score (enrollment). */
  quality?: boolean;
  /** Include mesh landmarks in the result. */
  landmarks?: boolean;
  /** Disable Human's frame cache so every value is freshly computed (enrollment captures). */
  fresh?: boolean;
};

export type DetectResult = {
  faces: FaceResult[];
  width: number;
  height: number;
  inferenceMs: number;
};

export type EngineProgress = { stage: string; progress: number };

export type EngineInfo = { backend: string };
