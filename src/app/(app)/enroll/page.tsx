import type { Metadata } from "next";

import { EnrollWizard } from "@/components/enroll/enroll-wizard";
import { ConsentGate } from "@/components/privacy/consent-gate";
import { PageHeader } from "@/components/shared/page-header";
import { getViewer } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Enroll" };

export default async function EnrollPage({ searchParams }: PageProps<"/enroll">) {
  const { person, mode: modeParam } = await searchParams;
  const viewer = await getViewer();
  const { data: profile } = viewer
    ? await viewer.supabase
        .from("profiles")
        .select("consent_given_at")
        .eq("id", viewer.user.id)
        .maybeSingle()
    : { data: null };
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
      <ConsentGate consented={Boolean(profile?.consent_given_at)}>
        <EnrollWizard key={`${personId ?? "new"}-${mode}`} personId={personId} mode={mode} />
      </ConsentGate>
    </div>
  );
}
