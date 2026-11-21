/**
 * Client-side data access for enrolled people. All queries run as the signed-in
 * user; Row Level Security limits them to the user's own rows.
 */
import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";
import { toPgVector } from "@/lib/ai/vector";
import type { Person, PersonOverview } from "@/types/database";

export const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

export const peopleKeys = {
  all: ["people"] as const,
  list: () => [...peopleKeys.all, "list"] as const,
  detail: (id: string) => [...peopleKeys.all, "detail", id] as const,
};

export type PersonListItem = PersonOverview & { avatarUrl: string | null };

export type FaceSampleInput = { embedding: Float32Array; quality: number };

export type NewPersonInput = {
  name: string;
  label?: string | null;
  listType: Person["list_type"];
  notes?: string | null;
  linkToMe: boolean;
};

async function requireUserId() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Please sign in again.");
  return { supabase, userId: id };
}

/** Signed URLs for private avatar objects, keyed by storage path. */
export async function signAvatarUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await createClient()
    .storage.from(AVATAR_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  data?.forEach((item) => {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  });
  return urls;
}

export async function listPeople(): Promise<PersonListItem[]> {
  // Admins can read everyone's people through RLS; this list is always the caller's own.
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("people_overview")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const urls = await signAvatarUrls(data.map((p) => p.avatar_path));
  return data.map((p) => ({
    ...p,
    avatarUrl: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null,
  }));
}

export type PersonDetail = {
  person: PersonListItem;
  samples: { id: string; quality: number | null; created_at: string }[];
  events: { id: string; similarity: number | null; source: string; created_at: string }[];
};

export async function getPerson(id: string): Promise<PersonDetail | null> {
  const supabase = createClient();
  const [personRes, samplesRes, eventsRes] = await Promise.all([
    supabase.from("people_overview").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("face_embeddings")
      .select("id, quality, created_at")
      .eq("person_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("recognition_events")
      .select("id, similarity, source, created_at")
      .eq("person_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (personRes.error) throw personRes.error;
  if (!personRes.data) return null;
  if (samplesRes.error) throw samplesRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const p = personRes.data;
  const urls = await signAvatarUrls([p.avatar_path]);
  return {
    person: { ...p, avatarUrl: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null },
    samples: samplesRes.data,
    events: eventsRes.data,
  };
}

export async function createPerson(input: NewPersonInput): Promise<Person> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("people")
    .insert({
      owner_id: userId,
      name: input.name.trim(),
      label: input.label?.trim() || null,
      list_type: input.listType,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addFaceSamples(personId: string, samples: FaceSampleInput[]) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("face_embeddings").insert(
    samples.map((s) => ({
      person_id: personId,
      owner_id: userId,
      embedding: toPgVector(s.embedding),
      quality: s.quality,
    })),
  );
  if (error) throw error;
}

export async function addVoiceSamples(personId: string, embeddings: Float32Array[]) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("voice_embeddings").insert(
    embeddings.map((embedding) => ({
      person_id: personId,
      owner_id: userId,
      embedding: toPgVector(embedding),
    })),
  );
  if (error) throw error;
}

export async function deleteVoiceSamples(personId: string) {
  const { error } = await createClient()
    .from("voice_embeddings")
    .delete()
    .eq("person_id", personId);
  if (error) throw error;
}

export async function deleteFaceSample(sampleId: string) {
  const { error } = await createClient().from("face_embeddings").delete().eq("id", sampleId);
  if (error) throw error;
}

/** Compresses (≤256px JPEG) and uploads a face thumbnail, then stores its path on the person. */
export async function uploadAvatar(personId: string, image: Blob) {
  const { supabase, userId } = await requireUserId();
  const file = new File([image], "avatar.jpg", { type: "image/jpeg" });
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 256,
    initialQuality: 0.8,
    fileType: "image/jpeg",
    useWebWorker: false,
  });
  const path = `${userId}/${personId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("people").update({ avatar_path: path }).eq("id", personId);
  if (error) throw error;
  return path;
}

/** Deletes a person (embeddings and events cascade), their avatar, and writes an audit entry. */
export async function deletePerson(person: Pick<Person, "id" | "name" | "avatar_path">) {
  const { supabase, userId } = await requireUserId();
  if (person.avatar_path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([person.avatar_path]);
  }
  const { error } = await supabase.from("people").delete().eq("id", person.id);
  if (error) throw error;
  await supabase.from("audit_logs").insert({
    actor_id: userId,
    action: "person.delete",
    target_id: person.id,
    meta: { name: person.name },
  });
}

export async function logAudit(
  action: string,
  targetId: string | null,
  meta?: Record<string, string | number>,
) {
  const { supabase, userId } = await requireUserId();
  await supabase.from("audit_logs").insert({ actor_id: userId, action, target_id: targetId, meta });
}
