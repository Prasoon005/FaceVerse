/** Server-side dashboard queries (run as the signed-in user, RLS-scoped). */
import { createClient } from "@/lib/supabase/server";

export type DailyPoint = { date: string; recognised: number; unknown: number };

export type ActivityItem = {
  id: string;
  personId: string | null;
  name: string | null;
  similarity: number | null;
  source: string;
  createdAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

/** Buckets events into the last `days` calendar days (UTC), oldest first. */
export function bucketByDay(
  events: { created_at: string; person_id: string | null }[],
  now: Date = new Date(),
  days = CHART_DAYS,
): DailyPoint[] {
  const points = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    points.set(date, { date, recognised: 0, unknown: 0 });
  }
  for (const e of events) {
    const point = points.get(e.created_at.slice(0, 10));
    if (!point) continue;
    if (e.person_id) point.recognised += 1;
    else point.unknown += 1;
  }
  return [...points.values()];
}

export async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS).toISOString();
  const chartStart = new Date(now.getTime() - CHART_DAYS * DAY_MS).toISOString();

  const [people, recognised, unknown, series, recent] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }),
    supabase
      .from("recognition_events")
      .select("id", { count: "exact", head: true })
      .not("person_id", "is", null)
      .gte("created_at", dayAgo),
    supabase
      .from("recognition_events")
      .select("id", { count: "exact", head: true })
      .is("person_id", null)
      .gte("created_at", dayAgo),
    supabase
      .from("recognition_events")
      .select("created_at, person_id")
      .gte("created_at", chartStart)
      .order("created_at", { ascending: true })
      .limit(5000),
    supabase
      .from("recognition_events")
      .select("id, person_id, similarity, source, created_at, people(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    stats: {
      people: people.count ?? 0,
      recognisedToday: recognised.count ?? 0,
      unknownToday: unknown.count ?? 0,
      visitorsToday: 0, // visitor log arrives in Phase 4
    },
    series: bucketByDay(series.data ?? [], now),
    activity: (recent.data ?? []).map<ActivityItem>((e) => ({
      id: e.id,
      personId: e.person_id,
      name: e.people?.name ?? null,
      similarity: e.similarity,
      source: e.source,
      createdAt: e.created_at,
    })),
  };
}
