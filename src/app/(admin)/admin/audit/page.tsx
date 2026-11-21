import type { Metadata } from "next";

import { type AuditEntry, AuditTimeline } from "@/components/admin/audit-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/admin/server";
import type { Json } from "@/types/database";

export const metadata: Metadata = { title: "Audit log" };

/** Short "key: value" summary of an entry's metadata (no embeddings or long text). */
function summarizeMeta(meta: Json | null): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const parts = Object.entries(meta)
    .filter(([key, v]) => key !== "user_id" && v !== null && typeof v !== "object")
    .map(([key, v]) => `${key.replace(/_/g, " ")}: ${String(v).slice(0, 60)}`);
  return parts.length ? parts.join(" · ") : null;
}

export default async function AuditPage() {
  const { admin } = await requireAdminPage();
  const [users, { data: logs }] = await Promise.all([
    listWorkspaceUsers(admin),
    admin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const entries: AuditEntry[] = (logs ?? []).map((l) => {
    const actor = l.actor_id ? userById.get(l.actor_id) : undefined;
    const targetUser =
      (l.target_id ? userById.get(l.target_id) : undefined) ??
      (l.meta &&
      typeof l.meta === "object" &&
      !Array.isArray(l.meta) &&
      typeof l.meta.user_id === "string"
        ? userById.get(l.meta.user_id)
        : undefined);
    return {
      id: l.id,
      action: l.action,
      actorName: actor?.name ?? "Deleted user",
      actorIsAdmin: actor?.role === "admin",
      targetName: targetUser && targetUser.id !== actor?.id ? targetUser.name : null,
      meta: summarizeMeta(l.meta),
      createdAt: l.created_at,
    };
  });

  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader
        title="Audit log"
        description="Every admin decision and important user action, newest first (last 300)."
      />
      <AuditTimeline entries={entries} />
    </div>
  );
}
