"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

export type CameraDevice = { deviceId: string; label: string };

/**
 * Camera access with clean teardown (PROJECT_SPEC §7.5): tracks are always stopped on
 * unmount, and `videoRef` should be attached to the <video> element that shows the stream.
 */
export function useCamera({ autoStart = true }: { autoStart?: boolean } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async (nextDeviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setError("This browser can't access a camera. Try Chrome, Edge or Firefox over HTTPS.");
      return;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: nextDeviceId
          ? { deviceId: { exact: nextDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        setDimensions({ width: video.videoWidth || 1280, height: video.videoHeight || 720 });
      }
      const settings = stream.getVideoTracks()[0]?.getSettings();
      setDeviceId(settings?.deviceId ?? nextDeviceId ?? null);
      setFacing(settings?.facingMode === "environment" ? "environment" : "user");
      // Labels are only available after permission is granted.
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        all
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
      );
      setStatus("active");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError("Camera permission was denied.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("unavailable");
        setError("No camera was found on this device.");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not start the camera.");
      }
    }
  }, []);

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const index = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(index + 1) % devices.length]!;
    void start(next.deviceId);
  }, [devices, deviceId, start]);

  useEffect(() => {
    // Defer so React's strict-mode double effect doesn't request the camera twice.
    const timer = autoStart ? setTimeout(() => void start(), 0) : undefined;
    return () => {
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [autoStart, start]);

  return {
    videoRef,
    status,
    error,
    devices,
    deviceId,
    dimensions,
    setDimensions,
    start,
    stop,
    switchCamera,
    /** Front cameras are shown mirrored, like a selfie. */
    mirrored: facing === "user",
  };
}
