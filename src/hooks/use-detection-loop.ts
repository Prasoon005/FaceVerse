"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import { detectFaces } from "@/lib/ai/face";
import type { DetectOptions, DetectResult } from "@/lib/ai/types";

import { usePageVisible } from "./use-page-visible";

/**
 * Runs face detection on the live video at ~`fps`, one frame in flight at a time.
 * Pauses when disabled or when the tab is hidden (PROJECT_SPEC §7.5).
 */
export function useDetectionLoop({
  videoRef,
  enabled,
  fps,
  options,
  onResult,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  fps: number;
  options?: DetectOptions;
  onResult: (result: DetectResult) => void;
}) {
  const visible = usePageVisible();
  const [measuredFps, setMeasuredFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Keep latest callback/options without restarting the loop on every render.
  const onResultRef = useRef(onResult);
  const optionsRef = useRef(options);
  useEffect(() => {
    onResultRef.current = onResult;
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!enabled || !visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frameBudget = 1000 / fps;
    const frameTimes: number[] = [];

    const tick = async () => {
      if (cancelled) return;
      const started = performance.now();
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const result = await detectFaces(video, optionsRef.current);
          if (cancelled) return;
          onResultRef.current(result);
          setError(null);
          frameTimes.push(performance.now());
          while (frameTimes.length > 0 && frameTimes[0]! < performance.now() - 1000) {
            frameTimes.shift();
          }
          setMeasuredFps(frameTimes.length);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Detection failed");
        }
      }
      const elapsed = performance.now() - started;
      timer = setTimeout(tick, Math.max(0, frameBudget - elapsed));
    };
    void tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, visible, fps, videoRef]);

  return { fps: measuredFps, error, paused: !enabled || !visible };
}
