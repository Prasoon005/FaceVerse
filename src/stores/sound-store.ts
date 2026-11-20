import { create } from "zustand";
import { persist } from "zustand/middleware";

type SoundState = {
  enabled: boolean;
  toggle: () => void;
};

/** App-wide UI sound preference, remembered per browser. */
export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: "faceverse-sound-pref" },
  ),
);
