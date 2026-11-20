/// <reference lib="webworker" />
/**
 * Voice engine worker (PROJECT_SPEC §7.3). Runs a WavLM x-vector speaker-verification
 * model with Transformers.js off the main thread; exposed to the UI via Comlink.
 */
import {
  AutoModel,
  AutoProcessor,
  env,
  type PreTrainedModel,
  type Processor,
  type ProgressInfo,
  type Tensor,
} from "@huggingface/transformers";
import * as Comlink from "comlink";

import { recognitionConfig } from "@/config/recognition";
import type { EngineInfo, EngineProgress } from "@/lib/ai/types";
import { normalize } from "@/lib/ai/vector";

const ORT_BASE = new URL("/ort/", self.location.origin).href;

// Model files come from the Hugging Face Hub (cached by the browser's Cache API after the
// first load); the ONNX Runtime WASM files are served from our own origin.
env.allowLocalModels = false;
env.useWasmCache = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${ORT_BASE}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${ORT_BASE}ort-wasm-simd-threaded.asyncify.wasm`,
  };
}

let processor: Processor | null = null;
let model: PreTrainedModel | null = null;
let initPromise: Promise<EngineInfo> | null = null;

async function init(onProgress: (p: EngineProgress) => void): Promise<EngineInfo> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const id = recognitionConfig.voice.model;
    const progress_callback = (info: ProgressInfo) => {
      if (info.status === "progress_total") {
        onProgress({ stage: "Downloading voice model", progress: info.progress / 100 });
      }
    };
    onProgress({ stage: "Downloading voice model", progress: 0 });
    processor = await AutoProcessor.from_pretrained(id, { progress_callback });
    model = await AutoModel.from_pretrained(id, { dtype: "q8", device: "wasm", progress_callback });
    onProgress({ stage: "Starting voice engine", progress: 1 });
    // Warm up so the first real recording isn't slow.
    await embed(new Float32Array(recognitionConfig.voice.sampleRate));
    return { backend: "wasm" };
  })();
  initPromise.catch(() => {
    initPromise = null;
  });
  return initPromise;
}

/** Mono 16 kHz samples → L2-normalised 512-d speaker embedding. */
async function embed(audio: Float32Array): Promise<Float32Array> {
  if (!processor || !model) throw new Error("Voice engine not initialised");
  const inputs = await processor(audio);
  const output = (await model(inputs)) as { embeddings: Tensor };
  const vector = normalize(output.embeddings.data as Float32Array);
  output.embeddings.dispose();
  return Comlink.transfer(vector, [vector.buffer]);
}

const api = { init, embed };
export type VoiceWorkerApi = typeof api;

Comlink.expose(api);
