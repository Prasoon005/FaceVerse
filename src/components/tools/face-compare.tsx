"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleHelp, CircleX, ImageUp, LoaderCircle, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { classifyFaceSimilarity } from "@/config/recognition";
import { cosineSimilarity } from "@/lib/ai/vector";
import { indexImage } from "@/lib/data/albums";
import { cn } from "@/lib/utils";

type Side = { url: string; embedding: Float32Array | null; faces: number } | null;

/** M3: 1:1 face compare. Two photos → similarity and a verdict, all on this device. */
export function FaceCompare({ ready }: { ready: boolean }) {
  const [a, setA] = useState<Side>(null);
  const [b, setB] = useState<Side>(null);
  const [busy, setBusy] = useState<"a" | "b" | null>(null);

  async function load(which: "a" | "b", file: File) {
    setBusy(which);
    try {
      const { faces } = await indexImage(file);
      const best = [...faces].sort((x, y) => y.box.w * y.box.h - x.box.w * x.box.h)[0];
      const side = {
        url: URL.createObjectURL(file),
        embedding: best?.embedding ?? null,
        faces: faces.length,
      };
      if (!best) toast.warning("No face found in that photo.");
      (which === "a" ? setA : setB)((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return side;
      });
    } catch {
      toast.error("Couldn't read that photo.");
    } finally {
      setBusy(null);
    }
  }

  const similarity =
    a?.embedding && b?.embedding ? cosineSimilarity(a.embedding, b.embedding) : null;
  const status = similarity === null ? null : classifyFaceSimilarity(similarity);
  const verdict = {
    match: {
      label: "Same person",
      icon: CircleCheck,
      tone: "text-success-foreground",
      ring: "stroke-success",
    },
    uncertain: {
      label: "Not sure",
      icon: CircleHelp,
      tone: "text-warning-foreground",
      ring: "stroke-warning",
    },
    unknown: {
      label: "Different people",
      icon: CircleX,
      tone: "text-danger-foreground",
      ring: "stroke-danger",
    },
  } as const;
  const v = status ? verdict[status] : null;
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid gap-4">
      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        {(["a", "b"] as const).map((which, i) => {
          const side = which === "a" ? a : b;
          return (
            <label
              key={which}
              className={cn(
                "relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-brand/60",
                !ready && "pointer-events-none opacity-50",
                i === 1 && "md:order-3",
              )}
            >
              {side ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={side.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              ) : (
                <span className="grid justify-items-center gap-2 p-4 text-center text-sm text-muted-foreground">
                  <ImageUp className="size-8" aria-hidden /> Photo {i + 1}
                </span>
              )}
              {busy === which ? (
                <span className="absolute inset-0 grid place-items-center bg-background/60">
                  <LoaderCircle className="size-6 animate-spin text-brand" aria-hidden />
                </span>
              ) : null}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void load(which, f);
                  e.target.value = "";
                }}
              />
            </label>
          );
        })}

        <div className="grid justify-items-center gap-2 md:order-2">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            role="img"
            aria-label={
              similarity === null ? "No result yet" : `${Math.round(similarity * 100)}% similar`
            }
          >
            <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="9" />
            <motion.circle
              key={similarity ?? "none"}
              cx="60"
              cy="60"
              r={r}
              className={cn("fill-none", v?.ring ?? "stroke-muted")}
              strokeWidth="9"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - Math.max(0, similarity ?? 0)) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <text
              x="60"
              y="66"
              textAnchor="middle"
              className="fill-foreground font-mono text-[20px] font-bold"
            >
              {similarity === null ? "–" : `${Math.round(similarity * 100)}%`}
            </text>
          </svg>
          <AnimatePresence mode="wait">
            {v ? (
              <motion.p
                key={status}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("flex items-center gap-1.5 font-semibold", v.tone)}
              >
                <v.icon className="size-4" aria-hidden /> {v.label}
              </motion.p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Add two photos</p>
            )}
          </AnimatePresence>
        </div>
      </div>
      {a || b ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => {
            if (a) URL.revokeObjectURL(a.url);
            if (b) URL.revokeObjectURL(b.url);
            setA(null);
            setB(null);
          }}
        >
          <RotateCw aria-hidden /> Start over
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Uses the same thresholds as live recognition. If a photo has several faces, the largest one
        is compared. Nothing is uploaded.
      </p>
    </div>
  );
}
