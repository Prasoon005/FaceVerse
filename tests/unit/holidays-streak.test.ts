import { describe, expect, it } from "vitest";

import { passwordStrength } from "@/components/auth/password-strength";
import { bestStreak, currentStreak, dayStatus } from "@/lib/attendance/days";

const base = {
  today: "2026-11-20",
  joinedDay: "2026-01-01",
  workDays: [1, 2, 3, 4, 5, 6],
};

describe("holidays", () => {
  it("marks a workday holiday as holiday, not absent", () => {
    // 2026-11-09 is a Monday.
    expect(dayStatus({ ...base, day: "2026-11-09", holidays: { "2026-11-09": "Diwali" } })).toBe(
      "holiday",
    );
    expect(dayStatus({ ...base, day: "2026-11-09" })).toBe("absent");
  });

  it("still counts attendance on a holiday", () => {
    expect(
      dayStatus({
        ...base,
        day: "2026-11-09",
        holidays: { "2026-11-09": "Diwali" },
        attendance: { check_in_at: "2026-11-09T04:00:00Z" },
      }),
    ).toBe("present");
  });

  it("approved leave wins over a holiday", () => {
    expect(
      dayStatus({
        ...base,
        day: "2026-11-09",
        holidays: { "2026-11-09": "Diwali" },
        onLeave: true,
      }),
    ).toBe("leave");
  });
});

describe("streaks", () => {
  it("holidays don't break the current streak", () => {
    expect(currentStreak(["present", "holiday", "late", "off", "present", "absent"])).toBe(3);
  });

  it("finds the best streak", () => {
    expect(
      bestStreak(["present", "present", "absent", "present", "holiday", "present", "present"]),
    ).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe("passwordStrength", () => {
  it("scores 0 to 4", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("short")).toBe(0);
    expect(passwordStrength("longenough")).toBe(1);
    expect(passwordStrength("LongEnough12!")).toBe(4);
  });
});
