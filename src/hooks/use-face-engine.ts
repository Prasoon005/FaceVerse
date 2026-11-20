"use client";

import { useEffect } from "react";

import { useFaceEngineStore } from "@/stores/face-engine-store";

/** Lazily loads the face engine on mount and returns its loading state. */
export function useFaceEngine() {
  const status = useFaceEngineStore((s) => s.status);
  const stage = useFaceEngineStore((s) => s.stage);
  const progress = useFaceEngineStore((s) => s.progress);
  const backend = useFaceEngineStore((s) => s.backend);
  const error = useFaceEngineStore((s) => s.error);
  const load = useFaceEngineStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, stage, progress, backend, error, retry: load, ready: status === "ready" };
}
