"use client";

import type { ReactNode, RefObject } from "react";

import { cn } from "@/lib/utils";

/**
 * Video element sized to the stream's exact aspect ratio, so overlays can be
 * positioned with plain percentages (box / frame size) and never drift.
 */
export function CameraView({
  videoRef,
  dimensions,
  onDimensions,
  mirrored,
  maxHeight = "70vh",
  className,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  dimensions: { width: number; height: number } | null;
  onDimensions: (d: { width: number; height: number }) => void;
  mirrored: boolean;
  maxHeight?: string;
  className?: string;
  children?: ReactNode;
}) {
  const ratio = dimensions ? dimensions.width / dimensions.height : 16 / 9;

  return (
    <div
      className={cn("relative mx-auto overflow-hidden rounded-xl border bg-muted", className)}
      style={{ aspectRatio: `${ratio}`, width: `min(100%, calc(${maxHeight} * ${ratio}))` }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-label="Camera preview"
        onLoadedMetadata={(e) =>
          onDimensions({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
        }
        className={cn("absolute inset-0 size-full object-fill", mirrored && "-scale-x-100")}
      />
      {children}
    </div>
  );
}
