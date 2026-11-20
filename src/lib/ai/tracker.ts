/**
 * Minimal IoU tracker (PROJECT_SPEC §7.1): keeps a stable id per face across frames
 * so each person is matched against the database once, not on every frame.
 */
import { recognitionConfig } from "@/config/recognition";

import type { Box } from "./types";

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union <= 0 ? 0 : intersection / union;
}

export type Track = {
  id: number;
  box: Box;
  /** Frames since this track was last matched to a detection. */
  missed: number;
  /** Number of frames this track has been seen. */
  hits: number;
};

export class FaceTracker {
  private tracks: Track[] = [];
  private nextId = 1;

  constructor(
    private readonly iouThreshold: number = recognitionConfig.live.trackIouThreshold,
    private readonly maxMissed: number = recognitionConfig.live.trackMaxMissed,
  ) {}

  /**
   * Assigns detections to existing tracks (greedy, highest IoU first) and creates
   * tracks for the rest. Returns one track id per detection, in input order.
   */
  update(boxes: readonly Box[]): number[] {
    const pairs: { t: number; d: number; score: number }[] = [];
    this.tracks.forEach((track, t) =>
      boxes.forEach((box, d) => {
        const score = iou(track.box, box);
        if (score >= this.iouThreshold) pairs.push({ t, d, score });
      }),
    );
    pairs.sort((a, b) => b.score - a.score);

    const assigned = new Array<number>(boxes.length).fill(-1);
    const usedTracks = new Set<number>();
    for (const { t, d } of pairs) {
      if (usedTracks.has(t) || assigned[d] !== -1) continue;
      usedTracks.add(t);
      assigned[d] = t;
    }

    const ids = boxes.map((box, d) => {
      const t = assigned[d]!;
      if (t !== -1) {
        const track = this.tracks[t]!;
        track.box = box;
        track.missed = 0;
        track.hits += 1;
        return track.id;
      }
      const track: Track = { id: this.nextId++, box, missed: 0, hits: 1 };
      this.tracks.push(track);
      usedTracks.add(this.tracks.length - 1);
      return track.id;
    });

    this.tracks.forEach((track, t) => {
      if (!usedTracks.has(t)) track.missed += 1;
    });
    this.tracks = this.tracks.filter((track) => track.missed <= this.maxMissed);

    return ids;
  }

  /** Currently alive tracks (including briefly missed ones). */
  get active(): readonly Track[] {
    return this.tracks;
  }

  reset() {
    this.tracks = [];
  }
}
