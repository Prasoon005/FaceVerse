import { LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/admin/server";
import { safeNextPath } from "@/lib/validations/auth";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const requested = safeNextPath(typeof params.next === "string" ? params.next : null, "/admin");
  const next = requested.startsWith("/admin") ? requested : "/admin";

  const viewer = await getViewer();
  if (viewer?.profile?.role === "admin" && !viewer.profile.disabled) redirect(next);

  if (viewer) {
    // Signed in, but as a regular user.
    return (
      <div className="glass-panel grid animate-in gap-4 rounded-[28px] p-6 text-center zoom-in-95 fade-in">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning/10 text-warning-foreground">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold">This account isn&apos;t an admin</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as <span className="font-medium">{viewer.user.email}</span>. Sign
          out and sign in with an administrator account to open the console.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden /> My dashboard
            </Link>
          </Button>
          <form action="/auth/signout?to=admin" method="post">
            <Button type="submit">
              <LogOut aria-hidden /> Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminLoginForm next={next} />;
}
