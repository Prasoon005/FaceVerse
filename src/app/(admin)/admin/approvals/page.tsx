import type { Metadata } from "next";

import { ApprovalQueue, type ApprovalItem } from "@/components/admin/approval-queue";
import { LiveUpdates } from "@/components/admin/live-updates";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, signPaths } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Approvals" };

export default async function AdminApprovalsPage() {
  const { admin } = await requireAdminPage();

  const [{ data: people }, users] = await Promise.all([
    admin
      .from("people_overview")
      .select("*")
      .not("linked_user_id", "is", null)
      .order("created_at", { ascending: false }),
    listWorkspaceUsers(admin),
  ]);

  // Only self-enrollments (a person the user linked to their own account) need approval.
  const own = (people ?? []).filter((p) => p.linked_user_id === p.owner_id);
  const urls = await signPaths(
    admin,
    "avatars",
    own.map((p) => p.avatar_path),
  );
  const userById = new Map(users.map((u) => [u.id, u]));

  const items: ApprovalItem[] = own.map((p) => ({
    personId: p.id,
    name: p.name,
    email: userById.get(p.owner_id)?.email ?? "",
    avatarUrl: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null,
    faceSamples: p.face_samples,
    voiceSamples: p.voice_samples,
    createdAt: p.created_at,
    status: p.approval_status,
    note: p.review_note,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Approvals"
        description="Users enroll their own face; approve it before it counts for attendance and biometric login."
        actions={<LiveUpdates />}
      />
      <ApprovalQueue items={items} />
    </div>
  );
}
