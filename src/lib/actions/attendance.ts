"use server";

/** Attendance Server Actions for regular users (Phase 4A). */
import { refresh } from "next/cache";
import { z } from "zod";

import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { isValidDay, localDay } from "@/lib/attendance/days";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ActionResult } from "./admin";

const answerSchema = z.object({
  day: z.string().refine(isValidDay, "Invalid day."),
  reason: z.string().trim().min(3, "Please write a short reason.").max(1000),
  proofPath: z.string().max(300).nullable().optional(),
});

/**
 * Answers an admin's question about an absence, or explains an absence unasked. Allowed
 * only for the caller's own past days without a check-in that haven't been decided yet.
 */
export async function answerAbsence(input: z.input<typeof answerSchema>): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.disabled) return { ok: false, error: "Please sign in again." };
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  const { day, reason, proofPath } = parsed.data;
  const userId = viewer.user.id;

  // Proofs must live in the caller's own folder of the private bucket.
  if (proofPath && !proofPath.startsWith(`${userId}/`)) {
    return { ok: false, error: "Invalid proof file." };
  }

  const admin = createAdminClient();
  const settings = await getAttendanceSettings(admin);
  if (day > localDay(new Date(), settings.timezone)) {
    return { ok: false, error: "You can't explain a future day." };
  }
  const { data: present } = await admin
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (present) return { ok: false, error: "You were present that day." };

  const { data: existing } = await admin
    .from("absence_reviews")
    .select("id, status")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if (existing && (existing.status === "approved" || existing.status === "rejected")) {
    return { ok: false, error: "This absence has already been decided." };
  }

  const now = new Date().toISOString();
  const { error } = existing
    ? await admin
        .from("absence_reviews")
        .update({ status: "answered", reason, proof_path: proofPath ?? null, answered_at: now })
        .eq("id", existing.id)
    : await admin.from("absence_reviews").insert({
        user_id: userId,
        day,
        status: "answered",
        reason,
        proof_path: proofPath ?? null,
        answered_at: now,
      });
  if (error) return { ok: false, error: "Couldn't save your answer." };

  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "attendance.answer_absence",
    target_id: existing?.id ?? null,
    meta: { day },
  });
  refresh();
  return { ok: true };
}
