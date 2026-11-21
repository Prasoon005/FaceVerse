import type { Metadata } from "next";

import { LiveUpdates } from "@/components/admin/live-updates";
import { ReviewBoard, type ReviewItem } from "@/components/admin/review-board";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, signPaths } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { lateMinutes } from "@/lib/attendance/score";

export const metadata: Metadata = { title: "Absence & late reviews" };

export default async function AdminReviewsPage() {
  const { admin } = await requireAdminPage();
  const [{ data: reviews }, users] = await Promise.all([
    admin.from("absence_reviews").select("*").order("created_at", { ascending: false }).limit(300),
    listWorkspaceUsers(admin),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  // Check-in times for late reasons, to show how late they were.
  const lateReviews = (reviews ?? []).filter((r) => r.kind === "late");
  const [settings, { data: lateRows }] = await Promise.all([
    getAttendanceSettings(admin),
    lateReviews.length
      ? admin
          .from("attendance")
          .select("user_id, day, check_in_at")
          .in("day", [...new Set(lateReviews.map((r) => r.day))])
      : Promise.resolve({ data: [] as { user_id: string; day: string; check_in_at: string }[] }),
  ]);
  const checkIn = new Map((lateRows ?? []).map((a) => [`${a.user_id}:${a.day}`, a.check_in_at]));
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
    kind: r.kind,
    lateBy:
      r.kind === "late" && checkIn.get(`${r.user_id}:${r.day}`)
        ? lateMinutes(checkIn.get(`${r.user_id}:${r.day}`)!, settings)
        : 0,
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
        title="Absence & late reviews"
        description="Reasons for absences and late arrivals. Approve (no deduction per your norms) or reject (points are deducted)."
        actions={<LiveUpdates />}
      />
      <ReviewBoard items={items} />
    </div>
  );
}
