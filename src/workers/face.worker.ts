/// <reference lib="webworker" />
/**
 * Face engine worker (PROJECT_SPEC §7.1). Runs Human (face detection, mesh, iris,
 * 1024-d descriptor, emotion) off the main thread; exposed to the UI via Comlink.
 */
import Human, { type Config, type FaceResult as HumanFace } from "@vladmandic/human";
import * as Comlink from "comlink";

import { meshEyeAspectRatio } from "@/lib/ai/liveness";
import { laplacianVariance } from "@/lib/ai/quality";
import type {
  DetectOptions,
  DetectResult,
  EngineInfo,
  EngineProgress,
  FaceResult,
} from "@/lib/ai/types";
import { normalize } from "@/lib/ai/vector";

const MODELS = ["blazeface", "facemesh", "iris", "faceres", "emotion"] as const;
const MODEL_BASE = new URL("/models/", self.location.origin).href;
const SHARPNESS_SIZE = 112;
const RAD_TO_DEG = 180 / Math.PI;

function buildConfig(backend: "webgl" | "wasm"): Partial<Config> {
  return {
    backend,
    modelBasePath: MODEL_BASE,
    // WASM fallback only: binaries come from the jsdelivr CDN (Human's default).
    wasmPath: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/",
    debug: false,
    async: true,
    warmup: "none",
    cacheModels: true,
    filter: { enabled: true, equalization: false },
    face: {
      enabled: true,
      detector: { rotation: true, maxDetected: 20, minConfidence: 0.5, return: false },
      mesh: { enabled: true },
      iris: { enabled: true },
      attention: { enabled: false },
      // No result caching for per-face models: Human caches them by face index, so with
      // several faces in view a cached descriptor could be attached to the wrong person.
      description: { enabled: true, skipFrames: 0, skipTime: 0 },
      emotion: { enabled: true, skipFrames: 0, skipTime: 0 },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
  };
}

let human: Human | null = null;
let initPromise: Promise<EngineInfo> | null = null;

/** Downloads model files with progress so the UI can show a real progress bar. */
async function prefetchModels(onProgress: (p: EngineProgress) => void) {
  const files: string[] = [];
  for (const model of MODELS) {
    const json = `${model}.json`;
    files.push(json);
    const manifest = (await (await fetch(MODEL_BASE + json)).json()) as {
      weightsManifest?: { paths: string[] }[];
    };
    manifest.weightsManifest?.forEach((group) => files.push(...group.paths));
  }
  let done = 0;
  await Promise.all(
    files.map(async (file) => {
      const res = await fetch(MODEL_BASE + file);
      if (!res.ok) throw new Error(`Failed to download model file ${file}`);
      await res.arrayBuffer();
      done++;
      onProgress({ stage: "Downloading AI models", progress: done / files.length });
    }),
  );
}

async function createHuman(backend: "webgl" | "wasm") {
  const instance = new Human(buildConfig(backend));
  await instance.init();
  const active = String(instance.tf.getBackend?.() ?? "");
  if (active !== backend) throw new Error(`Backend ${backend} unavailable (got "${active}")`);
  await instance.load();
  return instance;
}

async function init(
  onProgress: (p: EngineProgress) => void,
  options: { prefetch: boolean },
): Promise<EngineInfo> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (options.prefetch) await prefetchModels(onProgress);
    onProgress({ stage: "Starting AI engine", progress: 1 });
    try {
      human = await createHuman("webgl");
    } catch {
      onProgress({ stage: "WebGL unavailable, using WASM", progress: 1 });
      human = await createHuman("wasm");
    }
    // Run once on a blank frame so the first real detection isn't slow.
    await human.detect(new OffscreenCanvas(64, 64));
    return { backend: String(human.tf.getBackend?.() ?? human.config.backend) };
  })();
  initPromise.catch(() => {
    initPromise = null;
  });
  return initPromise;
}

function faceSharpness(bitmap: ImageBitmap, face: HumanFace): number {
  const [x, y, w, h] = face.box;
  const canvas = new OffscreenCanvas(SHARPNESS_SIZE, SHARPNESS_SIZE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || w <= 0 || h <= 0) return 0;
  ctx.drawImage(bitmap, x, y, w, h, 0, 0, SHARPNESS_SIZE, SHARPNESS_SIZE);
  const { data } = ctx.getImageData(0, 0, SHARPNESS_SIZE, SHARPNESS_SIZE);
  const gray = new Float32Array(SHARPNESS_SIZE * SHARPNESS_SIZE);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  }
  return laplacianVariance(gray, SHARPNESS_SIZE, SHARPNESS_SIZE);
}

function toFaceResult(face: HumanFace, bitmap: ImageBitmap, options: DetectOptions): FaceResult {
  const [x, y, width, height] = face.box;
  const angle = face.rotation?.angle;
  const topEmotion = face.emotion?.[0];
  const embedding = face.embedding && face.embedding.length > 0 ? normalize(face.embedding) : null;

  return {
    box: { x, y, width, height },
    score: face.score,
    embedding,
    yaw: (angle?.yaw ?? 0) * RAD_TO_DEG,
    pitch: (angle?.pitch ?? 0) * RAD_TO_DEG,
    roll: (angle?.roll ?? 0) * RAD_TO_DEG,
    ear: meshEyeAspectRatio(face.mesh),
    happy: face.emotion?.find((e) => e.emotion === "happy")?.score ?? 0,
    emotion: topEmotion ? { emotion: topEmotion.emotion, score: topEmotion.score } : undefined,
    age: face.age,
    sharpness: options.quality ? faceSharpness(bitmap, face) : undefined,
    landmarks: options.landmarks ? face.mesh.map((p) => [p[0], p[1]]) : undefined,
  };
}

async function detect(bitmap: ImageBitmap, options: DetectOptions = {}): Promise<DetectResult> {
  if (!human) throw new Error("Face engine not initialised");
  try {
    const started = performance.now();
    const result = await human.detect(bitmap, options.fresh ? { cacheSensitivity: 0 } : undefined);
    const faces = result.face.map((f) => toFaceResult(f, bitmap, options));
    return {
      faces,
      width: bitmap.width,
      height: bitmap.height,
      inferenceMs: performance.now() - started,
    };
  } finally {
    bitmap.close();
  }
}

const api = { init, detect };
export type FaceWorkerApi = typeof api;

Comlink.expose(api);
