import type { Metadata } from "next";

import { AnnouncementFeed } from "@/components/announcements/announcement-feed";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Announcements"
        description="Updates and messages from your admin. New ones appear live."
      />
      <AnnouncementFeed />
    </div>
  );
}
