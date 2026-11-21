import { describe, expect, it } from "vitest";

import { dayStatus } from "@/lib/attendance/days";
import {
  computeScore,
  DEFAULT_RULES,
  formatClock,
  lateMinutes,
  parseClock,
  scoreGrade,
} from "@/lib/attendance/score";

const office = { timezone: "Asia/Kolkata", work_start: "09:30", late_grace_minutes: 15 };
// 04:14 UTC = 09:44 IST; 04:20 UTC = 09:50 IST.
const ist = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const utc = h! * 60 + m! - 330;
  return `2026-11-20T${String(Math.floor(utc / 60)).padStart(2, "0")}:${String(utc % 60).padStart(2, "0")}:00.000Z`;
};

describe("clock helpers", () => {
  it("parses and formats HH:MM", () => {
    expect(parseClock("09:30")).toBe(570);
    expect(parseClock("09:30:00")).toBe(570);
    expect(formatClock(570)).toBe("09:30");
  });
});

describe("lateMinutes", () => {
  it("is 0 within the grace period and counts from the start time after it", () => {
    expect(lateMinutes(ist("09:20"), office)).toBe(0);
    expect(lateMinutes(ist("09:44"), office)).toBe(0);
    expect(lateMinutes(ist("09:45"), office)).toBe(0);
    expect(lateMinutes(ist("09:50"), office)).toBe(20);
    expect(lateMinutes(ist("11:00"), office)).toBe(90);
  });
});

describe("dayStatus with lateness", () => {
  const base = { today: "2026-11-20", joinedDay: "2026-11-01", workDays: [1, 2, 3, 4, 5, 6] };
  it("marks a late check-in as late, and an approved late reason as present", () => {
    const attendance = { check_in_at: "x" };
    expect(dayStatus({ ...base, day: "2026-11-18", attendance, late: true })).toBe("late");
    expect(
      dayStatus({
        ...base,
        day: "2026-11-18",
        attendance,
        late: true,
        review: { status: "approved" },
      }),
    ).toBe("present");
  });
});

describe("computeScore", () => {
  it("deducts per the rules and never goes below zero", () => {
    const result = computeScore(
      [
        { day: "d1", status: "absent", lateBy: 0, reviewStatus: null },
        { day: "d2", status: "absent", lateBy: 0, reviewStatus: "rejected" },
        { day: "d3", status: "excused", lateBy: 0, reviewStatus: "approved" },
        { day: "d4", status: "late", lateBy: 20, reviewStatus: null },
        { day: "d5", status: "present", lateBy: 25, reviewStatus: "approved" },
        { day: "d6", status: "late", lateBy: 30, reviewStatus: "answered" },
        { day: "d7", status: "pending", lateBy: 0, reviewStatus: "asked" },
        { day: "d8", status: "leave", lateBy: 0, reviewStatus: null },
        { day: "d9", status: "present", lateBy: 0, reviewStatus: null },
      ],
      DEFAULT_RULES,
    );
    expect(result.deductions.map((d) => [d.day, d.kind, d.points])).toEqual([
      ["d1", "absent", 10],
      ["d2", "absent", 10],
      ["d4", "late", 2],
    ]);
    expect(result.score).toBe(78);
    expect(result.pending).toBe(2);

    const harsh = computeScore(
      Array.from({ length: 20 }, (_, i) => ({
        day: `x${i}`,
        status: "absent" as const,
        lateBy: 0,
        reviewStatus: null,
      })),
      DEFAULT_RULES,
    );
    expect(harsh.score).toBe(0);
  });

  it("uses the excused deductions when the company sets them", () => {
    const result = computeScore(
      [
        { day: "d1", status: "excused", lateBy: 0, reviewStatus: "approved" },
        { day: "d2", status: "present", lateBy: 40, reviewStatus: "approved" },
      ],
      { ...DEFAULT_RULES, deduct_excused: 3, deduct_late_excused: 0.5 },
    );
    expect(result.score).toBe(96.5);
  });
});

describe("scoreGrade", () => {
  it("grades by share of the base", () => {
    expect(scoreGrade(100, 100)).toBe("excellent");
    expect(scoreGrade(88, 100)).toBe("good");
    expect(scoreGrade(75, 100)).toBe("warning");
    expect(scoreGrade(40, 100)).toBe("poor");
  });
});
