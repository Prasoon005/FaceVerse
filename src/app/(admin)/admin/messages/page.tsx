import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminInbox } from "@/components/messages/admin-inbox";
import { requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const { adminId } = await requireAdminPage();
  return (
    <Suspense>
      <AdminInbox adminId={adminId} />
    </Suspense>
  );
}
