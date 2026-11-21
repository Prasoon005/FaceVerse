/**
 * Visitor log data access (Phase 4B). Runs as the signed-in user; RLS keeps everything to the
 * user's own visitors. A visitor is a person with label "visitor"; each visit is a log row.
 */
import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";
import { toCsv } from "@/lib/attendance/days";

import { addFaceSamples, createPerson, signAvatarUrls, uploadAvatar } from "./people";

export const SNAPSHOT_BUCKET = "visitor-snapshots";
export const VISITOR_LABEL = "visitor";

export const visitorKeys = {
  all: ["visitors"] as const,
  list: (filters: VisitFilters) => [...visitorKeys.all, "list", filters] as const,
  profile: (personId: string) => [...visitorKeys.all, "profile", personId] as const,
  stats: () => [...visitorKeys.all, "stats"] as const,
};

export type VisitStatus = "all" | "inside" | "left";
export type VisitFilters = { from: string; to: string; status: VisitStatus; search: string };

export type VisitRow = {
  id: string;
  personId: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  purpose: string | null;
  host: string | null;
  checkIn: string;
  checkOut: string | null;
  snapshotPath: string | null;
};

async function requireUserId() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Please sign in again.");
  return { supabase, userId: id };
}

/** Start/end of local calendar days as ISO timestamps (filters use the browser's timezone). */
export function dayStartIso(day: string) {
  return new Date(`${day}T00:00:00`).toISOString();
}
export function dayEndIso(day: string) {
  return new Date(`${day}T23:59:59.999`).toISOString();
}
export function todayLocal(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export async function listVisits(filters: VisitFilters): Promise<VisitRow[]> {
  const { supabase, userId } = await requireUserId();
  let query = supabase
    .from("visitor_logs")
    .select("*")
    .eq("owner_id", userId)
    .gte("check_in", dayStartIso(filters.from))
    .lte("check_in", dayEndIso(filters.to))
    .order("check_in", { ascending: false })
    .limit(500);
  if (filters.status === "inside") query = query.is("check_out", null);
  if (filters.status === "left") query = query.not("check_out", "is", null);
  const { data: logs, error } = await query;
  if (error) throw error;

  const personIds = [...new Set(logs.map((l) => l.person_id))];
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, name, avatar_path").in("id", personIds)
    : { data: [] };
  const urls = await signAvatarUrls((people ?? []).map((p) => p.avatar_path));
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const q = filters.search.trim().toLowerCase();
  return logs
    .map((l) => {
      const person = byId.get(l.person_id);
      return {
        id: l.id,
        personId: l.person_id,
        name: person?.name ?? "Deleted visitor",
        avatarUrl: person?.avatar_path ? (urls.get(person.avatar_path) ?? null) : null,
        phone: l.phone,
        purpose: l.purpose,
        host: l.host_name,
        checkIn: l.check_in,
        checkOut: l.check_out,
        snapshotPath: l.snapshot_path,
      };
    })
    .filter(
      (r) =>
        !q ||
        `${r.name} ${r.phone ?? ""} ${r.purpose ?? ""} ${r.host ?? ""}`.toLowerCase().includes(q),
    );
}

export type VisitorStats = { insideNow: number; today: number; uniqueThisWeek: number };

export async function getVisitorStats(): Promise<VisitorStats> {
  const { supabase, userId } = await requireUserId();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [inside, today, week] = await Promise.all([
    supabase
      .from("visitor_logs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .is("check_out", null),
    supabase
      .from("visitor_logs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .gte("check_in", dayStartIso(todayLocal())),
    supabase
      .from("visitor_logs")
      .select("person_id")
      .eq("owner_id", userId)
      .gte("check_in", weekAgo),
  ]);
  return {
    insideNow: inside.count ?? 0,
    today: today.count ?? 0,
    uniqueThisWeek: new Set((week.data ?? []).map((r) => r.person_id)).size,
  };
}

export type VisitorProfile = {
  personId: string;
  name: string;
  label: string | null;
  listType: "none" | "allowed" | "flagged";
  avatarUrl: string | null;
  visits: {
    id: string;
    checkIn: string;
    checkOut: string | null;
    purpose: string | null;
    host: string | null;
    phone: string | null;
  }[];
  openVisitId: string | null;
};

/** A recognised person's visit history (up to 10) and any visit still open. */
export async function getVisitorProfile(personId: string): Promise<VisitorProfile | null> {
  const supabase = createClient();
  const [{ data: person }, { data: visits }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, label, list_type, avatar_path")
      .eq("id", personId)
      .maybeSingle(),
    supabase
      .from("visitor_logs")
      .select("id, check_in, check_out, purpose, host_name, phone")
      .eq("person_id", personId)
      .order("check_in", { ascending: false })
      .limit(10),
  ]);
  if (!person) return null;
  const urls = await signAvatarUrls([person.avatar_path]);
  const rows = (visits ?? []).map((v) => ({
    id: v.id,
    checkIn: v.check_in,
    checkOut: v.check_out,
    purpose: v.purpose,
    host: v.host_name,
    phone: v.phone,
  }));
  return {
    personId: person.id,
    name: person.name,
    label: person.label,
    listType: person.list_type,
    avatarUrl: person.avatar_path ? (urls.get(person.avatar_path) ?? null) : null,
    visits: rows,
    openVisitId: rows.find((v) => v.checkOut === null)?.id ?? null,
  };
}

export type VisitDetails = { purpose?: string; host?: string; phone?: string };

const clean = (v?: string, max = 200) => v?.trim().slice(0, max) || null;

/** Opens a visit for an existing person, optionally with a compressed snapshot. */
export async function checkInVisitor(
  personId: string,
  details: VisitDetails,
  snapshot?: Blob | null,
): Promise<string> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("visitor_logs")
    .insert({
      owner_id: userId,
      person_id: personId,
      purpose: clean(details.purpose),
      host_name: clean(details.host, 120),
      phone: clean(details.phone, 32),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("This visitor is already checked in.");
    throw error;
  }
  if (snapshot) {
    // A failed snapshot shouldn't undo the check-in.
    try {
      const file = new File([snapshot], "snapshot.jpg", { type: "image/jpeg" });
      const small = await imageCompression(file, {
        maxWidthOrHeight: 640,
        initialQuality: 0.8,
        fileType: "image/jpeg",
        useWebWorker: false,
      });
      const path = `${userId}/${data.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(SNAPSHOT_BUCKET)
        .upload(path, small, { upsert: true, contentType: "image/jpeg" });
      if (!uploadError) {
        await supabase.from("visitor_logs").update({ snapshot_path: path }).eq("id", data.id);
      }
    } catch {
      // ignore
    }
  }
  await supabase.from("recognition_events").insert({
    owner_id: userId,
    person_id: personId,
    source: "visitor",
  });
  return data.id;
}

/** Registers a new visitor (person + face sample + photo) and checks them in. */
export async function registerVisitor(input: {
  name: string;
  details: VisitDetails;
  embedding: Float32Array;
  quality: number;
  thumbnail: Blob;
  saveSnapshot: boolean;
}): Promise<{ personId: string; visitId: string }> {
  const person = await createPerson({
    name: input.name,
    label: VISITOR_LABEL,
    listType: "none",
    notes: null,
    linkToMe: false,
  });
  await addFaceSamples(person.id, [{ embedding: input.embedding, quality: input.quality }]);
  await uploadAvatar(person.id, input.thumbnail).catch(() => undefined);
  const visitId = await checkInVisitor(
    person.id,
    input.details,
    input.saveSnapshot ? input.thumbnail : null,
  );
  return { personId: person.id, visitId };
}

export async function checkOutVisit(visitId: string) {
  const { data, error } = await createClient()
    .from("visitor_logs")
    .update({ check_out: new Date().toISOString() })
    .eq("id", visitId)
    .is("check_out", null)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("This visit was already checked out.");
}

export async function snapshotUrl(path: string) {
  const { data } = await createClient().storage.from(SNAPSHOT_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "";

function durationMinutes(row: VisitRow) {
  if (!row.checkOut) return "";
  return Math.round((new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 60000);
}

/** CSV with a UTF-8 BOM so Excel opens names and symbols correctly. */
export function visitsToCsv(rows: VisitRow[]): string {
  const header = ["Name", "Phone", "Purpose", "Host", "Check-in", "Check-out", "Minutes", "Status"];
  const body = rows.map((r) => [
    r.name,
    r.phone,
    r.purpose,
    r.host,
    fmt(r.checkIn),
    fmt(r.checkOut),
    durationMinutes(r),
    r.checkOut ? "Left" : "Inside",
  ]);
  return "﻿" + toCsv([header, ...body]);
}
