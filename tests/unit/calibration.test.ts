import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

import { computeCalibration } from "@/lib/data/recognition";

describe("computeCalibration", () => {
  it("splits pairwise similarities into same-person and different-people", () => {
    const stats = computeCalibration([
      { personId: "a", embedding: [1, 0] },
      { personId: "a", embedding: [1, 0] },
      { personId: "b", embedding: [0, 1] },
    ]);
    expect(stats.people).toBe(2);
    expect(stats.samples).toBe(3);
    expect(stats.samePerson).toEqual({ count: 1, min: 1, mean: 1, max: 1 });
    expect(stats.differentPeople).toEqual({ count: 2, min: 0, mean: 0, max: 0 });
  });

  it("returns null stats when there are no pairs of a kind", () => {
    const stats = computeCalibration([{ personId: "a", embedding: [1, 0] }]);
    expect(stats.samePerson).toBeNull();
    expect(stats.differentPeople).toBeNull();
  });
});
