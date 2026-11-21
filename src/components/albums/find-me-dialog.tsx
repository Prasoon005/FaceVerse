"use client";

import { Camera, ImageUp, LoaderCircle, ScanSearch } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FaceScanner } from "@/components/camera/face-scanner";
import { ModelLoader } from "@/components/camera/model-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { selfieEmbedding } from "@/lib/data/albums";

/**
 * "Find me": take a selfie with the camera or upload one. Calls `onEmbedding` with the face
 * descriptor; the caller runs the album search. Nothing is uploaded.
 */
export function FindMeDialog({
  open,
  onOpenChange,
  onEmbedding,
  searching,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmbedding: (embedding: Float32Array) => void;
  searching: boolean;
}) {
  const engine = useFaceEngine();
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);

  async function fromFile(file: File) {
    setBusy(true);
    try {
      const embedding = await selfieEmbedding(file);
      if (!embedding) {
        toast.error("No face found in that photo", {
          description: "Use a clear, front-facing selfie.",
        });
        return;
      }
      onEmbedding(embedding);
    } catch {
      toast.error("Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="size-5 text-brand" aria-hidden /> Find me
          </DialogTitle>
          <DialogDescription>
            Your selfie stays on this device; only its face numbers are compared with the album.
          </DialogDescription>
        </DialogHeader>
        {searching || busy ? (
          <div className="grid justify-items-center gap-3 py-10" aria-live="polite">
            <LoaderCircle className="size-8 animate-spin text-brand" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {busy ? "Reading your selfie…" : "Looking for you in every photo…"}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="camera">
            <TabsList className="w-full">
              <TabsTrigger value="camera" className="flex-1">
                <Camera aria-hidden /> Camera
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                <ImageUp aria-hidden /> Upload selfie
              </TabsTrigger>
            </TabsList>
            <TabsContent value="camera" className="pt-3">
              {open ? (
                <FaceScanner
                  key={round}
                  maxHeight="45vh"
                  onCaptured={(f) => {
                    setRound((n) => n + 1);
                    onEmbedding(f.embedding);
                  }}
                />
              ) : null}
            </TabsContent>
            <TabsContent value="upload" className="grid gap-3 pt-3">
              {engine.ready ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-brand/60 hover:text-foreground">
                  <ImageUp className="size-8" aria-hidden />
                  Choose a clear, front-facing photo of yourself
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void fromFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <div className="relative min-h-40 rounded-xl border">
                  <ModelLoader
                    status={engine.status}
                    stage={engine.stage}
                    progress={engine.progress}
                    error={engine.error}
                    onRetry={engine.retry}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
