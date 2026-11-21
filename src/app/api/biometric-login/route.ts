import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";

import { recognitionConfig } from "@/config/recognition";
import {
  type BiometricLoginResponse,
  biometricLoginSchema,
  evaluateAttempt,
  failureMessages,
  isLockedOut,
  lockoutWindowStart,
} from "@/lib/auth/biometric";
import { normalize, toPgVector } from "@/lib/ai/vector";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const NOT_AVAILABLE = "Biometric login isn't set up for this email. Use your password instead.";

function reply(body: BiometricLoginResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Keyed hash so stored IPs can't be reversed by brute-forcing the IPv4 space. */
function hashIp(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Biometric login (PROJECT_SPEC §4 step 5). The browser sends the embeddings it computed;
 * this route re-checks them against the user's enrolled samples with the service role,
 * applies rate limits, logs every attempt in auth_attempts and, on success, issues a
 * session by exchanging a server-generated magic-link token. Demo-grade second factor:
 * liveness and the phrase check run on the client and can't be proven here.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return reply({ ok: false, error: "server", message: "Biometric login isn't configured." }, 503);
  }

  const parsed = biometricLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, error: "invalid", message: "Invalid request." }, 400);
  }
  const { email, faceEmbedding, voiceEmbedding, livenessPassed, phraseScore } = parsed.data;

  const admin = createAdminClient();
  const ipHash = hashIp(request);
  const since = lockoutWindowStart().toISOString();
  const { maxFailures, ipMaxFailures, windowMinutes } = recognitionConfig.biometricLogin;
  const locked: BiometricLoginResponse = {
    ok: false,
    error: "locked",
    message: `Too many failed attempts. Try again in ${windowMinutes} minutes or use your password.`,
  };

  const ipFailures = await admin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("success", false)
    .gte("created_at", since);
  if (isLockedOut(ipFailures.count ?? 0, ipMaxFailures)) return reply(locked, 429);

  const { data: userId, error: lookupError } = await admin.rpc("user_id_by_email", {
    target_email: email,
  });
  if (lookupError) {
    return reply({ ok: false, error: "server", message: "Something went wrong." }, 500);
  }

  if (userId) {
    const userFailures = await admin
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("success", false)
      .gte("created_at", since);
    if (isLockedOut(userFailures.count ?? 0, maxFailures)) return reply(locked, 429);
  }

  const { data: profile } = userId
    ? await admin
        .from("profiles")
        .select("biometric_login_enabled, disabled")
        .eq("id", userId)
        .maybeSingle()
    : { data: null };

  if (!userId || !profile?.biometric_login_enabled || profile.disabled) {
    await admin.from("auth_attempts").insert({
      user_id: userId ?? null,
      liveness_passed: livenessPassed,
      success: false,
      ip_hash: ipHash,
    });
    return reply({ ok: false, error: "not_available", message: NOT_AVAILABLE }, 401);
  }

  // Never trust the client's normalisation.
  // Voice is optional: checked only when the user recorded a phrase.
  const [face, voice] = await Promise.all([
    admin.rpc("verify_face", {
      target_user: userId,
      query: toPgVector(normalize(faceEmbedding)),
    }),
    voiceEmbedding
      ? admin.rpc("verify_voice", {
          target_user: userId,
          query: toPgVector(normalize(voiceEmbedding)),
        })
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (face.error || voice.error) {
    return reply({ ok: false, error: "server", message: "Something went wrong." }, 500);
  }
  const faceScore = face.data ?? 0;
  const voiceScore = voiceEmbedding ? (voice.data ?? 0) : null;
  const { success, reasons } = evaluateAttempt({
    livenessPassed,
    faceScore,
    voiceScore,
    phraseScore: voiceEmbedding ? phraseScore : null,
  });

  await admin.from("auth_attempts").insert({
    user_id: userId,
    face_score: faceScore,
    voice_score: voiceScore,
    liveness_passed: livenessPassed,
    success,
    ip_hash: ipHash,
  });

  if (!success) {
    // Reasons, not scores: exact scores would help someone tune a spoof.
    return reply(
      {
        ok: false,
        error: "failed",
        message: reasons.map((r) => failureMessages[r]).join(" "),
        reasons,
      },
      401,
    );
  }

  // Issue a session: generate a one-time magic-link token (no email is sent) and
  // verify it right away with the cookie-based client, which sets the auth cookies.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return reply({ ok: false, error: "server", message: "Couldn't start a session." }, 500);
  }
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) {
    return reply({ ok: false, error: "server", message: "Couldn't start a session." }, 500);
  }

  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "auth.biometric_login",
    target_id: userId,
  });

  return reply({ ok: true }, 200);
}
