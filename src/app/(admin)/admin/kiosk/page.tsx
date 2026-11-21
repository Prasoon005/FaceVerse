import type { Metadata } from "next";

import { KioskMode } from "@/components/admin/kiosk-mode";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Kiosk mode" };

export default async function KioskPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Kiosk mode"
        description="Turn this device into an attendance point. Members walk up, look at the camera, and they're checked in. Only approved identities are recognised."
      />
      <KioskMode timezone={settings.timezone} />
    </div>
  );
}
