"use server";

/** Leave request Server Actions for regular users. Admins decide them (see admin.ts). */
import { refresh } from "next/cache";
import { z } from "zod";

import { getAttendanceSettings, requireMember } from "@/lib/admin/server";
import { addDays, isValidDay, localDay } from "@/lib/attendance/days";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ActionResult } from "./admin";

const MAX_DAYS = 60;
/** Sick leave can be filed a little after the fact. */
const BACKDATE_DAYS = 14;

const leaveSchema = z
  .object({
    startDay: z.string().refine(isValidDay, "Pick a start date."),
    endDay: z.string().refine(isValidDay, "Pick an end date."),
    kind: z.enum(["casual", "sick", "personal", "other"]),
    reason: z.string().trim().min(3, "Please add a short reason.").max(1000),
  })
  .refine((v) => v.endDay >= v.startDay, {
    message: "The end date can't be before the start date.",
  })
  .refine((v) => addDays(v.startDay, MAX_DAYS) >= v.endDay, {
    message: `A single request can cover at most ${MAX_DAYS} days.`,
  });

export async function requestLeave(input: z.input<typeof leaveSchema>): Promise<ActionResult> {
  try {
    const { user, profile } = await requireMember();
    if (profile?.role === "admin") return { ok: false, error: "Admins don't request leave here." };
    const parsed = leaveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
    const { startDay, endDay, kind, reason } = parsed.data;

    const admin = createAdminClient();
    const settings = await getAttendanceSettings(admin);
    const today = localDay(new Date(), settings.timezone);
    if (startDay < addDays(today, -BACKDATE_DAYS)) {
      return { ok: false, error: `Leave can start at most ${BACKDATE_DAYS} days in the past.` };
    }

    const { data: overlapping } = await admin
      .from("leave_requests")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .lte("start_day", endDay)
      .gte("end_day", startDay)
      .limit(1);
    if (overlapping && overlapping.length > 0) {
      return { ok: false, error: "You already have leave requested for some of these days." };
    }

    const { data: created, error } = await admin
      .from("leave_requests")
      .insert({ user_id: user.id, start_day: startDay, end_day: endDay, kind, reason })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Couldn't send your request." };
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "leave.request",
      target_id: created.id,
      meta: { start_day: startDay, end_day: endDay, kind },
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Cancels the caller's own pending request. */
export async function cancelLeave(input: { requestId: string }): Promise<ActionResult> {
  try {
    const { user } = await requireMember();
    const requestId = z.uuid().parse(input.requestId);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id");
    if (error || !data?.length) return { ok: false, error: "That request can't be cancelled." };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
