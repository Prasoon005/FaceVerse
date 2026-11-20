"use client";

import { useCallback } from "react";

import { type FeedbackSound, playFeedback } from "@/lib/audio/feedback";
import { useSoundStore } from "@/stores/sound-store";

/** Plays UI sounds when the app-wide sound preference is on. */
export function useSoundFeedback() {
  const enabled = useSoundStore((s) => s.enabled);
  const toggle = useSoundStore((s) => s.toggle);

  const play = useCallback((sound: FeedbackSound) => {
    if (useSoundStore.getState().enabled) playFeedback(sound);
  }, []);

  return { enabled, toggle, play };
}
