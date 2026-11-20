"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { StepperRail } from "@/components/shared/stepper-rail";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addFaceSamples,
  createPerson,
  getPerson,
  logAudit,
  peopleKeys,
  uploadAvatar,
} from "@/lib/data/people";
import type { PersonInput } from "@/lib/validations/person";

import { DetailsStep } from "./details-step";
import { DoneStep } from "./done-step";
import { type CapturedSample, FaceCaptureStep } from "./face-capture-step";
import { ReviewStep } from "./review-step";

type StepId = "details" | "face" | "voice" | "review" | "done";

/**
 * Enrollment wizard (PROJECT_SPEC §8 screen 4). With `personId` it adds samples to
 * an existing person ("re-enroll") and skips the details step.
 */
export function EnrollWizard({ personId }: { personId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: peopleKeys.detail(personId ?? ""),
    queryFn: () => getPerson(personId!),
    enabled: Boolean(personId),
  });

  const [step, setStep] = useState<StepId>(personId ? "face" : "details");
  const [details, setDetails] = useState<PersonInput | null>(null);
  const [samples, setSamples] = useState<CapturedSample[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);

  const steps = [
    ...(personId ? [] : [{ id: "details", label: "Details" }]),
    { id: "face", label: "Face" },
    { id: "voice", label: "Voice", note: "Phase 3", disabled: true },
    { id: "review", label: "Review" },
    { id: "done", label: "Done" },
  ];

  function reset() {
    samples.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSamples([]);
    setDetails(null);
    setSaved(null);
    if (personId) router.replace("/enroll");
    setStep("details");
  }

  async function save({ saveAvatar }: { saveAvatar: boolean }) {
    setSaving(true);
    try {
      let id = personId;
      let name = existing.data?.person.name ?? "";
      if (!id) {
        if (!details) throw new Error("Missing person details");
        const person = await createPerson(details);
        id = person.id;
        name = person.name;
      }
      await addFaceSamples(
        id,
        samples.map((s) => ({ embedding: s.embedding, quality: s.quality })),
      );
      if (saveAvatar && samples[0]) {
        // A failed thumbnail upload shouldn't lose the enrollment itself.
        await uploadAvatar(id, samples[0].thumbnail).catch(() =>
          toast.warning("Saved, but the profile photo couldn't be uploaded."),
        );
      }
      await logAudit(personId ? "person.add_samples" : "person.enroll", id, {
        samples: samples.length,
      });
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      setSaved({ id, name });
      setStep("done");
    } catch (err) {
      toast.error("Couldn't save enrollment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (personId && existing.isPending) {
    return <Skeleton className="h-96 rounded-xl" />;
  }
  if (personId && !existing.data) {
    return (
      <EmptyState
        title="Person not found"
        description="They may have been deleted. Start a new enrollment instead."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <StepperRail steps={steps} current={step} />

      {step === "details" ? (
        <DetailsStep
          defaultValues={details ?? undefined}
          onNext={(values) => {
            setDetails(values);
            setStep("face");
          }}
        />
      ) : null}

      {step === "face" ? (
        <FaceCaptureStep
          onBack={() => (personId ? router.push(`/people/${personId}`) : setStep("details"))}
          onComplete={(captured) => {
            setSamples(captured);
            setStep("review");
          }}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          details={details}
          existingName={existing.data?.person.name}
          samples={samples}
          defaultSaveAvatar={!existing.data?.person.avatar_path}
          saving={saving}
          onBack={() => setStep("face")}
          onSave={save}
        />
      ) : null}

      {step === "done" && saved ? (
        <DoneStep name={saved.name} personId={saved.id} onEnrollAnother={reset} />
      ) : null}
    </div>
  );
}
