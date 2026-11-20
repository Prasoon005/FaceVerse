import type { Metadata } from "next";

import { AuthErrorToast } from "@/components/auth/auth-error-toast";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/validations/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your FaceVerse workspace</p>
      </div>
      <LoginForm next={next} />
      <AuthErrorToast message={error} notice={notice} />
    </div>
  );
}
