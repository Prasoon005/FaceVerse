import { Activity, DoorOpen, Radar, ScanFace, UserPlus, Users, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RecognitionsChart } from "@/components/charts/recognitions-chart";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { ConfidenceRing } from "@/components/shared/confidence-ring";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem, StaggerList, StaggerListItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { classifyFaceSimilarity } from "@/config/recognition";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDateTime, formatPercent, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const quickActions = [
  { label: "Enroll new person", href: "/enroll", icon: UserPlus },
  { label: "Start live scan", href: "/live", icon: Radar },
  { label: "Scan a visitor", href: "/visitors", icon: DoorOpen },
];

export default async function DashboardPage() {
  const { stats, series, activity } = await getDashboardData();
  const hasEvents = series.some((d) => d.recognised + d.unknown > 0);

  const cards = [
    {
      label: "People enrolled",
      value: stats.people,
      icon: Users,
      tone: "default",
      hint: "Identities with face samples",
    },
    {
      label: "Recognitions today",
      value: stats.recognisedToday,
      icon: ScanFace,
      tone: "success",
      hint: "Last 24 hours",
    },
    {
      label: "Visitors today",
      value: stats.visitorsToday,
      icon: DoorOpen,
      tone: "warning",
      hint: "Visitor log arrives in Phase 4",
    },
    {
      label: "Unknown faces",
      value: stats.unknownToday,
      icon: UserX,
      tone: "danger",
      hint: "Unmatched, last 24 hours",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <WelcomeHero />
      <PageHeader
        title="Recognition overview"
        description="Overview of enrolments, recognitions and visitors."
        actions={
          <Button asChild>
            <Link href="/enroll">
              <UserPlus aria-hidden /> Enroll person
            </Link>
          </Button>
        }
      />

      <Stagger aria-label="Key stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((s) => (
          <StaggerItem key={s.label}>
            <StatCard {...s} />
          </StaggerItem>
        ))}
      </Stagger>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recognitions over time</CardTitle>
            <CardDescription>Last 14 days (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            {hasEvents ? (
              <RecognitionsChart data={series} />
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump straight in</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((a) => (
              <Button
                key={a.href}
                variant="outline"
                className="group h-10 justify-start transition-transform hover:translate-x-0.5"
                asChild
              >
                <Link href={a.href}>
                  <a.icon aria-hidden className="transition-colors group-hover:text-brand" />{" "}
                  {a.label}
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
          <CardDescription>Latest recognitions across your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="Your activity feed fills up as you enroll people and run scans."
              action={
                <Button size="sm" asChild>
                  <Link href={stats.people === 0 ? "/enroll" : "/live"}>
                    {stats.people === 0 ? "Enroll your first person" : "Start a live scan"}
                  </Link>
                </Button>
              }
            />
          ) : (
            <StaggerList className="divide-y">
              {activity.map((e) => {
                const status = e.personId ? classifyFaceSimilarity(e.similarity) : "unknown";
                return (
                  <StaggerListItem key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <ConfidenceRing value={e.similarity} status={status} size={24} />
                    {e.personId ? (
                      <Link
                        href={`/people/${e.personId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {e.name ?? "Deleted person"}
                      </Link>
                    ) : (
                      <span className="font-medium text-muted-foreground">Unknown face</span>
                    )}
                    <span className="text-muted-foreground capitalize">via {e.source}</span>
                    {e.personId ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatPercent(e.similarity)}
                      </span>
                    ) : null}
                    <time
                      dateTime={e.createdAt}
                      title={formatDateTime(e.createdAt)}
                      className="ml-auto text-xs text-muted-foreground"
                    >
                      {formatRelative(e.createdAt)}
                    </time>
                  </StaggerListItem>
                );
              })}
            </StaggerList>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
