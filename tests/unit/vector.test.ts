import { describe, expect, it } from "vitest";

import { cosineSimilarity, l2Norm, normalize, parsePgVector, toPgVector } from "@/lib/ai/vector";

describe("l2Norm", () => {
  it("computes the euclidean length", () => {
    expect(l2Norm([3, 4])).toBe(5);
    expect(l2Norm([])).toBe(0);
  });
});

describe("normalize", () => {
  it("returns a unit vector pointing the same way", () => {
    const v = normalize([3, 4]);
    expect(v).toBeInstanceOf(Float32Array);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
    expect(l2Norm(v)).toBeCloseTo(1, 6);
  });

  it("keeps a zero vector as zeros (no NaN)", () => {
    expect(Array.from(normalize([0, 0, 0]))).toEqual([0, 0, 0]);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    normalize(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("normalises a 1024-d vector", () => {
    const v = normalize(Array.from({ length: 1024 }, (_, i) => Math.sin(i)));
    expect(v).toHaveLength(1024);
    expect(l2Norm(v)).toBeCloseTo(1, 5);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical direction regardless of magnitude", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });

  it("is 0 for orthogonal and -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  it("is symmetric", () => {
    const a = [0.3, -0.2, 0.9];
    const b = [0.1, 0.5, 0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });

  it("returns 0 when a vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("throws on length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });

  it("matches the dot product for normalised vectors", () => {
    const a = normalize([1, 2, 3]);
    const b = normalize([3, 2, 1]);
    const dot = a.reduce((sum, x, i) => sum + x * b[i]!, 0);
    expect(cosineSimilarity(a, b)).toBeCloseTo(dot, 6);
  });
});

describe("toPgVector / parsePgVector", () => {
  it("serialises to pgvector text format", () => {
    expect(toPgVector([0.1, 0.5, -1])).toBe("[0.1,0.5,-1]");
  });

  it("rounds to the given precision", () => {
    expect(toPgVector([0.123456789], 3)).toBe("[0.123]");
  });

  it("works with Float32Array", () => {
    expect(toPgVector(new Float32Array([0.25, 0.75]))).toBe("[0.25,0.75]");
  });

  it("rejects NaN and Infinity", () => {
    expect(() => toPgVector([1, Number.NaN])).toThrow(/Non-finite/);
    expect(() => toPgVector([Infinity])).toThrow(/Non-finite/);
  });

  it("round-trips", () => {
    const original = normalize([1, 2, 3, 4]);
    const parsed = parsePgVector(toPgVector(original));
    parsed.forEach((v, i) => expect(v).toBeCloseTo(original[i]!, 5));
  });

  it("parses empty and rejects malformed strings", () => {
    expect(parsePgVector("[]")).toHaveLength(0);
    expect(() => parsePgVector("0.1,0.2")).toThrow(/Invalid/);
  });
});
