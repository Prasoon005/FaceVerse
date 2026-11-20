import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`; behaviour is the same.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, model files and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|models/|icons/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|bin|json|wasm)$).*)",
  ],
};
