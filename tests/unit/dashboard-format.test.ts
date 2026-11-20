import { describe, expect, it, vi } from "vitest";

import { formatPercent, formatRelative } from "@/lib/format";

// dashboard.ts imports the server Supabase client; only the pure helper is under test.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const { bucketByDay } = await import("@/lib/data/dashboard");

describe("bucketByDay", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("returns one zeroed point per day, oldest first", () => {
    const points = bucketByDay([], now, 3);
    expect(points.map((p) => p.date)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
    expect(points.every((p) => p.recognised === 0 && p.unknown === 0)).toBe(true);
  });

  it("counts recognised vs unknown events and ignores out-of-range ones", () => {
    const points = bucketByDay(
      [
        { created_at: "2026-11-20T08:00:00Z", person_id: "a" },
        { created_at: "2026-11-20T09:00:00Z", person_id: null },
        { created_at: "2026-11-19T09:00:00Z", person_id: "b" },
        { created_at: "2026-10-01T09:00:00Z", person_id: "c" },
      ],
      now,
      2,
    );
    expect(points).toEqual([
      { date: "2026-11-19", recognised: 1, unknown: 0 },
      { date: "2026-11-20", recognised: 1, unknown: 1 },
    ]);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("formats past times relatively", () => {
    expect(formatRelative("2026-11-20T11:59:30Z", now)).toBe("just now");
    expect(formatRelative("2026-11-20T11:55:00Z", now)).toBe("5 minutes ago");
    expect(formatRelative("2026-11-19T12:00:00Z", now)).toBe("yesterday");
  });

  it("handles missing dates", () => {
    expect(formatRelative(null, now)).toBe("Never");
  });
});

describe("formatPercent", () => {
  it("rounds and handles null", () => {
    expect(formatPercent(0.876)).toBe("88%");
    expect(formatPercent(null)).toBe("—");
  });
});
