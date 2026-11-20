/** Frame capture helpers (thumbnails for avatars, snapshots for the live page). */
import type { Box } from "./types";

/** Crops a square face thumbnail (with padding) from the current video frame as a JPEG blob. */
export async function captureFaceThumbnail(
  video: HTMLVideoElement,
  box: Box,
  size = 256,
): Promise<Blob> {
  const padding = 0.35;
  const side = Math.max(box.width, box.height) * (1 + padding * 2);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const sx = Math.max(0, cx - side / 2);
  const sy = Math.max(0, cy - side / 2);
  const sw = Math.min(side, video.videoWidth - sx);
  const sh = Math.min(side, video.videoHeight - sy);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
  return canvasToBlob(canvas, "image/jpeg", 0.85);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Capture failed"))),
      type,
      quality,
    ),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
