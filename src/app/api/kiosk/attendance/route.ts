import { NextResponse } from "next/server";
import { z } from "zod";

import { recognitionConfig } from "@/config/recognition";
import { getViewer } from "@/lib/admin/server";
import { normalize, toPgVector } from "@/lib/ai/vector";
import { markAttendance } from "@/lib/attendance/mark";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

const schema = z.object({
  faceEmbedding: z
    .array(z.number().refine(Number.isFinite))
    .length(recognitionConfig.face.embeddingSize),
  livenessPassed: z.literal(true),
});

export type KioskResponse =
  | {
      ok: true;
      action: "check_in" | "check_out";
      at: string;
      name: string;
      avatarUrl: string | null;
      score: number;
    }
  | {
      ok: false;
      error: "invalid" | "forbidden" | "unknown" | "done" | "server";
      message: string;
      name?: string;
    };

function reply(body: KioskResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Kiosk attendance: an admin's device sends a live face embedding; the server finds the best
 * matching approved member (with a margin over the runner-up, so look-alikes are refused)
 * and records their check-in or check-out.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return reply({ ok: false, error: "server", message: "Kiosk isn't configured." }, 503);
  }
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.role !== "admin" || viewer.profile.disabled) {
    return reply({ ok: false, error: "forbidden", message: "Only admins can run the kiosk." }, 403);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, error: "invalid", message: "Invalid request." }, 400);
  }

  const admin = createAdminClient();
  const { data: matches, error } = await admin.rpc("identify_user", {
    query: toPgVector(normalize(parsed.data.faceEmbedding)),
  });
  if (error) return reply({ ok: false, error: "server", message: "Something went wrong." }, 500);

  const [best, second] = matches ?? [];
  const { match, margin } = recognitionConfig.face;
  if (
    !best ||
    best.similarity < match ||
    (second && best.similarity - second.similarity < margin)
  ) {
    return reply(
      {
        ok: false,
        error: "unknown",
        message: "Face not recognised. Make sure your identity is approved, then try again.",
      },
      404,
    );
  }

  const [{ data: profile }, { data: identity }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", best.user_id).maybeSingle(),
    admin
      .from("people")
      .select("name, avatar_path")
      .eq("owner_id", best.user_id)
      .eq("linked_user_id", best.user_id)
      .eq("approval_status", "approved")
      .limit(1)
      .maybeSingle(),
  ]);
  const name = profile?.full_name || identity?.name || "Member";

  const result = await markAttendance(admin, best.user_id, best.similarity, "kiosk");
  if (!result.ok) {
    return result.error === "done"
      ? reply(
          {
            ok: false,
            error: "done",
            name,
            message: `${name} has already checked in and out today.`,
          },
          409,
        )
      : reply({ ok: false, error: "server", message: "Couldn't save." }, 500);
  }

  let avatarUrl: string | null = null;
  if (identity?.avatar_path) {
    const { data } = await admin.storage.from("avatars").createSignedUrl(identity.avatar_path, 600);
    avatarUrl = data?.signedUrl ?? null;
  }
  return reply(
    { ok: true, action: result.action, at: result.at, name, avatarUrl, score: best.similarity },
    200,
  );
}
