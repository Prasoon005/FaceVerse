import type { Metadata } from "next";

import { LiveRecognition } from "@/components/live/live-recognition";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Live recognition" };

export default function LivePage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Live recognition"
        description="Every face in frame is matched against your enrolled people, on this device."
      />
      <LiveRecognition />
    </div>
  );
}
