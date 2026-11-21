"use client";

import { motion } from "framer-motion";
import { Download, EyeOff, LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { canvasToBlob, downloadBlob } from "@/lib/ai/capture";
import { indexImage, type NormBox } from "@/lib/data/albums";
import { cn } from "@/lib/utils";

/**
 * E3: privacy blur. Every face in the photo is blurred; tap a face to keep it visible.
 * Runs in the browser; the result downloads as a JPEG.
 */
export function PrivacyBlur({ ready }: { ready: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<NormBox[]>([]);
  const [kept, setKept] = useState<Set<number>>(() => new Set());
  const [strength, setStrength] = useState(18);
  const [busy, setBusy] = useState(false);

  async function load(file: File) {
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      const { faces } = await indexImage(file);
      setImage(img);
      setBoxes(faces.map((f) => f.box));
      setKept(new Set());
      if (faces.length === 0) toast.info("No faces found in this photo.");
    } catch {
      toast.error("Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  }

  // Redraw: the photo, then each non-kept face blurred (padded ellipse).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = "none";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    boxes.forEach((b, i) => {
      if (kept.has(i)) return;
      const pad = 0.25;
      const x = (b.x - b.w * pad) * canvas.width;
      const y = (b.y - b.h * pad) * canvas.height;
      const w = b.w * (1 + pad * 2) * canvas.width;
      const h = b.h * (1 + pad * 2) * canvas.height;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${Math.max(4, (strength * canvas.width) / 1000)}px)`;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    });
  }, [image, boxes, kept, strength]);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadBlob(await canvasToBlob(canvas, "image/jpeg", 0.9), "blurred.jpg");
  }

  if (!image) {
    return (
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-brand/60",
          (!ready || busy) && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <LoaderCircle className="size-8 animate-spin text-brand" aria-hidden />
        ) : (
          <EyeOff className="size-8 text-brand" aria-hidden />
        )}
        <span className="font-medium text-foreground">Choose a photo to blur faces</span>
        <span>Everyone is blurred automatically; tap a face to keep it.</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = "";
          }}
        />
      </label>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border">
        <canvas ref={canvasRef} className="block h-auto w-full" />
        {boxes.map((b, i) => (
          <motion.button
            key={i}
            type="button"
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() =>
              setKept((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
            aria-pressed={kept.has(i)}
            aria-label={`Face ${i + 1}: ${kept.has(i) ? "visible" : "blurred"}`}
            className={cn(
              "absolute rounded-full border-2 transition-colors",
              kept.has(i) ? "border-success" : "border-dashed border-white/70",
            )}
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {boxes.length} face{boxes.length === 1 ? "" : "s"} · {boxes.length - kept.size} blurred
        </span>
        <div className="flex items-center gap-2">
          <Label htmlFor="blur-strength" className="text-sm">
            Strength
          </Label>
          <input
            id="blur-strength"
            type="range"
            min={6}
            max={40}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="accent-[var(--brand)]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => setImage(null)}>
            <RotateCw aria-hidden /> Another photo
          </Button>
          <Button onClick={() => void download()}>
            <Download aria-hidden /> Download
          </Button>
        </div>
      </div>
    </div>
  );
}
