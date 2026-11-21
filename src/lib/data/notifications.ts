/** Notification items for the topbar bell, derived from live data (no separate table). */
import type { Portal } from "@/config/site";
import { createClient } from "@/lib/supabase/client";

export type NotificationKind =
  | "question"
  | "decision"
  | "approval"
  | "announcement"
  | "identity-change"
  | "leave"
  | "admin-approvals"
  | "admin-replies"
  | "admin-changes"
  | "admin-leaves";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  at: string | null;
  /** Needs the user to do something (counts towards the badge). */
  actionable: boolean;
};

const WEEK_MS = 7 * 24 * 3600 * 1000;

async function memberNotifications(userId: string, since: string): Promise<NotificationItem[]> {
  const supabase = createClient();
  const [reviews, linked, changes, leaves, announcements, reads] = await Promise.all([
    supabase
      .from("absence_reviews")
      .select("id, day, status, question, decided_at, asked_at, decision_note")
      .eq("user_id", userId)
      .or(`status.eq.asked,decided_at.gte.${since}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("people")
      .select("id, approval_status, reviewed_at, review_note")
      .eq("owner_id", userId)
      .eq("linked_user_id", userId)
      .gte("reviewed_at", since),
    supabase
      .from("identity_change_requests")
      .select("id, status, decided_at, decision_note")
      .eq("user_id", userId)
      .in("status", ["approved", "rejected"])
      .gte("decided_at", since),
    supabase
      .from("leave_requests")
      .select("id, status, start_day, end_day, decided_at, decision_note")
      .eq("user_id", userId)
      .in("status", ["approved", "rejected"])
      .gte("decided_at", since),
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", userId),
  ]);

  const items: NotificationItem[] = [];
  for (const r of reviews.data ?? []) {
    if (r.status === "asked") {
      items.push({
        id: `q-${r.id}`,
        kind: "question",
        title: `Reason needed for ${r.day}`,
        body: r.question ?? "Your admin asked why you were absent.",
        href: "/attendance",
        at: r.asked_at,
        actionable: true,
      });
    } else if (r.status === "approved" || r.status === "rejected") {
      items.push({
        id: `d-${r.id}`,
        kind: "decision",
        title:
          r.status === "approved" ? `Absence on ${r.day} excused` : `Reason for ${r.day} rejected`,
        body:
          r.decision_note ??
          (r.status === "approved" ? "Your admin approved it." : "It stays as absent."),
        href: `/attendance?month=${r.day.slice(0, 7)}`,
        at: r.decided_at,
        actionable: false,
      });
    }
  }
  for (const p of linked.data ?? []) {
    if (p.approval_status === "pending") continue;
    const approved = p.approval_status === "approved";
    items.push({
      id: `a-${p.id}-${p.approval_status}`,
      kind: "approval",
      title: approved ? "Your identity was approved" : "Your identity was rejected",
      body:
        p.review_note ??
        (approved
          ? "You can now mark attendance and use biometric login."
          : "Enroll again from My identity and an admin will review it."),
      href: "/identity",
      at: p.reviewed_at,
      actionable: !approved,
    });
  }
  for (const c of changes.data ?? []) {
    const approved = c.status === "approved";
    items.push({
      id: `c-${c.id}`,
      kind: "identity-change",
      title: approved ? "Change request approved" : "Change request rejected",
      body:
        c.decision_note ??
        (approved
          ? "You can enroll your face and voice one more time."
          : "Your identity stays as it is."),
      href: "/identity",
      at: c.decided_at,
      actionable: approved,
    });
  }
  for (const l of leaves.data ?? []) {
    const range = l.start_day === l.end_day ? l.start_day : `${l.start_day} → ${l.end_day}`;
    items.push({
      id: `l-${l.id}`,
      kind: "leave",
      title: l.status === "approved" ? `Leave approved (${range})` : `Leave rejected (${range})`,
      body:
        l.decision_note ??
        (l.status === "approved" ? "Enjoy your time off!" : "Contact your admin."),
      href: "/leave",
      at: l.decided_at,
      actionable: false,
    });
  }
  const readIds = new Set((reads.data ?? []).map((r) => r.announcement_id));
  for (const a of announcements.data ?? []) {
    if (readIds.has(a.id)) continue;
    items.push({
      id: `n-${a.id}`,
      kind: "announcement",
      title: a.title,
      body: a.body,
      href: "/announcements",
      at: a.created_at,
      actionable: true,
    });
  }
  return items;
}

async function adminNotifications(): Promise<NotificationItem[]> {
  const supabase = createClient();
  const count = (
    table: "people" | "absence_reviews" | "identity_change_requests" | "leave_requests",
    column: string,
    value: string,
  ) => supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  const [approvals, replies, changes, leaves] = await Promise.all([
    count("people", "approval_status", "pending"),
    count("absence_reviews", "status", "answered"),
    count("identity_change_requests", "status", "pending"),
    count("leave_requests", "status", "pending"),
  ]);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const todo: [number, NotificationKind, string, string, string][] = [
    [
      approvals.count ?? 0,
      "admin-approvals",
      "enrollment",
      "Users submitted their face and voice.",
      "/admin/approvals",
    ],
    [
      changes.count ?? 0,
      "admin-changes",
      "change request",
      "Users want to re-enroll their identity.",
      "/admin/change-requests",
    ],
    [
      leaves.count ?? 0,
      "admin-leaves",
      "leave request",
      "Waiting for your decision.",
      "/admin/leaves",
    ],
    [
      replies.count ?? 0,
      "admin-replies",
      "absence reason",
      "Users replied to your questions.",
      "/admin/reviews",
    ],
  ];
  return todo
    .filter(([n]) => n > 0)
    .map(([n, kind, word, body, href]) => ({
      id: kind,
      kind,
      title: `${plural(n, word)} to review`,
      body,
      href,
      at: null,
      actionable: true,
    }));
}

export async function getNotifications(portal: Portal): Promise<NotificationItem[]> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return [];
  const items =
    portal === "admin"
      ? await adminNotifications()
      : await memberNotifications(userId, new Date(Date.now() - WEEK_MS).toISOString());
  return items.sort(
    (a, b) => Number(b.actionable) - Number(a.actionable) || (b.at ?? "").localeCompare(a.at ?? ""),
  );
}
