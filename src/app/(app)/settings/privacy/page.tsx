import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PrivacyPanel, type StorageUsage } from "@/components/privacy/privacy-panel";
import { PageHeader } from "@/components/shared/page-header";
import { getViewer } from "@/lib/admin/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Privacy" };

/** Sizes of the files in a user's folder of a bucket (one level; avatars/snapshots/proofs are flat). */
async function folderUsage(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  folder: string,
) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const files = (data ?? []).filter((f) => f.id);
  return {
    bytes: files.reduce(
      (s, f) => s + Number((f.metadata as { size?: number } | null)?.size ?? 0),
      0,
    ),
    files: files.length,
  };
}

export default async function PrivacyPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user } = viewer;

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("consent_given_at").eq("id", user.id).maybeSingle(),
    supabase.from("album_photos").select("size_bytes").eq("owner_id", user.id),
  ]);

  const usage: StorageUsage = [
    {
      label: "Album photos",
      bytes: (photos ?? []).reduce((s, p) => s + (p.size_bytes ?? 0), 0),
      files: photos?.length ?? 0,
    },
  ];
  if (isAdminConfigured()) {
    const admin = createAdminClient();
    const [avatars, snapshots, proofs] = await Promise.all([
      folderUsage(admin, "avatars", user.id),
      folderUsage(admin, "visitor-snapshots", user.id),
      folderUsage(admin, "absence-proofs", user.id),
    ]);
    usage.push(
      { label: "Profile thumbnails", ...avatars },
      { label: "Visitor snapshots", ...snapshots },
      { label: "Absence proofs", ...proofs },
    );
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Privacy"
        description="Your consent, your data and your storage. Delete your biometrics at any time."
      />
      <PrivacyPanel consentGivenAt={profile?.consent_given_at ?? null} usage={usage} />
    </div>
  );
}
