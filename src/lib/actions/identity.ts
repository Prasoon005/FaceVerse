"use server";

/** "My identity" Server Actions for regular users: ask an admin to unlock a final identity. */
import { refresh } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ActionResult } from "./admin";

const reasonSchema = z
  .string()
  .trim()
  .min(10, "Please explain in a sentence why you need to change it.")
  .max(1000);

/** Sends a change request for the caller's locked identity. One open request at a time. */
export async function requestIdentityChange(input: { reason: string }): Promise<ActionResult> {
  try {
    const { user, profile } = await requireMember();
    if (profile?.role === "admin") return { ok: false, error: "Admins don't have an identity." };
    const parsed = reasonSchema.safeParse(input.reason);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };

    const admin = createAdminClient();
    const { data: identity } = await admin
      .from("people")
      .select("id, biometrics_locked")
      .eq("owner_id", user.id)
      .eq("linked_user_id", user.id)
      .eq("biometrics_locked", true)
      .limit(1)
      .maybeSingle();
    if (!identity)
      return { ok: false, error: "Your identity isn't locked, so you can edit it now." };

    const { data: open } = await admin
      .from("identity_change_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (open) {
      return {
        ok: false,
        error:
          open.status === "pending"
            ? "You already have a request waiting for an admin."
            : "Your change was already approved. Re-enroll from this page.",
      };
    }

    const { data: created, error } = await admin
      .from("identity_change_requests")
      .insert({ user_id: user.id, person_id: identity.id, reason: parsed.data })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Couldn't send your request." };
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "identity.change_request",
      target_id: created.id,
      meta: null,
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Withdraws the caller's own pending change request. */
export async function cancelIdentityChange(input: { requestId: string }): Promise<ActionResult> {
  try {
    const { user } = await requireMember();
    const requestId = z.uuid().parse(input.requestId);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("identity_change_requests")
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
