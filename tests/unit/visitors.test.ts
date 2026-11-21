import { describe, expect, it } from "vitest";

import { type VisitRow, visitsToCsv } from "@/lib/data/visitors";

const base: VisitRow = {
  id: "1",
  personId: "p1",
  name: "Asha Verma",
  avatarUrl: null,
  phone: "98765 43210",
  purpose: "Delivery, parcel",
  host: "Room 12",
  checkIn: "2026-11-21T04:30:00.000Z",
  checkOut: "2026-11-21T05:15:00.000Z",
  snapshotPath: null,
};

describe("visitsToCsv", () => {
  it("starts with a BOM so Excel reads UTF-8, and has a header row", () => {
    const csv = visitsToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1)).toBe("Name,Phone,Purpose,Host,Check-in,Check-out,Minutes,Status");
  });

  it("quotes commas and computes minutes and status", () => {
    const [, row] = visitsToCsv([base]).slice(1).split("\r\n");
    expect(row).toContain('"Delivery, parcel"');
    expect(row).toMatch(/,45,Left$/);
  });

  it("marks open visits as inside with no duration", () => {
    const [, row] = visitsToCsv([{ ...base, checkOut: null }])
      .slice(1)
      .split("\r\n");
    expect(row).toMatch(/,,,Inside$/);
  });
});
