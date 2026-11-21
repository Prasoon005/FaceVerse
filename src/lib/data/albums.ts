/**
 * Event photo finder (Phase 5). Photos are compressed and face-indexed in the browser, then
 * uploaded to the private album-photos bucket; RLS keeps albums to their owner.
 */
import imageCompression from "browser-image-compression";

import { recognitionConfig } from "@/config/recognition";
import { detectFaces } from "@/lib/ai/face";
import { toPgVector } from "@/lib/ai/vector";
import { createClient } from "@/lib/supabase/client";
import type { Album, Json } from "@/types/database";

export const ALBUM_BUCKET = "album-photos";
const URL_TTL = 60 * 60;

export const albumKeys = {
  all: ["albums"] as const,
  list: () => [...albumKeys.all, "list"] as const,
  detail: (id: string) => [...albumKeys.all, "detail", id] as const,
};

export type NormBox = { x: number; y: number; w: number; h: number };

export type AlbumCard = Album & { photoCount: number; faceCount: number; coverUrl: string | null };

export type PhotoItem = {
  id: string;
  url: string | null;
  path: string;
  width: number | null;
  height: number | null;
  faceCount: number;
  createdAt: string;
};

async function requireUserId() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Please sign in again.");
  return { supabase, userId: id };
}

async function signPaths(paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await createClient().storage.from(ALBUM_BUCKET).createSignedUrls(paths, URL_TTL);
  data?.forEach((d) => {
    if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  });
  return urls;
}

export async function listAlbums(): Promise<AlbumCard[]> {
  const { supabase, userId } = await requireUserId();
  const [{ data: albums, error }, { data: photos }] = await Promise.all([
    supabase
      .from("albums")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("album_photos")
      .select("album_id, storage_path, face_count, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw error;
  const stats = new Map<string, { count: number; faces: number; cover: string }>();
  for (const p of photos ?? []) {
    const s = stats.get(p.album_id);
    if (s) {
      s.count++;
      s.faces += p.face_count;
    } else stats.set(p.album_id, { count: 1, faces: p.face_count, cover: p.storage_path });
  }
  const urls = await signPaths([...stats.values()].map((s) => s.cover));
  return (albums ?? []).map((a) => {
    const s = stats.get(a.id);
    return {
      ...a,
      photoCount: s?.count ?? 0,
      faceCount: s?.faces ?? 0,
      coverUrl: s ? (urls.get(s.cover) ?? null) : null,
    };
  });
}

export async function createAlbum(input: { title: string; eventDate: string | null }) {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("albums")
    .insert({ owner_id: userId, title: input.title.trim(), event_date: input.eventDate || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAlbum(id: string): Promise<{ album: Album; photos: PhotoItem[] } | null> {
  const supabase = createClient();
  const [{ data: album }, { data: photos, error }] = await Promise.all([
    supabase.from("albums").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("album_photos")
      .select("*")
      .eq("album_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  if (!album) return null;
  const urls = await signPaths((photos ?? []).map((p) => p.storage_path));
  return {
    album,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      url: urls.get(p.storage_path) ?? null,
      path: p.storage_path,
      width: p.width,
      height: p.height,
      faceCount: p.face_count,
      createdAt: p.created_at,
    })),
  };
}

export async function setAlbumPublic(id: string, isPublic: boolean) {
  const { error } = await createClient()
    .from("albums")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAlbum(id: string) {
  const { supabase } = await requireUserId();
  const { data: photos } = await supabase
    .from("album_photos")
    .select("storage_path")
    .eq("album_id", id);
  const paths = (photos ?? []).map((p) => p.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(ALBUM_BUCKET).remove(paths.slice(i, i + 100));
  }
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) throw error;
}

export async function deletePhoto(photo: { id: string; path: string }) {
  const supabase = createClient();
  await supabase.storage.from(ALBUM_BUCKET).remove([photo.path]);
  const { error } = await supabase.from("album_photos").delete().eq("id", photo.id);
  if (error) throw error;
}

export type UploadStage = "compressing" | "detecting" | "uploading" | "done" | "error";

/** Faces in an image as normalised boxes + embeddings (small faces skipped). */
export async function indexImage(image: Blob) {
  const bitmap = await createImageBitmap(image);
  const { width, height } = bitmap;
  const result = await detectFaces(bitmap, { fresh: true });
  const faces = result.faces
    .filter((f) => f.embedding && f.box.width >= recognitionConfig.albums.minFaceSize)
    .map((f) => ({
      embedding: f.embedding!,
      box: {
        x: f.box.x / width,
        y: f.box.y / height,
        w: f.box.width / width,
        h: f.box.height / height,
      } satisfies NormBox,
    }));
  return { width, height, faces };
}

/** Compress → detect faces → upload → save the photo and its face embeddings. */
export async function uploadAlbumPhoto(
  albumId: string,
  file: File,
  onStage: (stage: UploadStage) => void,
): Promise<{ faces: number }> {
  const { supabase, userId } = await requireUserId();
  onStage("compressing");
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: recognitionConfig.albums.maxSide,
    initialQuality: 0.8,
    fileType: "image/jpeg",
    useWebWorker: true,
  });
  onStage("detecting");
  const { width, height, faces } = await indexImage(compressed);

  onStage("uploading");
  const path = `${userId}/${albumId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(ALBUM_BUCKET)
    .upload(path, compressed, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { data: photo, error } = await supabase
    .from("album_photos")
    .insert({
      album_id: albumId,
      owner_id: userId,
      storage_path: path,
      width,
      height,
      size_bytes: compressed.size,
      face_count: faces.length,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from(ALBUM_BUCKET).remove([path]);
    throw error;
  }
  if (faces.length > 0) {
    const { error: facesError } = await supabase.from("photo_faces").insert(
      faces.map((f) => ({
        photo_id: photo.id,
        album_id: albumId,
        owner_id: userId,
        embedding: toPgVector(f.embedding),
        box: f.box as unknown as Json,
      })),
    );
    if (facesError) throw facesError;
  }
  onStage("done");
  return { faces: faces.length };
}

export type FoundPhoto = { photoId: string; similarity: number; box: NormBox };

export async function findInAlbum(albumId: string, embedding: Float32Array): Promise<FoundPhoto[]> {
  const { data, error } = await createClient().rpc("find_in_album", {
    target_album: albumId,
    query: toPgVector(embedding),
    match_threshold: recognitionConfig.albums.findThreshold,
  });
  if (error) throw error;
  return (data ?? [])
    .map((r) => ({
      photoId: r.photo_id,
      similarity: r.similarity,
      box: r.box as unknown as NormBox,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

/** Best (largest) face embedding in an uploaded selfie, or null if none. */
export async function selfieEmbedding(file: File): Promise<Float32Array | null> {
  const small = await imageCompression(file, {
    maxWidthOrHeight: 1024,
    fileType: "image/jpeg",
    useWebWorker: true,
  });
  const { faces } = await indexImage(small);
  const best = [...faces].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0];
  return best?.embedding ?? null;
}

/** Downloads the given photo URLs as one ZIP (built in the browser with JSZip). */
export async function downloadZip(
  name: string,
  photos: { url: string; filename: string }[],
  onProgress?: (done: number, total: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let done = 0;
  for (const p of photos) {
    const res = await fetch(p.url);
    zip.file(p.filename, await res.blob());
    onProgress?.(++done, photos.length);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, "_") || "photos"}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
