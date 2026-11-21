import { ArrowRight, LogIn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ConfirmedBadge } from "@/components/auth/confirmed-badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Email confirmed" };

/**
 * Shown after clicking the email confirmation link. If the link also signed the user in (same
 * browser), they continue to the app; otherwise (other device, or link already used) they sign in.
 */
export default async function EmailConfirmedPage({ searchParams }: PageProps<"/auth/confirmed">) {
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="grid justify-items-center gap-5 text-center">
      <ConfirmedBadge />
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Email confirmed</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? "Your email is verified and you're signed in. Welcome to FaceVerse!"
            : state === "used"
              ? "This link was already used, which means your email is verified. Sign in to continue."
              : "Your email is verified. Sign in with your email and password to continue."}
        </p>
      </div>
      {user ? (
        <Button size="lg" className="w-full" asChild>
          <Link href="/dashboard">
            Continue to FaceVerse <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full" asChild>
          <Link href="/login?notice=confirmed">
            <LogIn aria-hidden /> Continue to sign in
          </Link>
        </Button>
      )}
    </div>
  );
}
