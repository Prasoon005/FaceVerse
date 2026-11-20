import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** POST-only sign out so it can't be triggered by a prefetch or an <img> tag. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
