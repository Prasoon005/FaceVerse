import type { Metadata } from "next";

import { LiveUpdates } from "@/components/admin/live-updates";
import { ReviewBoard, type ReviewItem } from "@/components/admin/review-board";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, signPaths } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Absence reviews" };

export default async function AdminReviewsPage() {
  const { admin } = await requireAdminPage();
  const [{ data: reviews }, users] = await Promise.all([
    admin.from("absence_reviews").select("*").order("created_at", { ascending: false }).limit(300),
    listWorkspaceUsers(admin),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const proofUrls = await signPaths(
    admin,
    "absence-proofs",
    (reviews ?? []).map((r) => r.proof_path),
  );

  const items: ReviewItem[] = (reviews ?? []).map((r) => ({
    id: r.id,
    name: userById.get(r.user_id)?.name ?? "Deleted user",
    email: userById.get(r.user_id)?.email ?? "",
    day: r.day,
    status: r.status,
    question: r.question,
    reason: r.reason,
    proofUrl: r.proof_path ? (proofUrls.get(r.proof_path) ?? null) : null,
    proofIsPdf: r.proof_path?.endsWith(".pdf") ?? false,
    decisionNote: r.decision_note,
    askedAt: r.asked_at,
    answeredAt: r.answered_at,
    decidedAt: r.decided_at,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Absence reviews"
        description="Ask for reasons, read replies and proof, then approve (excused) or reject."
        actions={<LiveUpdates />}
      />
      <ReviewBoard items={items} />
    </div>
  );
}
