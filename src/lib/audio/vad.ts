/**
 * Simple energy-based voice activity detection (PROJECT_SPEC §7.3): drops leading,
 * trailing and long internal silences so the embedding only sees speech.
 */

export type TrimOptions = {
  /** Analysis frame length. */
  frameMs?: number;
  /** Speech frames are kept with this much padding on each side. */
  paddingMs?: number;
  /** RMS below this is always silence, however quiet the room is. */
  minRms?: number;
};

export type TrimResult = {
  audio: Float32Array;
  /** Seconds of detected speech (excluding padding). */
  speechSeconds: number;
};

function frameRms(samples: Float32Array, start: number, end: number) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / Math.max(1, end - start));
}

export function trimSilence(
  samples: Float32Array,
  sampleRate: number,
  { frameMs = 30, paddingMs = 150, minRms = 0.01 }: TrimOptions = {},
): TrimResult {
  const frameSize = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const frameCount = Math.floor(samples.length / frameSize);
  if (frameCount === 0) return { audio: new Float32Array(0), speechSeconds: 0 };

  const rms = Array.from({ length: frameCount }, (_, f) =>
    frameRms(samples, f * frameSize, (f + 1) * frameSize),
  );
  // Noise floor = 10th percentile of frame energy; speech must be clearly above it.
  // Capped relative to the loudest frame so a recording with no pauses isn't all dropped.
  const sorted = [...rms].sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.1)]!;
  const peak = sorted[sorted.length - 1]!;
  const threshold = Math.max(minRms, Math.min(noiseFloor * 3, peak * 0.25));

  const speech = rms.map((r) => r >= threshold);
  const pad = Math.round(paddingMs / frameMs);
  const keep = speech.map((_, f) => {
    for (let k = Math.max(0, f - pad); k <= Math.min(frameCount - 1, f + pad); k++) {
      if (speech[k]) return true;
    }
    return false;
  });

  const kept: Float32Array[] = [];
  let total = 0;
  for (let f = 0; f < frameCount; f++) {
    if (!keep[f]) continue;
    const frame = samples.subarray(f * frameSize, (f + 1) * frameSize);
    kept.push(frame);
    total += frame.length;
  }
  const audio = new Float32Array(total);
  let offset = 0;
  for (const frame of kept) {
    audio.set(frame, offset);
    offset += frame.length;
  }

  const speechFrames = speech.filter(Boolean).length;
  return { audio, speechSeconds: (speechFrames * frameSize) / sampleRate };
}
