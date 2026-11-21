import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LiveUpdates } from "@/components/admin/live-updates";
import {
  type ChangeRequestSummary,
  IdentityCard,
  type IdentitySummary,
} from "@/components/identity/identity-card";
import { IdentityWizard } from "@/components/identity/identity-wizard";
import { PageHeader } from "@/components/shared/page-header";
import { getViewer } from "@/lib/admin/server";

export const metadata: Metadata = { title: "My identity" };

const LIVE_TABLES = ["people", "identity_change_requests"];

/**
 * The user's own biometric identity. No identity (or unlocked by an admin / rejected) → the
 * enrollment wizard; otherwise the locked identity card with its status and change requests.
 */
export default async function IdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user } = viewer;

  const [{ data: people }, { data: requests }] = await Promise.all([
    supabase
      .from("people_overview")
      .select("*")
      .eq("owner_id", user.id)
      .eq("linked_user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("identity_change_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const identity =
    (people ?? []).find((p) => p.biometrics_locked) ??
    (people ?? []).find((p) => p.approval_status === "approved") ??
    people?.[0] ??
    null;
  const approvedChange = (requests ?? []).some((r) => r.status === "approved");
  const showWizard = !identity || !identity.biometrics_locked;

  let avatarUrl: string | null = null;
  if (identity?.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(identity.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  const summary: IdentitySummary | null = identity
    ? {
        name: identity.name,
        avatarUrl,
        faceSamples: identity.face_samples,
        voiceSamples: identity.voice_samples,
        approvalStatus: identity.approval_status,
        reviewNote: identity.review_note,
        lockedAt: identity.locked_at,
        reviewedAt: identity.reviewed_at,
      }
    : null;
  const history: ChangeRequestSummary[] = (requests ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    decisionNote: r.decision_note,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My identity"
        description="Your face and voice, used for attendance and biometric login."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      {showWizard && identity?.approval_status === "rejected" ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm">
          Your admin rejected your last enrollment
          {identity.review_note ? `: “${identity.review_note}”` : "."} Please enroll again.
        </p>
      ) : null}
      {showWizard ? (
        <IdentityWizard isChange={approvedChange || Boolean(identity)} />
      ) : summary ? (
        <IdentityCard identity={summary} requests={history} />
      ) : null}
    </div>
  );
}
