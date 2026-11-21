/** Face matching (pgvector RPC) and throttled recognition event logging. */
import { classifyFaceMatch, type MatchStatus, recognitionConfig } from "@/config/recognition";
import { cosineSimilarity, parsePgVector, toPgVector } from "@/lib/ai/vector";
import { createClient } from "@/lib/supabase/client";
import type { RecognitionEvent } from "@/types/database";

export type FaceMatch = {
  status: MatchStatus;
  personId: string | null;
  name: string | null;
  similarity: number | null;
  /** Closest other person, for the margin rule and the debug scores panel. */
  runnerUp: { name: string; similarity: number } | null;
};

/** Best match for one embedding among the caller's enrolled people. */
export async function matchFace(embedding: Float32Array): Promise<FaceMatch> {
  const { data, error } = await createClient().rpc("match_faces", {
    query: toPgVector(embedding),
    // Top two people regardless of score; classify locally (threshold + margin).
    match_threshold: -1,
    match_count: 2,
  });
  if (error) throw error;
  const [best, second] = data ?? [];
  if (!best) {
    return { status: "unknown", personId: null, name: null, similarity: null, runnerUp: null };
  }
  return {
    status: classifyFaceMatch(best.similarity, second?.similarity),
    personId: best.person_id,
    name: best.name,
    similarity: best.similarity,
    runnerUp: second ? { name: second.name, similarity: second.similarity } : null,
  };
}

export type SimilarityStats = { count: number; min: number; mean: number; max: number };

export type CalibrationStats = {
  people: number;
  samples: number;
  /** Between samples of the same person (should be high). */
  samePerson: SimilarityStats | null;
  /** Between samples of different people (should be clearly lower). */
  differentPeople: SimilarityStats | null;
};

function stats(values: number[]): SimilarityStats | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    mean: sum / values.length,
    max: Math.max(...values),
  };
}

/** Pairwise similarities of the given samples, split into same-person and different-people. */
export function computeCalibration(
  samples: { personId: string; embedding: ArrayLike<number> }[],
): CalibrationStats {
  const same: number[] = [];
  const different: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const sim = cosineSimilarity(samples[i]!.embedding, samples[j]!.embedding);
      (samples[i]!.personId === samples[j]!.personId ? same : different).push(sim);
    }
  }
  return {
    people: new Set(samples.map((s) => s.personId)).size,
    samples: samples.length,
    samePerson: stats(same),
    differentPeople: stats(different),
  };
}

/** Loads the caller's enrolled face samples and summarises how well they separate. */
export async function getCalibrationStats(): Promise<CalibrationStats> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("face_embeddings")
    .select("person_id, embedding")
    .eq("owner_id", session.session?.user.id ?? "");
  if (error) throw error;
  return computeCalibration(
    data.map((row) => ({ personId: row.person_id, embedding: parsePgVector(row.embedding) })),
  );
}

/**
 * Writes recognition_events with the spec's throttle: at most one row per person
 * per `logThrottleMs` for this logger instance (one instance = one live session).
 */
export function createRecognitionLogger(source: RecognitionEvent["source"]) {
  const lastLogged = new Map<string, number>();
  let userId: string | null = null;

  return async function log(personId: string | null, similarity: number | null, key?: string) {
    const throttleKey = personId ?? `unknown:${key ?? "x"}`;
    const now = Date.now();
    const previous = lastLogged.get(throttleKey);
    if (previous !== undefined && now - previous < recognitionConfig.live.logThrottleMs) return;
    lastLogged.set(throttleKey, now);

    const supabase = createClient();
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id ?? null;
    }
    if (!userId) return;
    await supabase.from("recognition_events").insert({
      owner_id: userId,
      person_id: personId,
      similarity,
      source,
    });
  };
}
