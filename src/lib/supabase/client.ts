import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/** Supabase client for Client Components. Session lives in cookies shared with the server. */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
