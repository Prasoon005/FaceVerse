import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <ComingSoon
      title="Tools"
      description="Face compare, privacy blur and group tagging."
      phase={7}
    />
  );
}
