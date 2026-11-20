import { describe, expect, it } from "vitest";

import { playFeedback } from "@/lib/audio/feedback";
import { useSoundStore } from "@/stores/sound-store";

describe("sound store", () => {
  it("is on by default and toggles", () => {
    expect(useSoundStore.getState().enabled).toBe(true);
    useSoundStore.getState().toggle();
    expect(useSoundStore.getState().enabled).toBe(false);
    useSoundStore.getState().toggle();
    expect(useSoundStore.getState().enabled).toBe(true);
  });
});

describe("playFeedback", () => {
  it("does nothing (and doesn't throw) where Web Audio is unavailable", () => {
    expect(() => playFeedback("success")).not.toThrow();
  });
});
