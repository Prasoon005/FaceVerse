import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import type { ShellUser } from "@/components/layout/user-menu";
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
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  const shellUser: ShellUser = {
    email: user.email ?? "",
    fullName: profile?.full_name ?? (user.user_metadata.full_name as string | undefined) ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? "member",
  };

  return <AppShell user={shellUser}>{children}</AppShell>;
}
