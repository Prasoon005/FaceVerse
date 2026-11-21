import { describe, expect, it } from "vitest";

import {
  addDays,
  attendanceRate,
  countWorkdays,
  currentStreak,
  dayStatus,
  eachDay,
  isoWeekday,
  isValidDay,
  leaveDaySet,
  localDay,
  monthRange,
  summarize,
  toCsv,
} from "@/lib/attendance/days";

const MON_SAT = [1, 2, 3, 4, 5, 6];
// 2026-11-16 is a Monday, 2026-11-22 a Sunday.
const base = { today: "2026-11-20", joinedDay: "2026-11-01", workDays: MON_SAT };

describe("day helpers", () => {
  it("formats the local day in a timezone", () => {
    // 20:00 UTC on the 20th is already the 21st in India (UTC+5:30).
    const date = new Date("2026-11-20T20:00:00Z");
    expect(localDay(date, "Asia/Kolkata")).toBe("2026-11-21");
    expect(localDay(date, "UTC")).toBe("2026-11-20");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("computes ISO weekdays", () => {
    expect(isoWeekday("2026-11-16")).toBe(1);
    expect(isoWeekday("2026-11-22")).toBe(7);
  });

  it("lists days inclusively and finds month ranges", () => {
    expect(eachDay("2026-11-29", "2026-12-02")).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
    expect(monthRange("2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02-03")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("validates day strings", () => {
    expect(isValidDay("2026-11-20")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("20-11-2026")).toBe(false);
    expect(isValidDay(undefined)).toBe(false);
  });
});

describe("dayStatus", () => {
  it("marks a check-in as present, even on a day off", () => {
    expect(dayStatus({ ...base, day: "2026-11-22", attendance: { check_in_at: "x" } })).toBe(
      "present",
    );
  });

  it("counts a past working day without check-in as absent", () => {
    expect(dayStatus({ ...base, day: "2026-11-18" })).toBe("absent");
  });

  it("uses the review outcome", () => {
    expect(dayStatus({ ...base, day: "2026-11-18", review: { status: "approved" } })).toBe(
      "excused",
    );
    expect(dayStatus({ ...base, day: "2026-11-18", review: { status: "asked" } })).toBe("pending");
    expect(dayStatus({ ...base, day: "2026-11-18", review: { status: "answered" } })).toBe(
      "pending",
    );
    expect(dayStatus({ ...base, day: "2026-11-18", review: { status: "rejected" } })).toBe(
      "absent",
    );
  });

  it("handles days off, today, the future and days before joining", () => {
    expect(dayStatus({ ...base, day: "2026-11-15" })).toBe("off");
    expect(dayStatus({ ...base, day: "2026-11-20" })).toBe("today");
    expect(dayStatus({ ...base, day: "2026-11-21" })).toBe("upcoming");
    expect(dayStatus({ ...base, day: "2026-10-30" })).toBe("untracked");
  });
});

describe("leave", () => {
  it("marks approved leave on working days, even in the future", () => {
    expect(dayStatus({ ...base, day: "2026-11-18", onLeave: true })).toBe("leave");
    expect(dayStatus({ ...base, day: "2026-11-24", onLeave: true })).toBe("leave");
    expect(dayStatus({ ...base, day: "2026-11-15", onLeave: true })).toBe("off");
    expect(
      dayStatus({ ...base, day: "2026-11-18", onLeave: true, attendance: { check_in_at: "x" } }),
    ).toBe("present");
  });

  it("expands leave ranges and counts working days", () => {
    const days = leaveDaySet([
      { start_day: "2026-11-20", end_day: "2026-11-23" },
      { start_day: "bad", end_day: "2026-11-01" },
    ]);
    expect([...days]).toEqual(["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]);
    expect(countWorkdays("2026-11-20", "2026-11-23", MON_SAT)).toBe(3);
    expect(countWorkdays("2026-11-23", "2026-11-20", MON_SAT)).toBe(0);
  });
});

describe("streak", () => {
  it("counts present days and skips days off and leave", () => {
    expect(
      currentStreak([
        "today",
        "present",
        "off",
        "present",
        "leave",
        "present",
        "absent",
        "present",
      ]),
    ).toBe(3);
    expect(currentStreak(["absent", "present"])).toBe(0);
  });
});

describe("summaries", () => {
  it("counts statuses and the attendance rate", () => {
    const summary = summarize(["present", "present", "absent", "off", "excused"]);
    expect(summary.present).toBe(2);
    expect(summary.off).toBe(1);
    expect(attendanceRate(summary)).toBeCloseTo(0.5);
    expect(attendanceRate(summarize(["off", "upcoming"]))).toBeNull();
  });
});

describe("toCsv", () => {
  it("quotes fields that need it", () => {
    expect(
      toCsv([
        ["Name", "Note"],
        ["Asha", 'Said "hi", left'],
        ["Ravi", null],
      ]),
    ).toBe('Name,Note\r\nAsha,"Said ""hi"", left"\r\nRavi,');
  });
});
