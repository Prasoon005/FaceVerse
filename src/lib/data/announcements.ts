/** Client-side announcement reads for users (RLS limits rows to everyone's + their own). */
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/types/database";

export type AnnouncementItem = Announcement & { read: boolean };

export const announcementKeys = {
  all: ["announcements"] as const,
};

export async function listAnnouncements(limit = 50): Promise<AnnouncementItem[]> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return [];
  const [{ data: rows, error }, { data: reads }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", userId),
  ]);
  if (error) throw error;
  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return (rows ?? []).map((a) => ({ ...a, read: readIds.has(a.id) }));
}

/** Marks announcements as read for the signed-in user (idempotent). */
export async function markAnnouncementsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return;
  await supabase.from("announcement_reads").upsert(
    ids.map((id) => ({ announcement_id: id, user_id: userId })),
    { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
  );
}
