"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ScanFace } from "lucide-react";

import { cn } from "@/lib/utils";

export type GridPhoto = {
  id: string;
  url: string | null;
  width: number | null;
  height: number | null;
  faceCount?: number;
  /** Matched face to outline (normalised 0..1), for "Find me" results. */
  box?: { x: number; y: number; w: number; h: number };
  /** e.g. "92% match". */
  badge?: string;
};

/** Masonry photo grid (CSS columns). Click opens; with `selected` it toggles selection. */
export function PhotoGrid({
  photos,
  onOpen,
  selected,
  onToggle,
}: {
  photos: GridPhoto[];
  onOpen?: (photo: GridPhoto) => void;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}) {
  const selecting = Boolean(selected && onToggle);
  return (
    <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3">
      <AnimatePresence initial={false}>
        {photos.map((p, i) => {
          const isSelected = selected?.has(p.id) ?? false;
          return (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="break-inside-avoid"
            >
              <button
                type="button"
                onClick={() => (selecting ? onToggle!(p.id) : onOpen?.(p))}
                aria-pressed={selecting ? isSelected : undefined}
                aria-label={selecting ? `Select photo ${i + 1}` : `Open photo ${i + 1}`}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isSelected && "ring-2 ring-brand",
                )}
                style={
                  p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined
                }
              >
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : null}
                {p.box ? (
                  <motion.span
                    aria-hidden
                    initial={{ opacity: 0, scale: 1.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
                    className="absolute rounded-md border-2 border-success shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
                    style={{
                      left: `${p.box.x * 100}%`,
                      top: `${p.box.y * 100}%`,
                      width: `${p.box.w * 100}%`,
                      height: `${p.box.h * 100}%`,
                    }}
                  />
                ) : null}
                {p.badge ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                    {p.badge}
                  </span>
                ) : p.faceCount !== undefined ? (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ScanFace className="size-3" aria-hidden /> {p.faceCount}
                  </span>
                ) : null}
                {selecting ? (
                  <span
                    className={cn(
                      "absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border-2 border-white shadow",
                      isSelected ? "bg-brand text-white" : "bg-black/30",
                    )}
                    aria-hidden
                  >
                    {isSelected ? <Check className="size-3.5" /> : null}
                  </span>
                ) : null}
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
