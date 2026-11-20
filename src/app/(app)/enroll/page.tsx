import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Enroll" };

export default function EnrollPage() {
  return (
    <ComingSoon
      title="Enroll"
      description="Add a person with guided face and voice capture."
      phase={2}
    />
  );
}
