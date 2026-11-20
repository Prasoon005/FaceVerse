import { Activity, DoorOpen, Radar, ScanFace, UserPlus, Users, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder numbers until Phase 2 wires these to recognition_events / people.
const stats = [
  {
    label: "People enrolled",
    value: 0,
    icon: Users,
    tone: "default",
    hint: "Enroll faces in Phase 2",
  },
  { label: "Recognitions today", value: 0, icon: ScanFace, tone: "success", hint: "Live scans" },
  { label: "Visitors today", value: 0, icon: DoorOpen, tone: "warning", hint: "Visitor log" },
  { label: "Unknown faces", value: 0, icon: UserX, tone: "danger", hint: "Unmatched detections" },
] as const;

const quickActions = [
  { label: "Enroll new person", href: "/enroll", icon: UserPlus },
  { label: "Start live scan", href: "/live", icon: Radar },
  { label: "Scan a visitor", href: "/visitors", icon: DoorOpen },
];

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of enrolments, recognitions and visitors."
        actions={
          <Button asChild>
            <Link href="/enroll">
              <UserPlus aria-hidden /> Enroll person
            </Link>
          </Button>
        }
      />

      <section aria-label="Key stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recognitions over time</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              className="h-64"
              title="No recognitions yet"
              description="Once people are enrolled and you run a live scan, activity shows up here."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/live">Open live recognition</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump straight in</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((a) => (
              <Button key={a.href} variant="outline" className="h-10 justify-start" asChild>
                <Link href={a.href}>
                  <a.icon aria-hidden /> {a.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" aria-hidden /> Recent activity
          </CardTitle>
          <CardDescription>Recognitions, check-ins and account events</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Nothing here yet"
            description="Your activity feed fills up as you enroll people and run scans."
            action={
              <Button size="sm" asChild>
                <Link href="/enroll">Enroll your first person</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
