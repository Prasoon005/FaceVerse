/**
 * Records a check-in (first scan of the day) or check-out (second scan) for a user. Server
 * only: call after the face has been verified. Shared by self check-in and kiosk mode.
 */
import { getAttendanceSettings } from "@/lib/admin/server";
import type { createAdminClient } from "@/lib/supabase/admin";

import { localDay } from "./days";

type Admin = ReturnType<typeof createAdminClient>;

export type MarkResult =
  | { ok: true; action: "check_in" | "check_out"; at: string; day: string }
  | { ok: false; error: "done" | "server" };

export async function markAttendance(
  admin: Admin,
  userId: string,
  score: number,
  source: "self" | "kiosk",
): Promise<MarkResult> {
  const settings = await getAttendanceSettings(admin);
  const now = new Date();
  const at = now.toISOString();
  const day = localDay(now, settings.timezone);
  const { data: existing } = await admin
    .from("attendance")
    .select("id, check_out_at")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin
      .from("attendance")
      .insert({ user_id: userId, day, check_in_at: at, check_in_score: score, source });
    return error ? { ok: false, error: "server" } : { ok: true, action: "check_in", at, day };
  }
  if (existing.check_out_at) return { ok: false, error: "done" };
  const { error } = await admin
    .from("attendance")
    .update({ check_out_at: at, check_out_score: score })
    .eq("id", existing.id);
  return error ? { ok: false, error: "server" } : { ok: true, action: "check_out", at, day };
}
