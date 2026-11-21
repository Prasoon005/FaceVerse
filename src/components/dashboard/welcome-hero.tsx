import { ArrowRight, CalendarCheck, Fingerprint, Megaphone } from "lucide-react";
import Link from "next/link";

import { StaggerList, StaggerListItem } from "@/components/shared/motion";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { localDay } from "@/lib/attendance/days";
import { formatTimeIn } from "@/lib/format";
import { cn } from "@/lib/utils";

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(
      new Date(),
    ),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Top of the user dashboard: a greeting and three live status chips (identity, today's
 * attendance, unread announcements), each linking to where the user can act.
 */
export async function WelcomeHero() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { supabase, user, profile } = viewer;
  const settings = await getAttendanceSettings(supabase);
  const today = localDay(new Date(), settings.timezone);

  const [{ data: identity }, { data: record }, { data: announcements }, { data: reads }] =
    await Promise.all([
      supabase
        .from("people")
        .select("approval_status, biometrics_locked")
        .eq("owner_id", user.id)
        .eq("linked_user_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("attendance")
        .select("check_in_at, check_out_at")
        .eq("user_id", user.id)
        .eq("day", today)
        .maybeSingle(),
      supabase
        .from("announcements")
        .select("id")
        .or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("announcement_reads").select("announcement_id").eq("user_id", user.id),
    ]);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  const unread = (announcements ?? []).filter((a) => !readIds.has(a.id)).length;
  const firstName = (profile?.full_name || user.email?.split("@")[0] || "there").split(" ")[0];

  const identityChip = !identity
    ? { text: "Set up your identity", tone: "warning" }
    : identity.approval_status === "approved"
      ? { text: "Identity verified", tone: "success" }
      : identity.approval_status === "pending"
        ? { text: "Identity awaiting approval", tone: "warning" }
        : { text: "Identity rejected, enroll again", tone: "danger" };
  const attendanceChip = record?.check_out_at
    ? {
        text: `Checked out ${formatTimeIn(record.check_out_at, settings.timezone)}`,
        tone: "success",
      }
    : record
      ? {
          text: `Checked in ${formatTimeIn(record.check_in_at, settings.timezone)}`,
          tone: "success",
        }
      : { text: "Not checked in today", tone: "warning" };
  const announcementChip = unread
    ? { text: `${unread} new announcement${unread === 1 ? "" : "s"}`, tone: "brand" }
    : { text: "No new announcements", tone: "muted" };

  const chips = [
    { ...identityChip, href: "/identity", icon: Fingerprint },
    { ...attendanceChip, href: "/attendance", icon: CalendarCheck },
    { ...announcementChip, href: "/announcements", icon: Megaphone },
  ];
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success-foreground",
    warning: "bg-warning/10 text-warning-foreground",
    danger: "bg-danger/10 text-danger-foreground",
    brand: "bg-brand/10 text-brand",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
      <div
        aria-hidden
        className="absolute -top-24 -right-16 size-72 animate-aurora rounded-full bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 left-1/3 size-64 animate-aurora rounded-full bg-success/10 blur-3xl [animation-delay:-7s]"
      />
      <div className="relative grid gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting(settings.timezone)}, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s where you stand today.</p>
        </div>
        <StaggerList className="grid gap-2 sm:grid-cols-3">
          {chips.map((c) => (
            <StaggerListItem key={c.href}>
              <Link
                href={c.href}
                className="hover-lift group flex items-center gap-3 rounded-xl border bg-background/60 p-3 backdrop-blur"
              >
                <span className={cn("grid size-9 place-items-center rounded-lg", tones[c.tone])}>
                  <c.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.text}</span>
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </StaggerListItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
