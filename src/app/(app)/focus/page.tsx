import type { Metadata } from "next";

import { FocusTracker } from "@/components/focus/focus-tracker";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Focus" };

export default function FocusPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Focus"
        description="Study or work with the camera on: see your focus score and get an alert when you look sleepy."
      />
      <FocusTracker />
    </div>
  );
}
