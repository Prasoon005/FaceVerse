/**
 * Member ⇄ admin team messaging. One thread per member (thread_user_id = the member's id);
 * every admin can read and reply. RLS enforces who can read and send.
 */
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export const messageKeys = {
  all: ["messages"] as const,
  thread: (threadUserId: string) => [...messageKeys.all, "thread", threadUserId] as const,
  inbox: () => [...messageKeys.all, "inbox"] as const,
};

export async function currentUserId() {
  const { data } = await createClient().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Please sign in again.");
  return id;
}

export async function listThread(threadUserId: string, limit = 200): Promise<Message[]> {
  const { data, error } = await createClient()
    .from("messages")
    .select("*")
    .eq("thread_user_id", threadUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendMessage(threadUserId: string, body: string): Promise<Message> {
  const senderId = await currentUserId();
  const text = body.trim().slice(0, 2000);
  if (!text) throw new Error("Write a message first.");
  const { data, error } = await createClient()
    .from("messages")
    .insert({ thread_user_id: threadUserId, sender_id: senderId, body: text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Marks the other side's messages in a thread as read. */
export async function markThreadRead(threadUserId: string, viewerId: string) {
  await createClient()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_user_id", threadUserId)
    .neq("sender_id", viewerId)
    .is("read_at", null);
}

export type InboxThread = {
  userId: string;
  name: string;
  lastMessage: string | null;
  lastAt: string | null;
  lastFromMember: boolean;
  unread: number;
};

/** Admin inbox: every member with their latest message and unread count (newest first). */
export async function listInbox(): Promise<InboxThread[]> {
  const supabase = createClient();
  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, disabled").eq("role", "member"),
    supabase
      .from("messages")
      .select("thread_user_id, sender_id, body, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const latest = new Map<string, { body: string; at: string; fromMember: boolean }>();
  const unread = new Map<string, number>();
  for (const m of messages ?? []) {
    const fromMember = m.sender_id === m.thread_user_id;
    if (!latest.has(m.thread_user_id)) {
      latest.set(m.thread_user_id, { body: m.body, at: m.created_at, fromMember });
    }
    if (fromMember && !m.read_at)
      unread.set(m.thread_user_id, (unread.get(m.thread_user_id) ?? 0) + 1);
  }
  return (members ?? [])
    .filter((p) => !p.disabled)
    .map((p) => {
      const last = latest.get(p.id);
      return {
        userId: p.id,
        name: p.full_name || "User",
        lastMessage: last?.body ?? null,
        lastAt: last?.at ?? null,
        lastFromMember: last?.fromMember ?? false,
        unread: unread.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || a.name.localeCompare(b.name));
}

/** Unread messages for the bell: from admins (member view) or from members (admin view). */
export async function unreadMessages(asAdmin: boolean, viewerId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("thread_user_id, sender_id, body, created_at")
    .is("read_at", null)
    .neq("sender_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []).filter((m) =>
    asAdmin ? m.sender_id === m.thread_user_id : m.thread_user_id === viewerId,
  );
  return {
    count: rows.length,
    latest: rows[0] ?? null,
    threads: new Set(rows.map((r) => r.thread_user_id)).size,
  };
}
