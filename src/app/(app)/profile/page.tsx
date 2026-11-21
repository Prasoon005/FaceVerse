import type { Metadata } from "next";

import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { loadOwnProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await loadOwnProfile("/login");
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Profile"
        description="Your photo, name and contact details."
        icon={false}
      />
      <ProfileForm profile={profile} />
    </div>
  );
}
