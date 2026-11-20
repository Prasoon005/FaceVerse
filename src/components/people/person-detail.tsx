"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, Camera, Link2, Mic, ScanFace, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfidenceRing } from "@/components/shared/confidence-ring";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyFaceSimilarity } from "@/config/recognition";
import {
  deleteFaceSample,
  deletePerson,
  deleteVoiceSamples,
  getPerson,
  peopleKeys,
} from "@/lib/data/people";
import { formatDateTime, formatPercent, formatRelative } from "@/lib/format";

import { ListTypeBadge } from "./list-type-badge";
import { PersonAvatar } from "./person-avatar";

export function PersonDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: peopleKeys.detail(id),
    queryFn: () => getPerson(id),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const removeSample = useMutation({
    mutationFn: deleteFaceSample,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
    onError: (err) => toast.error("Couldn't delete sample", { description: err.message }),
  });
  const removeVoice = useMutation({
    mutationFn: () => deleteVoiceSamples(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
    onError: (err) => toast.error("Couldn't delete voice samples", { description: err.message }),
  });

  if (isPending) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <EmptyState
        title={error ? "Couldn't load this person" : "Person not found"}
        description={error?.message ?? "They may have been deleted."}
        action={
          <Button variant="outline" asChild>
            <Link href="/people">Back to people</Link>
          </Button>
        }
      />
    );
  }

  const { person, samples, events } = data;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <PersonAvatar name={person.name} url={person.avatarUrl} className="size-16" />
        <div className="grid flex-1 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {person.label ? (
              <Badge variant="secondary" className="capitalize">
                {person.label}
              </Badge>
            ) : null}
            <ListTypeBadge listType={person.list_type} />
            {person.linked_user_id ? (
              <Badge variant="outline">
                <Link2 aria-hidden /> Linked account
              </Badge>
            ) : null}
            <span>Last seen {formatRelative(person.last_seen_at).toLowerCase()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/enroll?person=${person.id}`}>
              <Camera aria-hidden /> Add samples
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/enroll?person=${person.id}&mode=voice`}>
              <Mic aria-hidden /> Add voice
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      </div>

      {person.notes ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {person.notes}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Face samples</CardTitle>
            <CardDescription>
              {samples.length} stored embedding{samples.length === 1 ? "" : "s"}. Matching uses the
              best sample.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {samples.length === 0 ? (
              <EmptyState
                title="No samples"
                description="This person can't be recognised until you add face samples."
                action={
                  <Button size="sm" asChild>
                    <Link href={`/enroll?person=${person.id}`}>Add samples</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {samples.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <ScanFace className="size-4 text-muted-foreground" aria-hidden />
                    <span className="font-medium">Sample {samples.length - i}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      quality {formatPercent(s.quality)}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelative(s.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete sample ${samples.length - i}`}
                      disabled={removeSample.isPending}
                      onClick={() => removeSample.mutate(s.id)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:order-last">
          <CardHeader>
            <CardTitle>Voice samples</CardTitle>
            <CardDescription>
              {person.voice_samples} stored speaker embedding
              {person.voice_samples === 1 ? "" : "s"}. Needed for biometric login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {person.voice_samples === 0 ? (
              <EmptyState
                title="No voice samples"
                description="Record 3 short phrases to enable voice verification."
                action={
                  <Button size="sm" asChild>
                    <Link href={`/enroll?person=${person.id}&mode=voice`}>Add voice samples</Link>
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <AudioLines className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{person.voice_samples} phrases</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  disabled={removeVoice.isPending}
                  onClick={() => removeVoice.mutate()}
                >
                  <Trash2 aria-hidden /> Delete voice samples
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent recognitions</CardTitle>
            <CardDescription>Last 20 times this person was identified</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                title="Not recognised yet"
                description="Run a live scan to see recognition history here."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/live">Open live recognition</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <ConfidenceRing
                      value={e.similarity}
                      status={classifyFaceSimilarity(e.similarity)}
                      size={22}
                    />
                    <span className="capitalize">{e.source}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatPercent(e.similarity)}
                    </span>
                    <time
                      dateTime={e.created_at}
                      title={formatDateTime(e.created_at)}
                      className="ml-auto text-xs text-muted-foreground"
                    >
                      {formatRelative(e.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${person.name}?`}
        description="This permanently removes their face samples, profile photo and recognition history."
        confirmText={person.name}
        onConfirm={async () => {
          try {
            await deletePerson(person);
            await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
            toast.success(`${person.name} deleted`);
            router.push("/people");
          } catch (err) {
            toast.error("Delete failed", {
              description: err instanceof Error ? err.message : undefined,
            });
          }
        }}
      />
    </div>
  );
}
