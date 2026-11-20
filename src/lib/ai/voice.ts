/**
 * Main-thread client for the voice worker. One worker per tab, created lazily the first
 * time a voice feature is opened (PROJECT_SPEC §7.3).
 */
import * as Comlink from "comlink";

import type { VoiceWorkerApi } from "@/workers/voice.worker";

import type { EngineInfo, EngineProgress } from "./types";

let remote: Comlink.Remote<VoiceWorkerApi> | null = null;

function getRemote() {
  if (!remote) {
    const worker = new Worker(new URL("../../workers/voice.worker.ts", import.meta.url), {
      type: "module",
      name: "voice-engine",
    });
    remote = Comlink.wrap<VoiceWorkerApi>(worker);
  }
  return remote;
}

export function initVoiceEngine(
  onProgress: (progress: EngineProgress) => void,
): Promise<EngineInfo> {
  return getRemote().init(Comlink.proxy(onProgress));
}

/** Mono 16 kHz speech → L2-normalised 512-d speaker embedding (computed in the worker). */
export function embedVoice(audio: Float32Array): Promise<Float32Array> {
  const copy = audio.slice();
  return getRemote().embed(Comlink.transfer(copy, [copy.buffer]));
}
