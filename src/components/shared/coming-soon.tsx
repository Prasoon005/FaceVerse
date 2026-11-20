import Link from "next/link";

import { Button } from "@/components/ui/button";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Placeholder for (app) pages whose real implementation lands in a later phase. */
export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`Arriving in Phase ${phase}`}
        description="This module is on the roadmap. The navigation is wired up so you can see where it will live."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
