"use server";

/**
 * Admin Server Actions (Phase 4A). Every action re-checks that the caller is an active
 * admin, writes with the service role, records an audit log entry and refreshes the page.
 */
import { refresh } from "next/cache";
import { z } from "zod";

import { ForbiddenError, requireAdmin } from "@/lib/admin/server";
import { isValidDay } from "@/lib/attendance/days";
import type { Json } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

const uuid = z.uuid();
const note = z.string().trim().max(500).optional();

async function run(
  action: string,
  targetId: string | null,
  body: (ctx: Awaited<ReturnType<typeof requireAdmin>>) => Promise<Json | void>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const meta = await body(ctx);
    await ctx.admin.from("audit_logs").insert({
      actor_id: ctx.adminId,
      action,
      target_id: targetId,
      meta: meta ?? null,
    });
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof ForbiddenError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Approve or reject a self-enrolled (account-linked) person. */
export async function reviewEnrollment(input: {
  personId: string;
  approve: boolean;
  note?: string;
}): Promise<ActionResult> {
  const personId = uuid.parse(input.personId);
  const reviewNote = note.parse(input.note) || null;
  return run(
    input.approve ? "admin.enrollment_approve" : "admin.enrollment_reject",
    personId,
    async ({ admin, adminId }) => {
      // Approving keeps the identity locked (final); rejecting unlocks it so the user can redo it.
      const { error } = await admin
        .from("people")
        .update({
          approval_status: input.approve ? "approved" : "rejected",
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote,
          biometrics_locked: input.approve,
          ...(input.approve ? {} : { locked_at: null }),
        })
        .eq("id", personId);
      if (error) throw error;
      return reviewNote ? { note: reviewNote } : undefined;
    },
  );
}

/**
 * Decides a user's request to change their final identity. Approving unlocks it once: the
 * user re-enrolls, which locks it again and sends it back for approval.
 */
export async function decideIdentityChange(input: {
  requestId: string;
  approve: boolean;
  note?: string;
}): Promise<ActionResult> {
  const requestId = uuid.parse(input.requestId);
  const decisionNote = note.parse(input.note) || null;
  return run(
    input.approve ? "admin.identity_change_approve" : "admin.identity_change_reject",
    requestId,
    async ({ admin, adminId }) => {
      const { data: request, error: readError } = await admin
        .from("identity_change_requests")
        .select("id, user_id, status")
        .eq("id", requestId)
        .maybeSingle();
      if (readError) throw readError;
      if (!request || request.status !== "pending") {
        throw new Error("This request was already handled.");
      }
      const { error } = await admin
        .from("identity_change_requests")
        .update({
          status: input.approve ? "approved" : "rejected",
          decision_note: decisionNote,
          decided_by: adminId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
      if (input.approve) {
        const { error: unlockError } = await admin
          .from("people")
          .update({ biometrics_locked: false })
          .eq("owner_id", request.user_id)
          .eq("linked_user_id", request.user_id);
        if (unlockError) throw unlockError;
      }
      return { user_id: request.user_id, ...(decisionNote ? { note: decisionNote } : {}) };
    },
  );
}

export async function setUserRole(input: {
  userId: string;
  role: "admin" | "member";
}): Promise<ActionResult> {
  const userId = uuid.parse(input.userId);
  const role = z.enum(["admin", "member"]).parse(input.role);
  return run("admin.set_role", userId, async ({ admin, adminId }) => {
    if (userId === adminId && role !== "admin") {
      throw new Error("You can't remove your own admin role. Ask another admin.");
    }
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) throw error;
    return { role };
  });
}

/** Disables (or re-enables) an account: blocks sign-in via an auth ban and flags the profile. */
export async function setUserDisabled(input: {
  userId: string;
  disabled: boolean;
}): Promise<ActionResult> {
  const userId = uuid.parse(input.userId);
  return run(
    input.disabled ? "admin.disable_user" : "admin.enable_user",
    userId,
    async ({ admin, adminId }) => {
      if (userId === adminId) throw new Error("You can't disable your own account.");
      const { error: banError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: input.disabled ? "876000h" : "none",
      });
      if (banError) throw banError;
      const { error } = await admin
        .from("profiles")
        .update({ disabled: input.disabled })
        .eq("id", userId);
      if (error) throw error;
    },
  );
}

/** Removes everyone a user enrolled (faces, voices, avatars). Account and attendance stay. */
export async function deleteUserBiometrics(input: { userId: string }): Promise<ActionResult> {
  const userId = uuid.parse(input.userId);
  return run("admin.delete_user_biometrics", userId, async ({ admin }) => {
    const { data: people, error: listError } = await admin
      .from("people")
      .select("id, avatar_path")
      .eq("owner_id", userId);
    if (listError) throw listError;
    const avatars = (people ?? []).flatMap((p) => (p.avatar_path ? [p.avatar_path] : []));
    if (avatars.length > 0) await admin.storage.from("avatars").remove(avatars);
    const { error } = await admin.from("people").delete().eq("owner_id", userId);
    if (error) throw error;
    return { people: people?.length ?? 0 };
  });
}

/** Deletes the account and, through foreign keys, all of its data. */
export async function deleteUserAccount(input: { userId: string }): Promise<ActionResult> {
  const userId = uuid.parse(input.userId);
  return run("admin.delete_user", userId, async ({ admin, adminId }) => {
    if (userId === adminId) throw new Error("You can't delete your own account here.");
    const { data: people } = await admin
      .from("people")
      .select("avatar_path")
      .eq("owner_id", userId);
    const avatars = (people ?? []).flatMap((p) => (p.avatar_path ? [p.avatar_path] : []));
    if (avatars.length > 0) await admin.storage.from("avatars").remove(avatars);
    const { data: proofs } = await admin.storage.from("absence-proofs").list(userId);
    if (proofs && proofs.length > 0) {
      await admin.storage.from("absence-proofs").remove(proofs.map((f) => `${userId}/${f.name}`));
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  });
}

/** Asks a user to explain an absence; they get a notification. */
export async function askAbsenceReason(input: {
  userId: string;
  day: string;
  question?: string;
  kind?: "absence" | "late";
}): Promise<ActionResult> {
  const userId = uuid.parse(input.userId);
  if (!isValidDay(input.day)) return { ok: false, error: "Invalid day." };
  const kind = z.enum(["absence", "late"]).parse(input.kind ?? "absence");
  const question =
    z.string().trim().max(500).optional().parse(input.question) ||
    (kind === "late"
      ? "You checked in late on this day. Please share the reason."
      : "You were marked absent on this day. Please share the reason.");
  return run("admin.ask_absence_reason", userId, async ({ admin, adminId }) => {
    const { data: existing } = await admin
      .from("absence_reviews")
      .select("id, status")
      .eq("user_id", userId)
      .eq("day", input.day)
      .maybeSingle();
    if (existing && (existing.status === "approved" || existing.status === "rejected")) {
      throw new Error("This absence has already been decided.");
    }
    const now = new Date().toISOString();
    const { error } = existing
      ? await admin
          .from("absence_reviews")
          .update({ kind, question, asked_by: adminId, asked_at: now })
          .eq("id", existing.id)
      : await admin.from("absence_reviews").insert({
          user_id: userId,
          day: input.day,
          kind,
          status: "asked",
          question,
          asked_by: adminId,
          asked_at: now,
        });
    if (error) throw error;
    return { day: input.day, kind };
  });
}

/** Approves (excused) or rejects (absent) an absence review. */
export async function decideAbsence(input: {
  reviewId: string;
  approve: boolean;
  note?: string;
}): Promise<ActionResult> {
  const reviewId = uuid.parse(input.reviewId);
  const decisionNote = note.parse(input.note) || null;
  return run(
    input.approve ? "admin.absence_approve" : "admin.absence_reject",
    reviewId,
    async ({ admin, adminId }) => {
      const { error } = await admin
        .from("absence_reviews")
        .update({
          status: input.approve ? "approved" : "rejected",
          decision_note: decisionNote,
          decided_by: adminId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;
    },
  );
}

export async function updateAttendanceSettings(input: {
  workDays: number[];
  timezone: string;
}): Promise<ActionResult> {
  const workDays = z
    .array(z.number().int().min(1).max(7))
    .min(1, "Pick at least one working day.")
    .parse([...new Set(input.workDays)].sort());
  const timezone = z.string().min(1).max(64).parse(input.timezone);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { ok: false, error: "Unknown timezone." };
  }
  return run("admin.update_attendance_settings", null, async ({ admin }) => {
    const { error } = await admin
      .from("attendance_settings")
      .update({ work_days: workDays, timezone, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    return { work_days: workDays, timezone };
  });
}

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  body: z.string().trim().min(1, "Write a message.").max(4000),
  priority: z.enum(["normal", "important", "urgent"]),
  pinned: z.boolean(),
  recipientId: z.uuid().nullable(),
});

/** Posts an announcement to everyone, or to one user when `recipientId` is set. */
export async function postAnnouncement(
  input: z.input<typeof announcementSchema>,
): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  const { title, body, priority, pinned, recipientId } = parsed.data;
  return run("admin.announcement_post", null, async ({ admin, adminId }) => {
    const { error } = await admin.from("announcements").insert({
      title,
      body,
      priority,
      pinned,
      recipient_id: recipientId,
      created_by: adminId,
    });
    if (error) throw error;
    return { title, priority, audience: recipientId ? "user" : "everyone" };
  });
}

export async function setAnnouncementPinned(input: {
  id: string;
  pinned: boolean;
}): Promise<ActionResult> {
  const id = uuid.parse(input.id);
  return run("admin.announcement_pin", id, async ({ admin }) => {
    const { error } = await admin
      .from("announcements")
      .update({ pinned: input.pinned })
      .eq("id", id);
    if (error) throw error;
    return { pinned: input.pinned };
  });
}

export async function deleteAnnouncement(input: { id: string }): Promise<ActionResult> {
  const id = uuid.parse(input.id);
  return run("admin.announcement_delete", id, async ({ admin }) => {
    const { error } = await admin.from("announcements").delete().eq("id", id);
    if (error) throw error;
  });
}

/** Approves or rejects a leave request. Approved days show as "On leave", not absent. */
export async function decideLeave(input: {
  requestId: string;
  approve: boolean;
  note?: string;
}): Promise<ActionResult> {
  const requestId = uuid.parse(input.requestId);
  const decisionNote = note.parse(input.note) || null;
  return run(
    input.approve ? "admin.leave_approve" : "admin.leave_reject",
    requestId,
    async ({ admin, adminId }) => {
      const { data, error } = await admin
        .from("leave_requests")
        .update({
          status: input.approve ? "approved" : "rejected",
          decision_note: decisionNote,
          decided_by: adminId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("user_id, start_day, end_day");
      if (error) throw error;
      if (!data?.length) throw new Error("This request was already handled.");
      return {
        user_id: data[0]!.user_id,
        start_day: data[0]!.start_day,
        end_day: data[0]!.end_day,
      };
    },
  );
}

const rulesSchema = z.object({
  workStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, e.g. 09:30."),
  lateGraceMinutes: z.number().int().min(0).max(240),
  scoreBase: z.number().int().min(1).max(1000),
  deductAbsent: z.number().min(0).max(1000),
  deductLate: z.number().min(0).max(1000),
  deductExcused: z.number().min(0).max(1000),
  deductLateExcused: z.number().min(0).max(1000),
});

/** Office hours (for "late") and the deduction score rules. */
export async function updateScoringRules(
  input: z.input<typeof rulesSchema>,
): Promise<ActionResult> {
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  const r = parsed.data;
  return run("admin.update_scoring_rules", null, async ({ admin }) => {
    const { error } = await admin
      .from("attendance_settings")
      .update({
        work_start: r.workStart,
        late_grace_minutes: r.lateGraceMinutes,
        score_base: r.scoreBase,
        deduct_absent: r.deductAbsent,
        deduct_late: r.deductLate,
        deduct_excused: r.deductExcused,
        deduct_late_excused: r.deductLateExcused,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;
    return {
      work_start: r.workStart,
      grace: r.lateGraceMinutes,
      base: r.scoreBase,
      absent: r.deductAbsent,
      late: r.deductLate,
    };
  });
}
