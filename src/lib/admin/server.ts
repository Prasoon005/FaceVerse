/**
 * Server-only helpers for the admin console and attendance (Phase 4A). Admin writes use
 * the service-role client, but only after checking the signed-in caller is an active admin.
 */
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_OFFICE, DEFAULT_RULES } from "@/lib/attendance/score";
import type { AttendanceSettings } from "@/types/database";

export type WorkspaceSettings = Pick<
  AttendanceSettings,
  | "work_days"
  | "timezone"
  | "work_start"
  | "late_grace_minutes"
  | "score_base"
  | "deduct_absent"
  | "deduct_late"
  | "deduct_excused"
  | "deduct_late_excused"
>;

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  work_days: [1, 2, 3, 4, 5, 6],
  timezone: "Asia/Kolkata",
  ...DEFAULT_OFFICE,
  ...DEFAULT_RULES,
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
): Promise<WorkspaceSettings> {
  const { data } = await client.from("attendance_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  // Columns from newer migrations may be missing on an older database: fall back to defaults.
  const num = (v: unknown, fallback: number) =>
    v === null || v === undefined ? fallback : Number(v);
  return {
    work_days: data.work_days ?? DEFAULT_SETTINGS.work_days,
    timezone: data.timezone ?? DEFAULT_SETTINGS.timezone,
    work_start: data.work_start ?? DEFAULT_SETTINGS.work_start,
    late_grace_minutes: num(data.late_grace_minutes, DEFAULT_SETTINGS.late_grace_minutes),
    score_base: num(data.score_base, DEFAULT_SETTINGS.score_base),
    deduct_absent: num(data.deduct_absent, DEFAULT_SETTINGS.deduct_absent),
    deduct_late: num(data.deduct_late, DEFAULT_SETTINGS.deduct_late),
    deduct_excused: num(data.deduct_excused, DEFAULT_SETTINGS.deduct_excused),
    deduct_late_excused: num(data.deduct_late_excused, DEFAULT_SETTINGS.deduct_late_excused),
  };
}
