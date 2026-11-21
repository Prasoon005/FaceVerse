import { describe, expect, it } from "vitest";

import { distanceMetres } from "@/lib/attendance/geo";

describe("distanceMetres", () => {
  it("is zero for the same point", () => {
    expect(distanceMetres({ lat: 28.6, lng: 77.2 }, { lat: 28.6, lng: 77.2 })).toBe(0);
  });

  it("matches a known distance (Delhi to Agra, about 178 km)", () => {
    const d = distanceMetres({ lat: 28.6139, lng: 77.209 }, { lat: 27.1767, lng: 78.0081 });
    expect(d).toBeGreaterThan(175_000);
    expect(d).toBeLessThan(182_000);
  });

  it("measures short distances in metres", () => {
    // ~0.001 degrees of latitude is about 111 m.
    const d = distanceMetres({ lat: 28.6, lng: 77.2 }, { lat: 28.601, lng: 77.2 });
    expect(Math.round(d)).toBeGreaterThan(105);
    expect(Math.round(d)).toBeLessThan(117);
  });
});
