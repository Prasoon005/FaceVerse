/** Settings → Security: biometric login status, toggle and recent attempts. */
import { recognitionConfig } from "@/config/recognition";
import { createClient } from "@/lib/supabase/client";
import type { AuthAttempt, PersonOverview } from "@/types/database";

export const securityKeys = { status: ["security", "status"] as const };

export type SecurityStatus = {
  enabled: boolean;
  /** The linked person (approved first, then most samples); verification uses all approved ones. */
  linkedPerson: PersonOverview | null;
  requirements: { linked: boolean; approved: boolean; face: boolean; voice: boolean };
  attempts: AuthAttempt[];
};

export async function getSecurityStatus(): Promise<SecurityStatus> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("You are signed out. Please sign in again.");

  const [profile, people, attempts] = await Promise.all([
    supabase.from("profiles").select("biometric_login_enabled").eq("id", userId).single(),
    supabase
      .from("people_overview")
      .select("*")
      .eq("linked_user_id", userId)
      .eq("owner_id", userId),
    supabase
      .from("auth_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (profile.error) throw profile.error;
  if (people.error) throw people.error;
  if (attempts.error) throw attempts.error;

  // Prefer an approved person, then the one with the most samples.
  const linkedPerson =
    [...people.data].sort(
      (a, b) =>
        Number(b.approval_status === "approved") - Number(a.approval_status === "approved") ||
        b.face_samples + b.voice_samples - (a.face_samples + a.voice_samples),
    )[0] ?? null;
  const { faceMin, voice } = recognitionConfig.samples;

  return {
    enabled: profile.data.biometric_login_enabled,
    linkedPerson,
    requirements: {
      linked: linkedPerson !== null,
      approved: linkedPerson?.approval_status === "approved",
      face: (linkedPerson?.face_samples ?? 0) >= faceMin,
      voice: (linkedPerson?.voice_samples ?? 0) >= voice,
    },
    attempts: attempts.data,
  };
}

export async function setBiometricLogin(enabled: boolean) {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("You are signed out. Please sign in again.");
  const { error } = await supabase
    .from("profiles")
    .update({ biometric_login_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("audit_logs").insert({
    actor_id: userId,
    action: enabled ? "security.biometric_enable" : "security.biometric_disable",
    target_id: userId,
  });
}
