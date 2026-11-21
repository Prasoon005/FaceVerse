import { DoorClosed, DoorOpen, ScanFace, Users } from "lucide-react";
import type { Metadata } from "next";

import { LiveUpdates } from "@/components/admin/live-updates";
import { PersonAvatar } from "@/components/people/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listWorkspaceUsers, signPaths } from "@/lib/admin/data";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { localDay } from "@/lib/attendance/days";
import { formatDay, formatTimeIn } from "@/lib/format";

export const metadata: Metadata = { title: "Visitors" };

const LIVE_TABLES = ["visitor_logs"];
const DAYS = 7;

/** Every user's visitor log in one place (read-only for admins). */
export default async function AdminVisitorsPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);
  const now = new Date();
  const today = localDay(now, settings.timezone);
  const since = new Date(now.getTime() - DAYS * 24 * 3600 * 1000).toISOString();

  const [users, { data: logs }] = await Promise.all([
    listWorkspaceUsers(admin),
    admin
      .from("visitor_logs")
      .select("*")
      .gte("check_in", since)
      .order("check_in", { ascending: false })
      .limit(300),
  ]);
  const personIds = [...new Set((logs ?? []).map((l) => l.person_id))];
  const { data: people } = personIds.length
    ? await admin.from("people").select("id, name, avatar_path").in("id", personIds)
    : { data: [] };
  const urls = await signPaths(
    admin,
    "avatars",
    (people ?? []).map((p) => p.avatar_path),
  );
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows = logs ?? [];
  const inside = rows.filter((r) => !r.check_out).length;
  const todayCount = rows.filter(
    (r) => localDay(new Date(r.check_in), settings.timezone) === today,
  ).length;
  const unique = new Set(rows.map((r) => r.person_id)).size;
  const cards = [
    {
      label: "Inside now",
      value: inside,
      icon: DoorOpen,
      tone: "success",
      hint: "Across all users",
    },
    {
      label: "Visits today",
      value: todayCount,
      icon: ScanFace,
      tone: "default",
      hint: formatDay(today),
    },
    {
      label: `Unique visitors (${DAYS} days)`,
      value: unique,
      icon: Users,
      tone: "warning",
      hint: `${rows.length} visits`,
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Visitors"
        description={`Every user's visitor log for the last ${DAYS} days.`}
        actions={<LiveUpdates tables={LIVE_TABLES} />}
      />
      <Stagger className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
      </Stagger>

      {rows.length === 0 ? (
        <EmptyState title="No visits yet" description="Visits logged by users appear here live." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const person = personById.get(r.person_id);
                const name = person?.name ?? "Deleted visitor";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PersonAvatar
                          name={name}
                          url={person?.avatar_path ? (urls.get(person.avatar_path) ?? null) : null}
                          className="size-8"
                        />
                        <div className="grid">
                          <span className="font-medium">{name}</span>
                          {r.phone ? (
                            <span className="text-xs text-muted-foreground">{r.phone}</span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {userById.get(r.owner_id)?.name ?? "–"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{r.purpose ?? "–"}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.host_name ?? "–"}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {formatDay(localDay(new Date(r.check_in), settings.timezone))}{" "}
                      {formatTimeIn(r.check_in, settings.timezone)}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {r.check_out ? formatTimeIn(r.check_out, settings.timezone) : "–"}
                    </TableCell>
                    <TableCell>
                      {r.check_out ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          <DoorClosed className="size-3" aria-hidden /> Left
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-success/40 text-success-foreground"
                        >
                          <DoorOpen className="size-3" aria-hidden /> Inside
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
