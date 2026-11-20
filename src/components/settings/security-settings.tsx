"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { recognitionConfig } from "@/config/recognition";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { formatDateTime, formatRelative } from "@/lib/format";
import { getSecurityStatus, securityKeys, setBiometricLogin } from "@/lib/data/security";
import { cn } from "@/lib/utils";

const score = (value: number | null) => (value == null ? "—" : value.toFixed(3));

/** Settings → Security (PROJECT_SPEC §8): biometric login toggle, requirements, attempts. */
export function SecuritySettings() {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const status = useQuery({ queryKey: securityKeys.status, queryFn: getSecurityStatus });
  const toggle = useMutation({
    mutationFn: setBiometricLogin,
    onSuccess: (_, enabled) => {
      play(enabled ? "success" : "toggle");
      toast.success(enabled ? "Biometric login turned on" : "Biometric login turned off");
      return queryClient.invalidateQueries({ queryKey: securityKeys.status });
    },
    onError: (err) => {
      play("error");
      toast.error("Couldn't update the setting", { description: err.message });
    },
  });

  if (status.isPending) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <EmptyState
        title="Couldn't load security settings"
        description={status.error.message}
        action={
          <Button variant="outline" onClick={() => status.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const { enabled, linkedPerson, requirements, attempts } = status.data;
  const ready = requirements.linked && requirements.face && requirements.voice;
  const { faceMin, voice } = recognitionConfig.samples;
  const personHref = linkedPerson ? `/people/${linkedPerson.id}` : "/enroll";

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Biometric login</CardTitle>
          <CardDescription>
            Sign in with email + liveness check + face + voice. A demo-grade second factor that runs
            in your browser: your password and Google sign-in keep working.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex items-center gap-3">
            <Switch
              id="biometric-login"
              checked={enabled}
              disabled={toggle.isPending || (!enabled && !ready)}
              onCheckedChange={(checked) => toggle.mutate(checked)}
            />
            <Label htmlFor="biometric-login">{enabled ? "On" : "Off"}</Label>
            {!enabled && !ready ? (
              <span className="text-xs text-muted-foreground">Complete the steps below first.</span>
            ) : null}
          </div>

          <ul className="grid gap-2" aria-label="Requirements">
            <Requirement
              ok={requirements.linked}
              label="A person linked to your account"
              hint="Enroll yourself with “This is me” ticked."
              action={
                requirements.linked ? null : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/enroll">Enroll yourself</Link>
                  </Button>
                )
              }
            />
            <Requirement
              ok={requirements.face}
              label={`At least ${faceMin} face samples`}
              hint={linkedPerson ? `${linkedPerson.face_samples} saved` : undefined}
              action={
                requirements.linked && !requirements.face ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/enroll?person=${linkedPerson!.id}`}>Add face samples</Link>
                  </Button>
                ) : null
              }
            />
            <Requirement
              ok={requirements.voice}
              label={`At least ${voice} voice samples`}
              hint={linkedPerson ? `${linkedPerson.voice_samples} saved` : undefined}
              action={
                requirements.linked && !requirements.voice ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/enroll?person=${linkedPerson!.id}&mode=voice`}>
                      Add voice samples
                    </Link>
                  </Button>
                ) : null
              }
            />
          </ul>

          {linkedPerson ? (
            <p className="text-sm text-muted-foreground">
              Linked person:{" "}
              <Link href={personHref} className="font-medium text-foreground hover:underline">
                {linkedPerson.name}
              </Link>
            </p>
          ) : null}

          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            After {recognitionConfig.biometricLogin.maxFailures} failed attempts in{" "}
            {recognitionConfig.biometricLogin.windowMinutes} minutes, biometric login is locked for
            your account for a while. Every attempt is logged below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent biometric sign-in attempts</CardTitle>
          <CardDescription>
            Scores are visible only to you. Match needs face ≥ {recognitionConfig.face.match} and
            voice ≥ {recognitionConfig.voice.match}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <EmptyState
              title="No attempts yet"
              description="Turn biometric login on, sign out, and try signing in with face + voice."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Face</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Liveness</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <time dateTime={a.created_at} title={formatDateTime(a.created_at)}>
                        {formatRelative(a.created_at)}
                      </time>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{score(a.face_score)}</TableCell>
                    <TableCell className="font-mono text-xs">{score(a.voice_score)}</TableCell>
                    <TableCell>
                      {a.liveness_passed == null ? "—" : a.liveness_passed ? "Passed" : "Failed"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-sm",
                          a.success ? "text-success-foreground" : "text-danger-foreground",
                        )}
                      >
                        {a.success ? (
                          <CircleCheck className="size-3.5" aria-hidden />
                        ) : (
                          <CircleX className="size-3.5" aria-hidden />
                        )}
                        {a.success ? "Signed in" : "Rejected"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Requirement({
  ok,
  label,
  hint,
  action,
}: {
  ok: boolean;
  label: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <Icon
        className={cn("size-4", ok ? "text-success-foreground" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="font-medium">{label}</span>
      <span className="sr-only">{ok ? "done" : "not done"}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      {action ? <span className="ml-auto">{action}</span> : null}
    </li>
  );
}
