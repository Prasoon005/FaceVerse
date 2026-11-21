import type { Metadata } from "next";

import { WorkspaceSettingsForm } from "@/components/admin/workspace-settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Workspace settings" };

export default async function AdminSettingsPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);

  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader
        title="Workspace settings"
        description="Working days decide which days count as absent. The timezone decides which day a check-in belongs to."
      />
      <WorkspaceSettingsForm workDays={settings.work_days} timezone={settings.timezone} />
    </div>
  );
}
