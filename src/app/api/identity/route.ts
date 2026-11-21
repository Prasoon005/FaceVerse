import { NextResponse } from "next/server";
import { z } from "zod";

import { recognitionConfig } from "@/config/recognition";
import { getViewer } from "@/lib/admin/server";
import { normalize, toPgVector } from "@/lib/ai/vector";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

const finite = z.number().refine(Number.isFinite);
const { samples, face, voice } = recognitionConfig;

const schema = z.object({
  faceSamples: z
    .array(
      z.object({
        embedding: z.array(finite).length(face.embeddingSize),
        quality: z.number().min(0).max(1),
      }),
    )
    .min(samples.faceMin)
    .max(samples.faceMax + 1),
  voiceSamples: z
    .array(z.array(finite).length(voice.embeddingSize))
    .min(samples.voice)
    .max(samples.voice + 2),
  /** Small JPEG face thumbnail as a data URL (≤ 300 KB). */
  thumbnail: z
    .string()
    .max(400_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .nullable(),
});

export type IdentityResponse =
  | { ok: true; personId: string }
  | {
      ok: false;
      error: "invalid" | "unauthenticated" | "admin" | "locked" | "server";
      message: string;
    };

function reply(body: IdentityResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Final submit of a user's own biometric identity (face + voice). Allowed when the user has no
 * locked identity yet, or an admin approved a change request. Old samples are replaced, the
 * identity is locked, and it waits for admin approval before attendance/biometric login use it.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return reply({ ok: false, error: "server", message: "Identity isn't configured." }, 503);
  }
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.disabled) {
    return reply({ ok: false, error: "unauthenticated", message: "Please sign in again." }, 401);
  }
  if (viewer.profile?.role === "admin") {
    return reply(
      { ok: false, error: "admin", message: "Admin accounts don't have a biometric identity." },
      403,
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply(
      { ok: false, error: "invalid", message: "Some samples were invalid. Please capture again." },
      400,
    );
  }

  const admin = createAdminClient();
  const user = viewer.user;
  const userId = user.id;

  const [{ data: identities, error: listError }, { data: openRequest }] = await Promise.all([
    admin
      .from("people")
      .select("id, biometrics_locked, approval_status, avatar_path, created_at")
      .eq("owner_id", userId)
      .eq("linked_user_id", userId)
      .order("created_at", { ascending: true }),
    admin
      .from("identity_change_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
  ]);
  if (listError)
    return reply({ ok: false, error: "server", message: "Something went wrong." }, 500);

  const locked = (identities ?? []).some((p) => p.biometrics_locked);
  if (locked && !openRequest) {
    return reply(
      {
        ok: false,
        error: "locked",
        message:
          "Your identity is final. Send a change request and wait for an admin to approve it.",
      },
      403,
    );
  }

  try {
    // Keep one identity: prefer the approved one, then the oldest.
    const keep =
      (identities ?? []).find((p) => p.approval_status === "approved") ?? identities?.[0] ?? null;
    let personId = keep?.id;
    if (!personId) {
      const name =
        viewer.profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Me";
      const { data: created, error } = await admin
        .from("people")
        .insert({ owner_id: userId, linked_user_id: userId, name, label: "self" })
        .select("id")
        .single();
      if (error) throw error;
      personId = created.id;
    }
    // Any extra self-identities become ordinary people.
    const extras = (identities ?? []).filter((p) => p.id !== personId).map((p) => p.id);
    if (extras.length > 0) {
      await admin
        .from("people")
        .update({ linked_user_id: null, biometrics_locked: false, approval_status: "approved" })
        .in("id", extras);
    }

    // Replace the samples.
    const { error: delFace } = await admin
      .from("face_embeddings")
      .delete()
      .eq("person_id", personId);
    if (delFace) throw delFace;
    const { error: delVoice } = await admin
      .from("voice_embeddings")
      .delete()
      .eq("person_id", personId);
    if (delVoice) throw delVoice;

    const { error: faceError } = await admin.from("face_embeddings").insert(
      parsed.data.faceSamples.map((s) => ({
        person_id: personId,
        owner_id: userId,
        embedding: toPgVector(normalize(s.embedding)),
        quality: s.quality,
      })),
    );
    if (faceError) throw faceError;
    const { error: voiceError } = await admin.from("voice_embeddings").insert(
      parsed.data.voiceSamples.map((embedding) => ({
        person_id: personId,
        owner_id: userId,
        embedding: toPgVector(normalize(embedding)),
      })),
    );
    if (voiceError) throw voiceError;

    let avatarPath = keep?.avatar_path ?? null;
    if (parsed.data.thumbnail) {
      const bytes = Buffer.from(parsed.data.thumbnail.split(",")[1] ?? "", "base64");
      const path = `${userId}/${personId}.jpg`;
      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
      if (!uploadError) avatarPath = path;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("people")
      .update({
        avatar_path: avatarPath,
        approval_status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        biometrics_locked: true,
        locked_at: now,
      })
      .eq("id", personId);
    if (updateError) throw updateError;

    if (openRequest) {
      await admin
        .from("identity_change_requests")
        .update({ status: "completed", completed_at: now, person_id: personId })
        .eq("id", openRequest.id);
    }
    await admin.from("audit_logs").insert({
      actor_id: userId,
      action: openRequest ? "identity.resubmit" : "identity.submit",
      target_id: personId,
      meta: {
        face_samples: parsed.data.faceSamples.length,
        voice_samples: parsed.data.voiceSamples.length,
      },
    });
    return reply({ ok: true, personId }, 200);
  } catch {
    return reply({ ok: false, error: "server", message: "Couldn't save your identity." }, 500);
  }
}
