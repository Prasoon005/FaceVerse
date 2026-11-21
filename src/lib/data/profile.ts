import { redirect } from "next/navigation";

import type { ProfileData } from "@/components/settings/profile-form";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { localDay } from "@/lib/attendance/days";
import { isStoragePath, resolveAvatar } from "@/lib/avatars";

/** Everything the profile page shows, for the signed-in user. */
export async function loadOwnProfile(loginPath: string): Promise<ProfileData> {
  const viewer = await getViewer();
  if (!viewer) redirect(loginPath);
  const { supabase, user, profile } = viewer;
  const settings = await getAttendanceSettings(supabase);
  const avatarUrl =
    (await resolveAvatar(supabase, profile?.avatar_url)) ??
    ((user.user_metadata.avatar_url as string | undefined) || null);
  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile?.role ?? "member",
    joinedDay: localDay(new Date(profile?.created_at ?? user.created_at), settings.timezone),
    fullName: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    department: profile?.department ?? "",
    avatarUrl,
    hasUploadedPhoto: isStoragePath(profile?.avatar_url),
  };
}
