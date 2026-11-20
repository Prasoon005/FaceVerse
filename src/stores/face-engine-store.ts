import { create } from "zustand";

import { initFaceEngine } from "@/lib/ai/face";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

type FaceEngineState = {
  status: EngineStatus;
  stage: string;
  progress: number;
  backend: string | null;
  error: string | null;
  /** Starts loading the face models once; later calls are no-ops while loading or ready. */
  load: () => Promise<void>;
};

export const useFaceEngineStore = create<FaceEngineState>()((set, get) => ({
  status: "idle",
  stage: "",
  progress: 0,
  backend: null,
  error: null,
  load: async () => {
    const { status } = get();
    if (status === "loading" || status === "ready") return;
    set({ status: "loading", stage: "Preparing AI engine", progress: 0, error: null });
    try {
      const info = await initFaceEngine(({ stage, progress }) => set({ stage, progress }));
      set({ status: "ready", backend: info.backend, progress: 1, stage: "Ready" });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load the face engine",
      });
    }
  },
}));
