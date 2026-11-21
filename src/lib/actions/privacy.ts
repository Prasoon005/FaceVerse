"use server";

/** Privacy Server Actions (PROJECT_SPEC §9): delete all my biometrics. */
import { refresh } from "next/cache";

import { requireMember } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ActionResult } from "./admin";

async function removeFolder(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  folder: string,
) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
  return paths.length;
}

/**
 * Removes every face and voice embedding the user owns (all enrolled people, including their
 * own identity), the face index of their albums, avatars and visitor snapshots. Album photos
 * themselves, attendance and leave records stay. Typed confirmation is checked here too.
 */
export async function deleteMyBiometrics(input: { confirm: string }): Promise<ActionResult> {
  try {
    if (input.confirm.trim() !== "DELETE") return { ok: false, error: 'Type "DELETE" to confirm.' };
    const { user } = await requireMember();
    const admin = createAdminClient();

    const [{ count: people }, { count: albumFaces }] = await Promise.all([
      admin.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      admin
        .from("photo_faces")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
    ]);
    // People cascade to face/voice embeddings, recognition events' person link and visitor logs.
    const { error: peopleError } = await admin.from("people").delete().eq("owner_id", user.id);
    if (peopleError) throw peopleError;
    const { error: facesError } = await admin.from("photo_faces").delete().eq("owner_id", user.id);
    if (facesError) throw facesError;
    await admin.from("album_photos").update({ face_count: 0 }).eq("owner_id", user.id);
    await admin
      .from("identity_change_requests")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"]);
    await admin.from("profiles").update({ biometric_login_enabled: false }).eq("id", user.id);

    const avatars = await removeFolder(admin, "avatars", user.id);
    const snapshots = await removeFolder(admin, "visitor-snapshots", user.id);

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "privacy.delete_biometrics",
      target_id: user.id,
      meta: { people: people ?? 0, album_faces: albumFaces ?? 0, avatars, snapshots },
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
