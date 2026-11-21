"use server";

/** The signed-in user's own profile (name, phone, department, photo). RLS + column grants apply. */
import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s()-]*$/, "Use digits, spaces, + ( ) or - only."),
  department: z.string().trim().max(60),
});

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  return { supabase, user };
}

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  try {
    const { supabase, user } = await signedIn();
    const { fullName, phone, department } = parsed.data;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null, department: department || null })
      .eq("id", user.id);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save." };
  }
}

/** Saves the path of a photo the browser already uploaded to "avatars/<uid>/…" (or clears it). */
export async function setAvatar(path: string | null): Promise<ActionResult> {
  try {
    const { supabase, user } = await signedIn();
    if (path !== null && !new RegExp(`^${user.id}/[\w.-]+$`).test(path)) {
      return { ok: false, error: "Invalid photo." };
    }
    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    if (error) throw error;
    // Remove the previous uploaded photo (Google photo URLs are left alone).
    const old = current?.avatar_url;
    if (old && old !== path && old.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([old]);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save." };
  }
}
