import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <ComingSoon title="Activity" description="Audit trail and recognition history." phase={6} />
  );
}
