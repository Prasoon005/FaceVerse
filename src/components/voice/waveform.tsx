"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const BARS = 48;

/**
 * Live level meter drawn from an AnalyserNode (bars mirrored around the centre line).
 * Shows a flat baseline when there's no input. Purely decorative for screen readers.
 */
export function Waveform({
  analyser,
  className,
}: {
  analyser: AnalyserNode | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const data = analyser ? new Uint8Array(analyser.fftSize) : null;
    let frame = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color;
      const barWidth = width / BARS;
      if (analyser && data) analyser.getByteTimeDomainData(data);
      const step = data ? Math.floor(data.length / BARS) : 1;

      for (let i = 0; i < BARS; i++) {
        let level = 0;
        if (data) {
          // Peak deviation from silence (128) within this slice.
          for (let j = i * step; j < (i + 1) * step; j++) {
            level = Math.max(level, Math.abs(data[j]! - 128) / 128);
          }
        }
        const barHeight = Math.max(2 * dpr, Math.min(1, level * 2.5) * height);
        ctx.fillRect(
          i * barWidth + barWidth * 0.2,
          (height - barHeight) / 2,
          barWidth * 0.6,
          barHeight,
        );
      }
      if (analyser) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("h-16 w-full text-brand", !analyser && "text-border", className)}
    />
  );
}
