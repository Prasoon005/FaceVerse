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

export type AttendanceResponse =
  | { ok: true; action: "check_in" | "check_out"; at: string; day: string }
  | {
      ok: false;
      error:
        "invalid" | "unauthenticated" | "not_enrolled" | "pending" | "face" | "done" | "server";
      message: string;
    };

function reply(body: AttendanceResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Face attendance (Phase 4A). The signed-in user sends a face embedding captured right
 * after a liveness check; the server matches it against their own approved linked person
 * and records today's check-in, or the check-out on a second scan.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return reply({ ok: false, error: "server", message: "Attendance isn't configured." }, 503);
  }
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.disabled) {
    return reply({ ok: false, error: "unauthenticated", message: "Please sign in again." }, 401);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, error: "invalid", message: "Invalid request." }, 400);
  }

  const admin = createAdminClient();
  const userId = viewer.user.id;

  const { data: linked } = await admin
    .from("people")
    .select("approval_status")
    .eq("linked_user_id", userId)
    .eq("owner_id", userId);
  if (!linked || linked.length === 0) {
    return reply(
      {
        ok: false,
        error: "not_enrolled",
        message: "Set up your face and voice in My identity first; an admin then approves it.",
      },
      403,
    );
  }
  if (!linked.some((p) => p.approval_status === "approved")) {
    return reply(
      {
        ok: false,
        error: "pending",
        message: linked.some((p) => p.approval_status === "pending")
          ? "Your face enrollment is waiting for admin approval."
          : "Your face enrollment was rejected. Re-enroll and ask an admin to approve it.",
      },
      403,
    );
  }

  const { data: score, error: scoreError } = await admin.rpc("verify_face", {
    target_user: userId,
    query: toPgVector(normalize(parsed.data.faceEmbedding)),
  });
  if (scoreError) {
    return reply({ ok: false, error: "server", message: "Something went wrong." }, 500);
  }
  const faceScore = score ?? 0;
  if (faceScore < recognitionConfig.face.match) {
    return reply(
      {
        ok: false,
        error: "face",
        message: "Your face didn't match your enrolled samples. Face the light and try again.",
      },
      401,
    );
  }

  const result = await markAttendance(admin, userId, faceScore, "self");
  if (result.ok) return reply(result, 200);
  return result.error === "done"
    ? reply({ ok: false, error: "done", message: "You've already checked in and out today." }, 409)
    : reply({ ok: false, error: "server", message: "Couldn't save." }, 500);
}
