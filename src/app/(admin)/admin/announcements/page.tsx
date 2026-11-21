import type { Metadata } from "next";

import {
  AnnouncementComposer,
  type SentAnnouncement,
} from "@/components/admin/announcement-composer";
import { LiveUpdates } from "@/components/admin/live-updates";
import { PageHeader } from "@/components/shared/page-header";
import { listWorkspaceUsers } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Announcements" };

const LIVE_TABLES = ["announcements"];

export default async function AdminAnnouncementsPage() {
  const { admin } = await requireAdminPage();
  const [users, { data: rows }, { data: reads }] = await Promise.all([
    listWorkspaceUsers(admin),
    admin.from("announcements").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("announcement_reads").select("announcement_id"),
  ]);

  const members = users.filter((u) => u.role === "member" && !u.disabled);
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const readCount = new Map<string, number>();
  for (const r of reads ?? []) {
    readCount.set(r.announcement_id, (readCount.get(r.announcement_id) ?? 0) + 1);
  }

  const sent: SentAnnouncement[] = (rows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    priority: a.priority,
    pinned: a.pinned,
    createdAt: a.created_at,
    recipientName: a.recipient_id ? (nameById.get(a.recipient_id) ?? "a user") : null,
    reads: readCount.get(a.id) ?? 0,
    audience: a.recipient_id ? 1 : members.length,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Announcements"
        description="Send updates to every user at once, or a private message to one user."
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <AnnouncementComposer
        users={members.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
        sent={sent}
      />
    </div>
  );
}
