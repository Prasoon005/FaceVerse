import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";

import { isSupabaseConfigured } from "./env";

/** Routes under the (app) group. Anything here requires a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/activity",
  "/live",
  "/people",
  "/enroll",
  "/visitors",
  "/albums",
  "/tools",
  "/focus",
  "/settings",
  "/attendance",
  "/leave",
  "/reasons",
  "/messages",
  "/announcements",
  "/identity",
];
/** The admin console has its own sign-in page. */
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";
const AUTH_PAGES = ["/login", "/signup", "/biometric-login"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie and performs optimistic auth redirects.
 * Real authorisation is enforced by RLS and by the (app) layout's server-side check.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): it validates and refreshes the token.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && matches(pathname, [ADMIN_PREFIX]) && pathname !== ADMIN_LOGIN) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (!isSignedIn && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (isSignedIn && matches(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Carries refreshed auth cookies over to a redirect response so the session isn't lost. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
