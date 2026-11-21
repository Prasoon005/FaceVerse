"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { createClient } from "@/lib/supabase/client";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";

/**
 * Admin console sign-in. Signs in with email + password, then checks the account really is
 * an active admin; anyone else is signed straight back out (the server layout checks again).
 */
export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { play } = useSoundFeedback();
  const shake = useAnimationControls();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function fail(title: string, description?: string) {
    play("error");
    toast.error(title, { description });
    await shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  }

  async function onSubmit(values: LoginInput) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error || !data.user) {
      await fail("Could not sign in", error?.message);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, disabled")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.role !== "admin" || profile.disabled) {
      await supabase.auth.signOut();
      await fail(
        "Not an admin account",
        "This console is only for administrators. Use the regular sign-in instead.",
      );
      return;
    }
    play("success");
    toast.success("Welcome to the admin console");
    router.replace(next);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <motion.div
        animate={shake}
        className="glass-panel grid gap-6 rounded-[28px] p-6 shadow-(--shadow-card-hover) sm:p-8"
      >
        <div className="grid justify-items-center gap-3 text-center">
          <div className="relative grid size-16 place-items-center">
            {[0, 1].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden
                className="absolute inset-0 rounded-full border border-brand/50"
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: ring * 1.1, ease: "easeOut" }}
              />
            ))}
            <span className="grid size-16 animate-float place-items-center rounded-2xl bg-brand/15 text-brand">
              <ShieldCheck className="size-8" aria-hidden />
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-gradient">Admin console</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Restricted area. Sign in with your administrator account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormField
            id="admin-email"
            label="Admin email"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            id="admin-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <KeyRound aria-hidden />
            )}
            Enter console
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Not an admin?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Go to user sign in
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
