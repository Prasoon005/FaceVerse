/**
 * Server-side data loading for the admin console (Phase 4A). Call only after
 * requireAdminPage(): it uses the service-role client.
 */
import type { createAdminClient } from "@/lib/supabase/admin";
import { resolveAvatars } from "@/lib/avatars";
import { leaveDaySet } from "@/lib/attendance/days";
import type { ApprovalStatus } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export type WorkspaceUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  disabled: boolean;
  joinedAt: string;
  lastSignInAt: string | null;
  peopleCount: number;
  /** Status of the user's own (account-linked) face enrollment. */
  enrollment: ApprovalStatus | "none";
  /** Displayable photo URL (signed for uploaded photos), or null. */
  avatarUrl: string | null;
  phone: string | null;
  department: string | null;
};

/** Every account with profile details, enrollment status and how many people they enrolled. */
export async function listWorkspaceUsers(admin: Admin): Promise<WorkspaceUser[]> {
  const [{ data: authData, error }, profiles, people] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("*"),
    admin.from("people").select("owner_id, linked_user_id, approval_status"),
  ]);
  if (error) throw error;

  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const counts = new Map<string, number>();
  const enrollment = new Map<string, ApprovalStatus>();
  const rank: Record<ApprovalStatus, number> = { approved: 3, pending: 2, rejected: 1 };
  for (const p of people.data ?? []) {
    counts.set(p.owner_id, (counts.get(p.owner_id) ?? 0) + 1);
    if (p.linked_user_id && p.linked_user_id === p.owner_id) {
      const current = enrollment.get(p.owner_id);
      if (!current || rank[p.approval_status] > rank[current]) {
        enrollment.set(p.owner_id, p.approval_status);
      }
    }
  }

  const avatars = await resolveAvatars(
    admin,
    (profiles.data ?? []).map((p) => p.avatar_url),
  );

  return authData.users
    .map((u) => {
      const profile = profileById.get(u.id);
      const email = u.email ?? "";
      return {
        id: u.id,
        email,
        name:
          profile?.full_name ||
          (u.user_metadata?.full_name as string | undefined) ||
          email.split("@")[0] ||
          "User",
        role: profile?.role ?? "member",
        disabled: profile?.disabled ?? false,
        joinedAt: profile?.created_at ?? u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        peopleCount: counts.get(u.id) ?? 0,
        enrollment: enrollment.get(u.id) ?? "none",
        avatarUrl:
          (profile?.avatar_url ? avatars.get(profile.avatar_url) : undefined) ??
          ((u.user_metadata?.avatar_url as string | undefined) || null),
        phone: profile?.phone ?? null,
        department: profile?.department ?? null,
      } satisfies WorkspaceUser;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Signed URLs (1 h) for private storage objects, keyed by path. */
export async function signPaths(admin: Admin, bucket: string, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await admin.storage.from(bucket).createSignedUrls(unique, 3600);
  data?.forEach((item) => {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  });
  return urls;
}

/** Approved leave days per user that overlap [from, to]. */
export async function loadApprovedLeave(admin: Admin, from: string, to: string) {
  const { data } = await admin
    .from("leave_requests")
    .select("user_id, start_day, end_day")
    .eq("status", "approved")
    .lte("start_day", to)
    .gte("end_day", from);
  const byUser = new Map<string, { start_day: string; end_day: string }[]>();
  for (const r of data ?? []) {
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  }
  return new Map([...byUser].map(([user, ranges]) => [user, leaveDaySet(ranges)]));
}
