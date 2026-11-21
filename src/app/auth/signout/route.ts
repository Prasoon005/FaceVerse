import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** POST-only sign out so it can't be triggered by a prefetch or an <img> tag. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // ?to=admin sends admins back to the admin sign-in page.
  const to = request.nextUrl.searchParams.get("to") === "admin" ? "/admin/login" : "/login";
  return NextResponse.redirect(new URL(to, request.nextUrl.origin), { status: 303 });
}
