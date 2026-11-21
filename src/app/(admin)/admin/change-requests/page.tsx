import type { Metadata } from "next";

import type { DecisionItem } from "@/components/admin/decision-board";
import { LiveUpdates } from "@/components/admin/live-updates";
import { ChangeRequestBoard } from "@/components/admin/request-boards";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers, signPaths } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Change requests" };

const LIVE_TABLES = ["identity_change_requests"];

export default async function AdminChangeRequestsPage() {
  const { admin } = await requireAdminPage();
  const [users, { data: requests }, { data: identities }] = await Promise.all([
    listWorkspaceUsers(admin),
    admin
      .from("identity_change_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    admin
      .from("people_overview")
      .select("owner_id, linked_user_id, avatar_path, face_samples, voice_samples")
      .not("linked_user_id", "is", null),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const identityByUser = new Map(
    (identities ?? []).filter((p) => p.linked_user_id === p.owner_id).map((p) => [p.owner_id, p]),
  );
  const urls = await signPaths(
    admin,
    "avatars",
    [...identityByUser.values()].map((p) => p.avatar_path),
  );

  const items: DecisionItem[] = (requests ?? []).map((r) => {
    const identity = identityByUser.get(r.user_id);
    return {
      id: r.id,
      status: r.status,
      userName: userById.get(r.user_id)?.name ?? "Unknown user",
      userEmail: userById.get(r.user_id)?.email ?? "",
      avatarUrl: identity?.avatar_path ? (urls.get(identity.avatar_path) ?? null) : null,
      createdAt: r.created_at,
      title: identity
        ? `Wants to re-enroll · currently ${identity.face_samples} face / ${identity.voice_samples} voice samples`
        : "Wants to re-enroll",
      body: `“${r.reason}”`,
      decisionNote: r.decision_note,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Change requests"
        description="Users' face and voice are final after submitting. Approve a genuine request to let them re-enroll once."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <ChangeRequestBoard items={items} />
    </div>
  );
}
