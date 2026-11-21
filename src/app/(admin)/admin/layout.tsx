import { notFound, redirect } from "next/navigation";

import { AccountDisabled } from "@/components/layout/account-disabled";
import { AppShell } from "@/components/layout/app-shell";
import type { ShellUser } from "@/components/layout/user-menu";
import { getViewer } from "@/lib/admin/server";
import { resolveAvatar } from "@/lib/avatars";

/**
 * The admin console: its own shell, navigation and accent colour. Signed-out visitors go to
 * the admin sign-in page; signed-in members get a 404 (the console isn't advertised to them).
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/admin/login");
  const { user, profile, supabase } = viewer;

  if (profile?.disabled) return <AccountDisabled email={user.email ?? ""} />;
  if (profile?.role !== "admin") notFound();

  const shellUser: ShellUser = {
    email: user.email ?? "",
    fullName: profile.full_name ?? (user.user_metadata.full_name as string | undefined) ?? null,
    avatarUrl:
      (await resolveAvatar(supabase, profile.avatar_url)) ??
      ((user.user_metadata.avatar_url as string | undefined) || null),
    role: "admin",
  };

  return (
    <AppShell user={shellUser} portal="admin">
      {children}
    </AppShell>
  );
}
