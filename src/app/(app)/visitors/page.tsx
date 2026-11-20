import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Visitors" };

export default function VisitorsPage() {
  return (
    <ComingSoon
      title="Visitors"
      description="Recognise returning visitors and log check-ins."
      phase={4}
    />
  );
}
