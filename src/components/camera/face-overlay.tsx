import { ConfidenceRing } from "@/components/shared/confidence-ring";
import type { MatchStatus } from "@/config/recognition";
import type { Box } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export type OverlayFace = {
  id: number | string;
  /** Box in source pixels. */
  box: Box;
  status: MatchStatus | "pending" | "neutral";
  label?: string;
  similarity?: number | null;
};

const colors: Record<OverlayFace["status"], string> = {
  match: "border-success",
  uncertain: "border-warning",
  unknown: "border-danger",
  pending: "border-white/80",
  neutral: "border-brand",
};

/**
 * Animated corner-bracket boxes with a name tag + confidence ring per face.
 * Boxes ease between frames with a CSS transition, so 5–8 FPS detection looks smooth.
 */
export function FaceOverlay({
  faces,
  frame,
  mirrored,
}: {
  faces: OverlayFace[];
  frame: { width: number; height: number };
  mirrored: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {faces.map((face) => {
        const left = mirrored ? frame.width - face.box.x - face.box.width : face.box.x;
        const color = colors[face.status];
        return (
          <div
            key={face.id}
            className="absolute transition-all duration-150 ease-linear motion-reduce:transition-none"
            style={{
              left: `${(left / frame.width) * 100}%`,
              top: `${(face.box.y / frame.height) * 100}%`,
              width: `${(face.box.width / frame.width) * 100}%`,
              height: `${(face.box.height / frame.height) * 100}%`,
            }}
          >
            <span
              className={cn(
                "absolute top-0 left-0 size-4 rounded-tl-md border-t-2 border-l-2",
                color,
              )}
            />
            <span
              className={cn(
                "absolute top-0 right-0 size-4 rounded-tr-md border-t-2 border-r-2",
                color,
              )}
            />
            <span
              className={cn(
                "absolute bottom-0 left-0 size-4 rounded-bl-md border-b-2 border-l-2",
                color,
              )}
            />
            <span
              className={cn(
                "absolute right-0 bottom-0 size-4 rounded-br-md border-r-2 border-b-2",
                color,
              )}
            />
            {face.label ? (
              <span className="absolute top-full left-1/2 mt-1.5 flex -translate-x-1/2 items-center gap-1.5 rounded-md border bg-background/85 py-0.5 pr-2 pl-0.5 text-xs font-medium whitespace-nowrap shadow-sm backdrop-blur">
                {face.status === "match" ||
                face.status === "uncertain" ||
                face.status === "unknown" ? (
                  <ConfidenceRing value={face.similarity ?? null} status={face.status} size={20} />
                ) : null}
                {face.label}
                {face.similarity != null && face.status !== "unknown" ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {Math.round(face.similarity * 100)}%
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
