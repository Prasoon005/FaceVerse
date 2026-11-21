"use client";

import imageCompression from "browser-image-compression";
import { FileUp, LoaderCircle, Paperclip, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { answerAbsence } from "@/lib/actions/attendance";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** Reason (+ optional photo/PDF proof) for an absence; answers an admin's question. */
export function AbsenceAnswerDialog({
  open,
  onOpenChange,
  userId,
  day,
  question,
  initialReason,
  kind = "absence",
  lateBy = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  day: string;
  question?: string | null;
  initialReason?: string | null;
  /** A reason for an absence, or for checking in late. */
  kind?: "absence" | "late";
  lateBy?: number;
}) {
  const { play } = useSoundFeedback();
  const [reason, setReason] = useState(initialReason ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadProof(): Promise<string | null> {
    if (!file) return null;
    let upload: File = file;
    if (file.type.startsWith("image/")) {
      upload = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.8,
        useWebWorker: false,
      });
    }
    if (upload.size > MAX_BYTES) throw new Error("The file is larger than 3 MB.");
    const ext = file.type === "application/pdf" ? "pdf" : (upload.type.split("/")[1] ?? "jpg");
    const path = `${userId}/${day}-${Date.now()}.${ext}`;
    const { error } = await createClient()
      .storage.from("absence-proofs")
      .upload(path, upload, { contentType: upload.type });
    if (error) throw error;
    return path;
  }

  async function submit() {
    setSaving(true);
    try {
      const proofPath = await uploadProof();
      const result = await answerAbsence({ day, kind, reason, proofPath });
      if (!result.ok) throw new Error(result.error);
      play("success");
      toast.success("Reason sent to your admin");
      onOpenChange(false);
    } catch (err) {
      play("error");
      toast.error("Couldn't send your reason", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "late"
              ? `Late on ${formatDay(day, { weekday: "long" })}${lateBy ? ` (${lateBy} min)` : ""}`
              : `Absence on ${formatDay(day, { weekday: "long" })}`}
          </DialogTitle>
          <DialogDescription>
            {question ??
              (kind === "late"
                ? "Explain why you came late. If your admin approves it, no points are deducted."
                : "Explain why you were absent. If your admin approves it, it counts as excused.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="absence-reason">Reason</Label>
            <Textarea
              id="absence-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={
                kind === "late"
                  ? "e.g. My bus broke down on the way."
                  : "e.g. I had a fever and visited the doctor."
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="absence-proof">Proof (optional)</Label>
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove file"
                  onClick={() => setFile(null)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="absence-proof"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-brand/50 hover:text-foreground"
              >
                <FileUp className="size-4" aria-hidden /> Photo or PDF, up to 3 MB
                <input
                  id="absence-proof"
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    if (picked && picked.type === "application/pdf" && picked.size > MAX_BYTES) {
                      toast.error("PDF is larger than 3 MB.");
                      return;
                    }
                    setFile(picked);
                  }}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Stored privately. Only you and admins can open it.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || reason.trim().length < 3}>
            {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Send reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
