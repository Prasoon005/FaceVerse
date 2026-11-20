import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { Database } from "@/types/database";

/**
 * Liveness probe used by the keep-alive GitHub Action (every 3 days) so the free
 * Supabase project never pauses. Runs one cheap HEAD query against Postgres.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const timestamp = new Date().toISOString();

  if (!url || !anonKey) {
    return NextResponse.json(
      { status: "error", db: "not_configured", timestamp },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // RLS returns zero rows for anon, but the query still reaches the database.
  const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });

  const ok = !error;
  return NextResponse.json(
    { status: ok ? "ok" : "error", db: ok ? "ok" : "unreachable", timestamp },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
