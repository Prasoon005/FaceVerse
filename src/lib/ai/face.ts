/**
 * Main-thread client for the face worker. One worker per tab, created lazily on
 * the first camera page visit (PROJECT_SPEC §7.1).
 */
import * as Comlink from "comlink";

import type { FaceWorkerApi } from "@/workers/face.worker";

import type { DetectOptions, DetectResult, EngineInfo, EngineProgress } from "./types";

const CACHE_FLAG = "faceverse-models-v1";

let remote: Comlink.Remote<FaceWorkerApi> | null = null;

function getRemote() {
  if (!remote) {
    const worker = new Worker(new URL("../../workers/face.worker.ts", import.meta.url), {
      type: "module",
      name: "face-engine",
    });
    remote = Comlink.wrap<FaceWorkerApi>(worker);
  }
  return remote;
}

function modelsCached() {
  try {
    return localStorage.getItem(CACHE_FLAG) === "1";
  } catch {
    return false;
  }
}

export async function initFaceEngine(
  onProgress: (progress: EngineProgress) => void,
): Promise<EngineInfo> {
  // After the first successful load Human reads models from IndexedDB, so skip the
  // progress-tracked download on later visits.
  const info = await getRemote().init(Comlink.proxy(onProgress), { prefetch: !modelsCached() });
  try {
    localStorage.setItem(CACHE_FLAG, "1");
  } catch {
    // Storage unavailable (private mode): we'll just show download progress again next time.
  }
  return info;
}

/** Grabs the current frame as a transferable ImageBitmap and runs detection in the worker. */
export async function detectFaces(
  source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  options: DetectOptions = {},
): Promise<DetectResult> {
  const bitmap = source instanceof ImageBitmap ? source : await createImageBitmap(source);
  return getRemote().detect(Comlink.transfer(bitmap, [bitmap]), options);
}
