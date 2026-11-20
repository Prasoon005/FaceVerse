"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

/** Microphone stream with permission states; tracks are stopped on unmount. */
export function useMicrophone() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setError("This browser can't record audio. Try Chrome, Edge or Safari over HTTPS.");
      return null;
    }
    setStatus("requesting");
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = media;
      setStream(media);
      setStatus("active");
      return media;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("unavailable");
        setError("No microphone found.");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Couldn't start the microphone.");
      }
      return null;
    }
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { status, error, stream, start, stop };
}
