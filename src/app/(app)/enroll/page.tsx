import type { Metadata } from "next";

import { EnrollWizard } from "@/components/enroll/enroll-wizard";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Enroll" };

export default async function EnrollPage({ searchParams }: PageProps<"/enroll">) {
  const { person } = await searchParams;
  const personId = typeof person === "string" ? person : undefined;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={personId ? "Add face samples" : "Enroll a person"}
        description="Guided capture with live quality checks. Everything runs on this device."
      />
      {/* key resets the wizard when switching between new / re-enroll */}
      <EnrollWizard key={personId ?? "new"} personId={personId} />
    </div>
  );
}
