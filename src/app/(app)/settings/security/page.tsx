import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SecuritySettings } from "@/components/settings/security-settings";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Security" description="Biometric login and recent sign-in attempts." />
      <SecuritySettings />
    </div>
  );
}
