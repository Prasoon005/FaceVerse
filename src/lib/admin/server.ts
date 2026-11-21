/**
 * Server-only helpers for the admin console and attendance (Phase 4A). Admin writes use
 * the service-role client, but only after checking the signed-in caller is an active admin.
 */
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceSettings } from "@/types/database";

export const DEFAULT_SETTINGS: Pick<AttendanceSettings, "work_days" | "timezone"> = {
  work_days: [1, 2, 3, 4, 5, 6],
  timezone: "Asia/Kolkata",
};

/** The signed-in user and their profile, or null when signed out. */
export async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, disabled, full_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile };
}

export class ForbiddenError extends Error {
  constructor() {
    super("Only admins can do that.");
  }
}

/** For Server Actions / route handlers: throws unless the caller is an active admin. */
export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.role !== "admin" || viewer.profile.disabled) {
    throw new ForbiddenError();
  }
  return { adminId: viewer.user.id, admin: createAdminClient() };
}

/** For admin pages: 404s for everyone who isn't an admin (doesn't reveal the page exists). */
export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch {
    notFound();
  }
}

/** For member-only Server Actions and routes: the signed-in, active, non-admin user. */
export async function requireMember() {
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.disabled) throw new Error("Please sign in again.");
  return viewer;
}

export async function getAttendanceSettings(
  client: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await client
    .from("attendance_settings")
    .select("work_days, timezone")
    .eq("id", 1)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}
