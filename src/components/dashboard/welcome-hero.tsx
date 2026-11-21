import { ArrowRight, CalendarCheck, Fingerprint, Megaphone } from "lucide-react";
import Link from "next/link";

import { LiveClock } from "@/components/fx/live-clock";
import { ProgressRing } from "@/components/fx/progress-ring";
import { StaggerList, StaggerListItem } from "@/components/shared/motion";
import { getAttendanceSettings, getViewer } from "@/lib/admin/server";
import { localDay, monthRange } from "@/lib/attendance/days";
import { loadUserDays } from "@/lib/attendance/user-days";
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
  const { from } = monthRange(today);
  const joinedDay = localDay(new Date(profile?.created_at ?? user.created_at), settings.timezone);

  const [{ data: identity }, { data: record }, { data: announcements }, { data: reads }, month] =
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
      loadUserDays({
        client: supabase,
        userId: user.id,
        joinedDay,
        from,
        to: today,
        today,
        settings,
      }),
    ]);

  // This month: share of working days attended (late still counts as attended), and the score.
  const counted = month.days.filter((d) =>
    ["present", "late", "absent", "excused", "pending"].includes(d.status),
  );
  const attended = counted.filter((d) => d.status === "present" || d.status === "late").length;
  const rate = counted.length ? attended / counted.length : null;
  const { score, base } = month.score;

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
    <section className="glass-panel overflow-hidden rounded-[28px] p-5 sm:p-8">
      <div className="relative grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[36px]">
              {greeting(settings.timezone)}, <span className="text-glow">{firstName}</span>
            </h1>
            <p className="text-[15px] text-muted-foreground">Here&apos;s where you stand today.</p>
          </div>
          <LiveClock timeZone={settings.timezone} />
        </div>
        <StaggerList className="grid gap-2 sm:grid-cols-3">
          {chips.map((c) => (
            <StaggerListItem key={c.href}>
              <Link
                href={c.href}
                className="group flex items-center gap-3 rounded-xl bg-foreground/[0.035] p-3 ring-1 ring-foreground/[0.06] transition-colors hover:bg-foreground/[0.06]"
              >
                <span
                  className={cn(
                    "icon-glow grid size-10 place-items-center rounded-xl",
                    tones[c.tone],
                  )}
                >
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/attendance"
            className="flex h-full items-center gap-4 rounded-xl bg-foreground/[0.035] p-4 ring-1 ring-foreground/[0.06] transition-colors hover:bg-foreground/[0.06]"
          >
            <ProgressRing
              ratio={rate}
              value={rate === null ? null : Math.round(rate * 100)}
              label="Attendance this month"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Attendance this month</span>
              <span className="text-xs text-muted-foreground">
                {rate === null
                  ? "No working days yet this month"
                  : `${attended} of ${counted.length} working days`}
              </span>
            </span>
          </Link>
          <Link
            href="/reasons"
            className="flex h-full items-center gap-4 rounded-xl bg-foreground/[0.035] p-4 ring-1 ring-foreground/[0.06] transition-colors hover:bg-foreground/[0.06]"
          >
            <ProgressRing
              ratio={base ? score / base : null}
              value={score}
              suffix={`/${base}`}
              label="Score this month"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Score this month</span>
              <span className="text-xs text-muted-foreground">
                {month.score.deducted
                  ? `${month.score.deducted} points deducted`
                  : "No deductions. Keep it up."}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
