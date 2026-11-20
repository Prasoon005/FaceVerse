"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";

import { AuthDivider } from "./auth-divider";
import { FormField } from "./form-field";
import { GoogleButton } from "./google-button";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    toast.success("Welcome back");
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <GoogleButton next={next} />
      <AuthDivider />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
