import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ToolsHub } from "@/components/tools/tools-hub";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tools"
        description="Compare two faces, or blur faces in a photo before sharing it. Nothing leaves your device."
      />
      <ToolsHub />
    </div>
  );
}
