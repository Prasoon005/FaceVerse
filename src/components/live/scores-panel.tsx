"use client";

import { useQuery } from "@tanstack/react-query";

import type { OverlayFace } from "@/components/camera/face-overlay";
import { recognitionConfig } from "@/config/recognition";
import { getCalibrationStats, type SimilarityStats } from "@/lib/data/recognition";

export type LiveFace = OverlayFace & {
  /** Closest enrolled person even when the face is shown as Unknown. */
  bestName: string | null;
  runnerUp: { name: string; similarity: number } | null;
};

const fmt = (n: number) => n.toFixed(3);

/**
 * Debug view for tuning thresholds: raw similarity per face (best and next-best person)
 * and how well the enrolled samples separate (same person vs different people).
 */
export function ScoresPanel({ faces }: { faces: LiveFace[] }) {
  const calibration = useQuery({
    queryKey: ["calibration"],
    queryFn: getCalibrationStats,
    staleTime: 60_000,
  });
  const { match, uncertain, margin } = recognitionConfig.face;
  const c = calibration.data;

  return (
    <aside
      className="grid content-start gap-4 rounded-xl border bg-card p-4 text-sm"
      aria-label="Scores"
    >
      <p className="font-mono text-xs text-muted-foreground">
        match ≥ {match} · uncertain ≥ {uncertain} · margin {margin}
      </p>

      <div className="grid gap-2">
        <h2 className="font-medium">Faces in frame</h2>
        {faces.length === 0 ? (
          <p className="text-muted-foreground">No faces in view.</p>
        ) : (
          <ul className="grid gap-1 font-mono text-xs">
            {faces.map((f) => (
              <li key={f.id} className="rounded-md bg-muted/50 p-2">
                <div>
                  #{f.id} {f.status}: {f.bestName ?? "–"}{" "}
                  {f.similarity != null ? fmt(f.similarity) : ""}
                </div>
                {f.runnerUp ? (
                  <div className="text-muted-foreground">
                    next: {f.runnerUp.name} {fmt(f.runnerUp.similarity)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <h2 className="font-medium">Enrolled samples</h2>
        {calibration.isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : calibration.isError || !c ? (
          <p className="text-danger-foreground">Couldn&apos;t load samples.</p>
        ) : (
          <div className="grid gap-1 font-mono text-xs">
            <span>
              {c.people} people · {c.samples} samples
            </span>
            <StatsRow label="same person" stats={c.samePerson} />
            <StatsRow label="different people" stats={c.differentPeople} />
            <p className="mt-1 font-sans text-muted-foreground">
              Same-person scores should be clearly higher than different-people scores; the match
              threshold belongs in the gap between them.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function StatsRow({ label, stats }: { label: string; stats: SimilarityStats | null }) {
  return (
    <span>
      {label}:{" "}
      {stats
        ? `min ${fmt(stats.min)} · avg ${fmt(stats.mean)} · max ${fmt(stats.max)}`
        : "not enough samples"}
    </span>
  );
}
