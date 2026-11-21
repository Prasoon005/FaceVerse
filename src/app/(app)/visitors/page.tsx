import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { VisitorsView } from "@/components/visitors/visitors-view";

export const metadata: Metadata = { title: "Visitors" };

export default function VisitorsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Visitors"
        description="Scan a visitor: returning ones are recognised and checked in with one click, new ones get a quick form."
      />
      <VisitorsView />
    </div>
  );
}
