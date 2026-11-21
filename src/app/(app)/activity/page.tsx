import { History, ScanFace, UserX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { actionLabel } from "@/components/admin/audit-labels";
import { EmptyState } from "@/components/shared/empty-state";
import { StaggerList, StaggerListItem } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/admin/server";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Activity" };

/** The user's own activity: recognitions (live, visitors, login) and account actions. */
export default async function ActivityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { supabase, user } = viewer;

  const [{ data: events }, { data: logs }] = await Promise.all([
    supabase
      .from("recognition_events")
      .select("id, person_id, similarity, source, created_at, people(name)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audit_logs")
      .select("id, action, created_at")
      .eq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Activity" description="Your recent recognitions and account actions." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recognitions</CardTitle>
            <CardDescription>
              Live view, visitor scans and biometric login (last 50)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(events ?? []).length === 0 ? (
              <EmptyState
                title="No recognitions yet"
                description="Open Live and point the camera at someone you enrolled."
              />
            ) : (
              <StaggerList className="divide-y">
                {(events ?? []).map((e) => (
                  <StaggerListItem key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    {e.person_id ? (
                      <ScanFace className="size-4 text-success-foreground" aria-hidden />
                    ) : (
                      <UserX className="size-4 text-danger-foreground" aria-hidden />
                    )}
                    <span className="font-medium">{e.people?.name ?? "Unknown face"}</span>
                    <span className="rounded border px-1.5 text-[10px] text-muted-foreground capitalize">
                      {e.source}
                    </span>
                    {e.similarity !== null ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {Math.round(e.similarity * 100)}%
                      </span>
                    ) : null}
                    <span
                      className="ml-auto text-xs text-muted-foreground"
                      title={formatDateTime(e.created_at)}
                    >
                      {formatRelative(e.created_at)}
                    </span>
                  </StaggerListItem>
                ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account actions</CardTitle>
            <CardDescription>What you did in FaceVerse (last 50)</CardDescription>
          </CardHeader>
          <CardContent>
            {(logs ?? []).length === 0 ? (
              <EmptyState
                title="Nothing yet"
                description="Your enrollments, requests and exports appear here."
              />
            ) : (
              <StaggerList className="divide-y">
                {(logs ?? []).map((l) => (
                  <StaggerListItem key={l.id} className="flex items-center gap-3 py-2 text-sm">
                    <History className="size-4 text-brand" aria-hidden />
                    <span className="first-letter:uppercase">{actionLabel(l.action)}</span>
                    <span
                      className="ml-auto text-xs text-muted-foreground"
                      title={formatDateTime(l.created_at)}
                    >
                      {formatRelative(l.created_at)}
                    </span>
                  </StaggerListItem>
                ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
