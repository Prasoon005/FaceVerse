"use client";

import { motion } from "framer-motion";
import { CircleCheck, CircleX, Download, HardDrive, LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { deleteMyBiometrics } from "@/lib/actions/privacy";
import { downloadBlob } from "@/lib/ai/capture";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StorageUsage = { label: string; bytes: number; files: number }[];

/** Free Supabase storage for the whole project (PROJECT_SPEC §1). */
const QUOTA_BYTES = 1024 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const TABLES = [
  "profiles",
  "people",
  "recognition_events",
  "attendance",
  "absence_reviews",
  "leave_requests",
  "visitor_logs",
  "albums",
  "album_photos",
  "identity_change_requests",
  "audit_logs",
] as const;

export function PrivacyPanel({
  consentGivenAt,
  usage,
}: {
  consentGivenAt: string | null;
  usage: StorageUsage;
}) {
  const { play } = useSoundFeedback();
  const [withEmbeddings, setWithEmbeddings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const total = usage.reduce((s, u) => s + u.bytes, 0);

  async function exportData() {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("Please sign in again.");
      const ownerColumn: Record<(typeof TABLES)[number], string> = {
        profiles: "id",
        people: "owner_id",
        recognition_events: "owner_id",
        attendance: "user_id",
        absence_reviews: "user_id",
        leave_requests: "user_id",
        visitor_logs: "owner_id",
        albums: "owner_id",
        album_photos: "owner_id",
        identity_change_requests: "user_id",
        audit_logs: "actor_id",
      };
      const out: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        user: { id: userId, email: session.session?.user.email },
        note: withEmbeddings
          ? "Includes face/voice embeddings (biometric data). Keep this file private."
          : "Embeddings excluded. Re-export with the option ticked to include them.",
      };
      for (const table of TABLES) {
        const { data } = await supabase.from(table).select("*").eq(ownerColumn[table], userId);
        out[table] = data ?? [];
      }
      if (withEmbeddings) {
        const [faces, voices] = await Promise.all([
          supabase
            .from("face_embeddings")
            .select("person_id, embedding, quality, created_at")
            .eq("owner_id", userId),
          supabase
            .from("voice_embeddings")
            .select("person_id, embedding, created_at")
            .eq("owner_id", userId),
        ]);
        out.face_embeddings = faces.data ?? [];
        out.voice_embeddings = voices.data ?? [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      downloadBlob(blob, `faceverse-export-${new Date().toISOString().slice(0, 10)}.json`);
      await supabase.from("audit_logs").insert({
        actor_id: userId,
        action: "privacy.export",
        meta: { embeddings: withEmbeddings },
      });
      play("success");
    } catch (err) {
      play("error");
      toast.error("Export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Consent</CardTitle>
          <CardDescription>Required before enrolling faces or voices.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm">
            {consentGivenAt ? (
              <>
                <CircleCheck className="size-4 text-success-foreground" aria-hidden /> Given on{" "}
                {formatDateTime(consentGivenAt)}
              </>
            ) : (
              <>
                <CircleX className="size-4 text-warning-foreground" aria-hidden /> Not given yet.
                You&apos;ll be asked before your first enrollment.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4 text-brand" aria-hidden /> Storage usage
          </CardTitle>
          <CardDescription>
            Your files in private storage. The free plan has 1 GB for the whole project.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold">{formatBytes(total)}</span>
            <span className="text-xs text-muted-foreground">of 1 GB</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${formatBytes(total)} used of 1 GB`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, Math.max(total > 0 ? 1 : 0, (total / QUOTA_BYTES) * 100))}%`,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                total / QUOTA_BYTES > 0.8 ? "bg-danger" : "bg-brand",
              )}
            />
          </div>
          <ul className="grid gap-1 text-sm">
            {usage.map((u) => (
              <li key={u.label} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {u.label} ({u.files})
                </span>
                <span className="font-mono">{formatBytes(u.bytes)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export my data</CardTitle>
          <CardDescription>
            A JSON file with your profile, people, attendance, visitors, albums and activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="with-embeddings"
              checked={withEmbeddings}
              onCheckedChange={(v) => setWithEmbeddings(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="with-embeddings" className="leading-snug">
              Include face and voice embeddings (biometric data)
            </Label>
          </div>
          <Button
            className="w-fit"
            variant="outline"
            disabled={exporting}
            onClick={() => void exportData()}
          >
            {exporting ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Download aria-hidden />
            )}
            Export JSON
          </Button>
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger-foreground">Delete all my biometrics</CardTitle>
          <CardDescription>
            Removes every face and voice embedding you own (all enrolled people, including your own
            identity), the face index of your albums, profile thumbnails and visitor snapshots.
            Album photos, attendance and leave records stay. Biometric login turns off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            <Trash2 aria-hidden /> Delete my biometrics
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete all your biometric data?"
        description="This can't be undone. You'll need to enroll again (and get admin approval) to use attendance and biometric login."
        actionLabel="Delete everything"
        confirmText="DELETE"
        onConfirm={async () => {
          const result = await deleteMyBiometrics({ confirm: "DELETE" });
          if (result.ok) {
            play("success");
            toast.success("Your biometric data was deleted");
          } else {
            play("error");
            toast.error("Couldn't delete", { description: result.error });
          }
        }}
      />
    </div>
  );
}
