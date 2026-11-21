/**
 * Profile photos. `profiles.avatar_url` holds either a full URL (e.g. a Google photo) or a
 * path in the private "avatars" bucket ("<uid>/avatar-123.webp"), which needs a signed URL.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const TTL = 60 * 60; // 1 hour

export function isStoragePath(value: string | null | undefined): value is string {
  return Boolean(value) && !/^https?:\/\//i.test(value as string);
}

/** One avatar → a displayable URL (or null). */
export async function resolveAvatar(
  client: SupabaseClient,
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (!isStoragePath(value)) return value;
  const { data } = await client.storage.from("avatars").createSignedUrl(value, TTL);
  return data?.signedUrl ?? null;
}

/** Many avatars at once (one request for every storage path). Keyed by the original value. */
export async function resolveAvatars(
  client: SupabaseClient,
  values: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const paths = [...new Set(values.filter(isStoragePath))];
  for (const v of values) if (v && !isStoragePath(v)) out.set(v, v);
  if (paths.length) {
    const { data } = await client.storage.from("avatars").createSignedUrls(paths, TTL);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
    }
  }
  return out;
}
