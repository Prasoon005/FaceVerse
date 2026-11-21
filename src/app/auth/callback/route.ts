import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validations/auth";

/**
 * Landing point for Google OAuth (PKCE `code`) and email links (`token_hash` + `type`).
 * Exchanges the token for a session cookie, then redirects.
 *
 * Email links should use the token_hash template (see README → Configure authentication):
 * it is verified server-side, so it works even when the link is opened in another
 * browser or the Gmail app, unlike the default PKCE link.
 */
const CONFIRMED = "/auth/confirmed";

/** Errors that mean "this browser can't finish the PKCE flow", not "the email isn't verified". */
function isVerifierError(message: string) {
  return /code verifier|code_verifier|both auth code and code verifier|flow state/i.test(message);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Supabase reports failures (e.g. an expired or already-used link) via these params.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  const isEmailConfirmation =
    next === CONFIRMED || type === "signup" || type === "email" || type === "invite";

  const supabase = await createClient();

  let error: { message: string } | null = providerError ? { message: providerError } : null;
  if (!error && code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (!error && tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (!error) {
    // Usually an email link that was already used (e.g. pre-opened by a mail scanner).
    // The address is most likely confirmed: show the confirmation page with a sign-in button.
    const url = new URL(CONFIRMED, origin);
    url.searchParams.set("state", "used");
    return NextResponse.redirect(url);
  }

  if (error) {
    // Supabase verifies the email before redirecting here, so an email link opened in another
    // browser/device (no PKCE verifier) still means "confirmed, please sign in".
    if (isEmailConfirmation && isVerifierError(error.message)) {
      const url = new URL(CONFIRMED, origin);
      url.searchParams.set("state", "signin");
      return NextResponse.redirect(url);
    }
    const url = new URL("/login", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(isEmailConfirmation ? CONFIRMED : next, origin));
}
