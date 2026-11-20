import { describe, expect, it } from "vitest";

import { downmix, resampleLinear } from "@/lib/audio/resample";
import { trimSilence } from "@/lib/audio/vad";

const RATE = 16_000;

function tone(seconds: number, amplitude = 0.3, freq = 200) {
  return Float32Array.from(
    { length: Math.round(seconds * RATE) },
    (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / RATE),
  );
}

function concat(...parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

describe("downmix", () => {
  it("averages channels", () => {
    expect(Array.from(downmix([Float32Array.of(1, 0), Float32Array.of(0, 1)]))).toEqual([0.5, 0.5]);
  });

  it("passes a single channel through", () => {
    const mono = Float32Array.of(0.1, 0.2);
    expect(downmix([mono])).toBe(mono);
  });
});

describe("resampleLinear", () => {
  it("changes the length by the rate ratio", () => {
    expect(resampleLinear(new Float32Array(48_000), 48_000, 16_000)).toHaveLength(16_000);
    expect(resampleLinear(new Float32Array(100), 8_000, 16_000)).toHaveLength(200);
  });

  it("interpolates between samples", () => {
    expect(Array.from(resampleLinear(Float32Array.of(0, 1), 1, 2))).toEqual([0, 0.5, 1, 1]);
  });

  it("returns the input unchanged when the rates match", () => {
    const input = Float32Array.of(1, 2, 3);
    expect(resampleLinear(input, RATE, RATE)).toBe(input);
  });
});

describe("trimSilence", () => {
  it("drops leading and trailing silence and measures speech", () => {
    const audio = concat(new Float32Array(RATE), tone(2.5), new Float32Array(RATE));
    const { audio: trimmed, speechSeconds } = trimSilence(audio, RATE);
    expect(speechSeconds).toBeGreaterThan(2.3);
    expect(speechSeconds).toBeLessThan(2.7);
    // 2.5 s of speech plus a little padding, not the 4.5 s input.
    expect(trimmed.length / RATE).toBeLessThan(3);
  });

  it("keeps a recording that is speech all the way through", () => {
    expect(trimSilence(tone(3), RATE).speechSeconds).toBeGreaterThan(2.9);
  });

  it("finds no speech in silence or very quiet noise", () => {
    expect(trimSilence(new Float32Array(RATE * 2), RATE).speechSeconds).toBe(0);
    expect(trimSilence(tone(2, 0.002), RATE).speechSeconds).toBe(0);
  });

  it("handles empty input", () => {
    expect(trimSilence(new Float32Array(0), RATE)).toEqual({
      audio: new Float32Array(0),
      speechSeconds: 0,
    });
  });
});
