import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Live recognition" };

export default function LivePage() {
  return (
    <ComingSoon
      title="Live recognition"
      description="Recognise every face in frame in real time."
      phase={2}
    />
  );
}
