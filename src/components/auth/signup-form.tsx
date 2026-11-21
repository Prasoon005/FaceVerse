"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Lock, Mail, MailCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { type SignupInput, signupSchema } from "@/lib/validations/auth";

import { AuthDivider } from "./auth-divider";
import { FormField } from "./form-field";
import { GoogleButton } from "./google-button";
import { PasswordStrength } from "./password-strength";

export function SignupForm() {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is fine for one field
  const password = watch("password") ?? "";

  async function onSubmit({ fullName, email, password }: SignupInput) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/confirmed`,
      },
    });
    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }
    // With email confirmation disabled in Supabase a session is returned immediately.
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="grid justify-items-center gap-3 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-2xl bg-success/10 text-success-foreground">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Open it to finish creating
          your account.
        </p>
        <Button variant="ghost" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <GoogleButton next="/dashboard" />
      <AuthDivider />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          id="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="Your full name"
          icon={User}
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          icon={Lock}
          hint={<PasswordStrength password={password} />}
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          icon={Lock}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          Create account
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to biometric data being processed on your device and stored
        only as embeddings. You can delete it any time.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
