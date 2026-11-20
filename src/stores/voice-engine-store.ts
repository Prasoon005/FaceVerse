import { create } from "zustand";

import { initVoiceEngine } from "@/lib/ai/voice";

import type { EngineStatus } from "./face-engine-store";

type VoiceEngineState = {
  status: EngineStatus;
  stage: string;
  progress: number;
  error: string | null;
  /** Starts loading the voice model once; later calls are no-ops while loading or ready. */
  load: () => Promise<void>;
};

export const useVoiceEngineStore = create<VoiceEngineState>()((set, get) => ({
  status: "idle",
  stage: "",
  progress: 0,
  error: null,
  load: async () => {
    const { status } = get();
    if (status === "loading" || status === "ready") return;
    set({ status: "loading", stage: "Preparing voice engine", progress: 0, error: null });
    try {
      await initVoiceEngine(({ stage, progress }) => set({ stage, progress }));
      set({ status: "ready", progress: 1, stage: "Ready" });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load the voice engine",
      });
    }
  },
}));
