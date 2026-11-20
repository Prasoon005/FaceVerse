"use client";

import { useEffect } from "react";

import { useVoiceEngineStore } from "@/stores/voice-engine-store";

/** Lazily loads the voice engine on mount and returns its loading state. */
export function useVoiceEngine() {
  const status = useVoiceEngineStore((s) => s.status);
  const stage = useVoiceEngineStore((s) => s.stage);
  const progress = useVoiceEngineStore((s) => s.progress);
  const error = useVoiceEngineStore((s) => s.error);
  const load = useVoiceEngineStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, stage, progress, error, retry: load, ready: status === "ready" };
}
