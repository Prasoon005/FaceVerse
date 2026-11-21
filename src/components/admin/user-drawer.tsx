"use client";

import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock,
  Mail,
  MessagesSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { ProgressRing } from "@/components/fx/progress-ring";
import { presenceLabel, type PresenceStatus, UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkspaceUser } from "@/lib/admin/data";
import { formatDateTime, formatRelative } from "@/lib/format";

export type DrawerUser = WorkspaceUser & {
  monthRate: number | null;
  month: { present: number; late: number; absent: number; leave: number };
  score: number;
  scoreBase: number;
  today: PresenceStatus;
  todayCheckIn: string | null;
};

/** Quick look at one user from the users table, without leaving the page. */
export function UserDrawer({
  user,
  onOpenChange,
}: {
  user: DrawerUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={user !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {user ? (
          <>
            <SheetHeader className="items-center gap-3 px-6 pt-10 pb-6 text-center">
              <UserAvatar name={user.name} src={user.avatarUrl} status={user.today} size="xl" />
              <div className="grid gap-1">
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  {user.name}
                </SheetTitle>
                <SheetDescription>{user.email}</SheetDescription>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {user.role === "admin" ? (
                  <Badge variant="outline" className="text-brand">
                    <ShieldCheck aria-hidden /> Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary">Member</Badge>
                )}
                {user.today !== "none" ? (
                  <Badge variant="outline">{presenceLabel[user.today]}</Badge>
                ) : null}
                {user.disabled ? (
                  <Badge variant="outline" className="text-danger-foreground">
                    Disabled
                  </Badge>
                ) : null}
              </div>
            </SheetHeader>

            <div className="grid gap-5 px-6 pb-8">
              {user.role === "member" ? (
                <section className="grid gap-4 rounded-2xl bg-foreground/[0.03] p-4 ring-1 ring-foreground/[0.06]">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    This month
                  </span>
                  <div className="flex items-center justify-around gap-4">
                    <div className="grid justify-items-center gap-1.5">
                      <ProgressRing
                        ratio={user.monthRate}
                        value={user.monthRate === null ? null : Math.round(user.monthRate * 100)}
                        label="Attendance"
                        size={76}
                      />
                      <span className="text-xs text-muted-foreground">Attendance</span>
                    </div>
                    <div className="grid justify-items-center gap-1.5">
                      <ProgressRing
                        ratio={user.scoreBase ? user.score / user.scoreBase : null}
                        value={user.score}
                        suffix={`/${user.scoreBase}`}
                        label="Score"
                        size={76}
                      />
                      <span className="text-xs text-muted-foreground">Score</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(
                      [
                        ["Present", user.month.present, "text-success-foreground"],
                        ["Late", user.month.late, "text-orange-500"],
                        ["Absent", user.month.absent, "text-danger-foreground"],
                        ["Leave", user.month.leave, "text-sky-500"],
                      ] as const
                    ).map(([label, value, tone]) => (
                      <div key={label} className="grid rounded-xl bg-background/40 py-2">
                        <span className={`text-lg font-semibold tabular-nums ${tone}`}>
                          {value}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="grid gap-1">
                <Detail icon={Mail} label="Email" value={user.email} />
                <Detail icon={Phone} label="Phone" value={user.phone} />
                <Detail icon={Building2} label="Department" value={user.department} />
                <Detail
                  icon={Clock}
                  label="Checked in today"
                  value={user.todayCheckIn ? formatDateTime(user.todayCheckIn) : null}
                />
                <Detail icon={CalendarDays} label="Joined" value={formatDateTime(user.joinedAt)} />
                <Detail
                  icon={ArrowUpRight}
                  label="Last sign-in"
                  value={user.lastSignInAt ? formatRelative(user.lastSignInAt) : null}
                />
              </section>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    Full profile <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
                {user.role === "member" ? (
                  <Button variant="outline" asChild>
                    <Link href={`/admin/messages?user=${user.id}`}>
                      <MessagesSquare aria-hidden /> Message
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-foreground/[0.03]">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="truncate text-sm">{value || "Not set"}</span>
      </span>
    </div>
  );
}
