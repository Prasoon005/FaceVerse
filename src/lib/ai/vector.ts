/** Vector helpers shared by the face/voice engines and the Supabase (pgvector) layer. */

export type NumericVector = ArrayLike<number>;

/** L2 norm (Euclidean length). */
export function l2Norm(vector: NumericVector): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    const v = vector[i]!;
    sum += v * v;
  }
  return Math.sqrt(sum);
}

/** Returns a new unit-length copy. A zero vector stays all zeros instead of producing NaN. */
export function normalize(vector: NumericVector): Float32Array {
  const out = new Float32Array(vector.length);
  const norm = l2Norm(vector);
  if (norm === 0 || !Number.isFinite(norm)) return out;
  for (let i = 0; i < vector.length; i++) out[i] = vector[i]! / norm;
  return out;
}

/** Cosine similarity in [-1, 1]. Returns 0 when either vector has zero length. */
export function cosineSimilarity(a: NumericVector, b: NumericVector): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Serialises to pgvector's text format: "[0.1,0.2,...]". */
export function toPgVector(vector: NumericVector, precision = 6): string {
  const parts: string[] = [];
  for (let i = 0; i < vector.length; i++) {
    const v = vector[i]!;
    if (!Number.isFinite(v)) throw new Error(`Non-finite value at index ${i}`);
    // Number(...) drops trailing zeros: 0.500000 -> 0.5
    parts.push(String(Number(v.toFixed(precision))));
  }
  return `[${parts.join(",")}]`;
}

/** Parses pgvector text ("[0.1,0.2]") back into numbers. */
export function parsePgVector(text: string): Float32Array {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error("Invalid pgvector string");
  }
  const body = trimmed.slice(1, -1).trim();
  if (body === "") return new Float32Array(0);
  return Float32Array.from(body.split(",").map((s) => Number(s)));
}
