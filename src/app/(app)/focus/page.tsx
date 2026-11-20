import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Focus" };

export default function FocusPage() {
  return (
    <ComingSoon
      title="Focus"
      description="Track focus and drowsiness while you study or work."
      phase={7}
    />
  );
}
