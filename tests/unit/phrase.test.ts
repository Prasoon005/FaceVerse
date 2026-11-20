import { describe, expect, it } from "vitest";

import {
  generatePhrase,
  normalizeTranscript,
  PHRASE_WORDS,
  phraseMatchScore,
  phrasePassed,
} from "@/lib/audio/phrase";

/** Deterministic PRNG for repeatable phrases. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const phrase = { words: ["river", "candle", "orange"], digits: ["4", "7"], text: "" };

describe("generatePhrase", () => {
  it("returns 3 distinct curated words and 2 digits", () => {
    for (let seed = 1; seed < 50; seed++) {
      const p = generatePhrase(seeded(seed));
      expect(p.words).toHaveLength(3);
      expect(new Set(p.words).size).toBe(3);
      p.words.forEach((w) => expect(PHRASE_WORDS).toContain(w));
      p.digits.forEach((d) => expect(d).toMatch(/^\d$/));
      expect(p.text).toBe([...p.words, ...p.digits].join(" "));
    }
  });
});

describe("normalizeTranscript", () => {
  it("lower-cases, strips punctuation and maps numbers to digits", () => {
    expect(normalizeTranscript("River, candle! Orange four SEVEN.")).toEqual([
      "river",
      "candle",
      "orange",
      "4",
      "7",
    ]);
  });

  it("splits digit runs", () => {
    expect(normalizeTranscript("orange 47")).toEqual(["orange", "4", "7"]);
  });
});

describe("phraseMatchScore", () => {
  it("is 1 for an exact transcript", () => {
    expect(phraseMatchScore(phrase, "river candle orange 4 7")).toBe(1);
  });

  it("tolerates small slips on longer words", () => {
    expect(phraseMatchScore(phrase, "rivers candles oranges for seven")).toBe(1);
  });

  it("counts missing tokens", () => {
    expect(phraseMatchScore(phrase, "river candle")).toBeCloseTo(0.4);
    expect(phraseMatchScore(phrase, "something else entirely")).toBe(0);
  });

  it("counts each heard token only once", () => {
    const repeated = { words: ["river", "river", "river"], digits: ["1", "1"], text: "" };
    expect(phraseMatchScore(repeated, "river 1")).toBeCloseTo(0.4);
  });

  it("needs digits to match exactly", () => {
    expect(phraseMatchScore(phrase, "river candle orange 5 8")).toBeCloseTo(0.6);
  });
});

describe("phrasePassed", () => {
  it("passes at 70% and when transcription was unavailable", () => {
    expect(phrasePassed(0.8)).toBe(true);
    expect(phrasePassed(0.6)).toBe(false);
    expect(phrasePassed(null)).toBe(true);
  });
});
