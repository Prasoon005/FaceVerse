import type { Metadata } from "next";

import { EnrollWizard } from "@/components/enroll/enroll-wizard";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Enroll" };

export default async function EnrollPage({ searchParams }: PageProps<"/enroll">) {
  const { person, mode: modeParam } = await searchParams;
  const personId = typeof person === "string" ? person : undefined;
  const mode = modeParam === "voice" ? "voice" : "face";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          personId
            ? mode === "voice"
              ? "Add voice samples"
              : "Add face samples"
            : "Enroll a person"
        }
        description="Guided capture with live quality checks. Everything runs on this device."
      />
      {/* key resets the wizard when switching between new / re-enroll */}
      <EnrollWizard key={`${personId ?? "new"}-${mode}`} personId={personId} mode={mode} />
    </div>
  );
}
