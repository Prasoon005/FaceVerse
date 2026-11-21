import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5 text-center lg:text-left">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em]">
          Create your account
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Set up your workspace in under a minute. Free, no card needed.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
