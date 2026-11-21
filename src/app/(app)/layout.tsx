import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { AccountDisabled } from "@/components/layout/account-disabled";
import type { ShellUser } from "@/components/layout/user-menu";
import { resolveAvatar } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated shell. The proxy already redirects signed-out visitors, but we
 * re-check here on the server (proxy checks are optimistic, this one is authoritative).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, disabled")
    .eq("id", user.id)
    .maybeSingle();

  // Admin-disabled accounts are also banned in Supabase Auth; this covers a still-valid session.
  if (profile?.disabled) return <AccountDisabled email={user.email ?? ""} />;

  // Admins have their own console; the user app is for members only.
  if (profile?.role === "admin") redirect("/admin");

  const shellUser: ShellUser = {
    email: user.email ?? "",
    fullName: profile?.full_name ?? (user.user_metadata.full_name as string | undefined) ?? null,
    avatarUrl:
      (await resolveAvatar(supabase, profile?.avatar_url)) ??
      ((user.user_metadata.avatar_url as string | undefined) || null),
    role: profile?.role ?? "member",
  };

  return (
    <AppShell user={shellUser} portal="user">
      {children}
    </AppShell>
  );
}
