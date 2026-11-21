"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Camera, Pause, Play, ShieldCheck, SwitchCamera, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CameraView } from "@/components/camera/camera-view";
import { FaceOverlay } from "@/components/camera/face-overlay";
import { LivenessChallenge } from "@/components/camera/liveness-challenge";
import { ModelLoader } from "@/components/camera/model-loader";
import { PermissionGate } from "@/components/camera/permission-gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recognitionConfig } from "@/config/recognition";
import { useCamera } from "@/hooks/use-camera";
import { useDetectionLoop } from "@/hooks/use-detection-loop";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { canvasToBlob, downloadBlob } from "@/lib/ai/capture";
import { FaceTracker } from "@/lib/ai/tracker";
import type { DetectResult, FaceResult } from "@/lib/ai/types";
import { normalize } from "@/lib/ai/vector";
import { listPeople, peopleKeys } from "@/lib/data/people";
import { createRecognitionLogger, type FaceMatch, matchFace } from "@/lib/data/recognition";

import { InFramePanel } from "./in-frame-panel";
import { type LiveFace, ScoresPanel } from "./scores-panel";

type TrackInfo = {
  firstSeenAt: number;
  lastAttemptAt: number;
  attempts: number;
  pending: boolean;
  /** Last few usable embeddings; matching uses their average. */
  embeddings: Float32Array[];
  match: FaceMatch | null;
};

const live = recognitionConfig.live;

/** Turned-away or tiny faces give poor embeddings, so they aren't used for matching. */
function usableForMatching(face: FaceResult) {
  return (
    face.embedding !== null &&
    Math.abs(face.yaw) <= live.maxMatchYawDeg &&
    face.box.width >= live.minMatchFaceSize
  );
}

function averageEmbedding(embeddings: Float32Array[]) {
  const sum = new Float32Array(embeddings[0]!.length);
  for (const e of embeddings) for (let i = 0; i < e.length; i++) sum[i]! += e[i]!;
  return normalize(sum);
}

/**
 * Live multi-face recognition (PROJECT_SPEC §8 screen 3). Detection runs in the worker at
 * ~7 FPS; each tracked face is matched once (debounced), unknowns are retried a few times.
 */
export function LiveRecognition() {
  const camera = useCamera();
  const engine = useFaceEngine();
  const people = useQuery({ queryKey: peopleKeys.list(), queryFn: listPeople });
  const [paused, setPaused] = useState(false);
  const [frame, setFrame] = useState<DetectResult | null>(null);
  const [faces, setFaces] = useState<LiveFace[]>([]);
  const [livenessOpen, setLivenessOpen] = useState(false);
  const [showScores, setShowScores] = useState(false);

  const trackerRef = useRef(new FaceTracker());
  const tracksRef = useRef(new Map<number, TrackInfo>());
  const loggerRef = useRef<ReturnType<typeof createRecognitionLogger> | null>(null);
  const sound = useSoundFeedback();
  /** Last chime per person, so someone standing in view doesn't chime on every re-check. */
  const chimedRef = useRef(new Map<string, number>());

  function scheduleMatches(now: number) {
    loggerRef.current ??= createRecognitionLogger("live");
    const log = loggerRef.current;
    for (const [id, info] of tracksRef.current) {
      if (info.pending || info.embeddings.length === 0) continue;
      const firstTry = info.attempts === 0 && now - info.firstSeenAt >= live.matchDebounceMs;
      const recheck = info.attempts > 0 && now - info.lastAttemptAt >= live.rematchIntervalMs;
      if (!firstTry && !recheck) continue;

      info.pending = true;
      info.attempts += 1;
      info.lastAttemptAt = now;
      matchFace(averageEmbedding(info.embeddings))
        .then((match) => {
          const current = tracksRef.current.get(id);
          if (!current) return;
          const wasMatch = current.match?.status === "match";
          current.match = match;
          if (match.status === "match" && !wasMatch && match.personId) {
            const last = chimedRef.current.get(match.personId) ?? -Infinity;
            if (Date.now() - last > live.logThrottleMs) {
              chimedRef.current.set(match.personId, Date.now());
              // Watchlist (X3): a flagged person gets an alarm and a persistent alert.
              const person = people.data?.find((p) => p.id === match.personId);
              if (person?.list_type === "flagged") {
                sound.play("error");
                setTimeout(() => sound.play("error"), 350);
                toast.error(`Flagged person in view: ${person.name}`, {
                  description: "This person is on your watchlist.",
                  duration: 10_000,
                });
                if (typeof navigator !== "undefined" && "vibrate" in navigator)
                  navigator.vibrate?.([200, 100, 200]);
              } else {
                sound.play("recognized");
                if (person?.list_type === "allowed")
                  toast.success(`${person.name} (allowed) arrived`);
              }
            }
          } else if (match.status === "unknown" && current.attempts === 1) {
            sound.play("unknown");
          }
          if (match.status === "match") void log(match.personId, match.similarity);
          // Unknown faces are logged once per track (person_id = null).
          else if (match.status === "unknown" && current.attempts === 1) {
            void log(null, null, String(id));
          }
        })
        .catch(() => undefined)
        .finally(() => {
          const current = tracksRef.current.get(id);
          if (current) current.pending = false;
        });
    }
  }

  const { fps } = useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: engine.ready && camera.status === "active" && !paused,
    fps: live.targetFps,
    onResult: (result) => {
      const now = performance.now();
      const ids = trackerRef.current.update(result.faces.map((f) => f.box));
      const alive = new Set(trackerRef.current.active.map((t) => t.id));
      for (const id of tracksRef.current.keys()) if (!alive.has(id)) tracksRef.current.delete(id);

      ids.forEach((id, i) => {
        const face = result.faces[i]!;
        let info = tracksRef.current.get(id);
        if (!info) {
          info = {
            firstSeenAt: now,
            lastAttemptAt: 0,
            attempts: 0,
            pending: false,
            embeddings: [],
            match: null,
          };
          tracksRef.current.set(id, info);
        }
        if (usableForMatching(face)) {
          info.embeddings.push(face.embedding!);
          if (info.embeddings.length > live.embeddingWindow) info.embeddings.shift();
        }
      });
      scheduleMatches(now);

      setFrame(result);
      setFaces(
        ids.map((id, i) => {
          const match = tracksRef.current.get(id)?.match;
          return {
            id,
            box: result.faces[i]!.box,
            status: match ? match.status : "pending",
            label: match
              ? match.status === "unknown"
                ? "Unknown"
                : (match.name ?? "Unknown")
              : "Identifying…",
            similarity: match?.similarity ?? null,
            bestName: match?.name ?? null,
            runnerUp: match?.runnerUp ?? null,
          };
        }),
      );
    },
  });

  async function snapshot() {
    const video = camera.videoRef.current;
    if (!video || !frame) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (camera.mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 3;
    ctx.font = "600 18px Inter, sans-serif";
    const colors = { match: "#10b981", uncertain: "#f59e0b", unknown: "#ef4444" } as const;
    for (const f of faces) {
      const x = camera.mirrored ? canvas.width - f.box.x - f.box.width : f.box.x;
      const color = f.status in colors ? colors[f.status as keyof typeof colors] : "#6366f1";
      ctx.strokeStyle = color;
      ctx.strokeRect(x, f.box.y, f.box.width, f.box.height);
      if (f.label) {
        const text =
          f.similarity != null ? `${f.label} ${Math.round(f.similarity * 100)}%` : f.label;
        ctx.fillStyle = color;
        ctx.fillRect(x, f.box.y + f.box.height + 4, ctx.measureText(text).width + 12, 26);
        ctx.fillStyle = "#fff";
        ctx.fillText(text, x + 6, f.box.y + f.box.height + 23);
      }
    }
    try {
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, `faceverse-snapshot-${new Date().toISOString().slice(0, 19)}.png`);
    } catch {
      toast.error("Snapshot failed");
    }
  }

  const ready = engine.ready && camera.status === "active";
  const noPeople = people.data?.length === 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="grid content-start gap-3">
        {noPeople ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
            <span>No one is enrolled yet, so every face will show as Unknown.</span>
            <Button size="sm" variant="outline" className="ml-auto" asChild>
              <Link href="/enroll">
                <UserPlus aria-hidden /> Enroll someone
              </Link>
            </Button>
          </div>
        ) : null}

        <CameraView
          videoRef={camera.videoRef}
          dimensions={camera.dimensions}
          onDimensions={camera.setDimensions}
          mirrored={camera.mirrored}
          maxHeight="72vh"
        >
          {frame && ready && !paused ? (
            <FaceOverlay faces={faces} frame={frame} mirrored={camera.mirrored} />
          ) : null}
          {ready && paused ? (
            <div className="absolute inset-0 grid place-items-center bg-background/40 text-sm font-medium backdrop-blur-[2px]">
              Paused
            </div>
          ) : null}
          {ready ? (
            <span className="absolute top-3 left-3 rounded-md border bg-background/80 px-2 py-0.5 font-mono text-[11px] backdrop-blur">
              {paused ? "paused" : `${fps} fps`} · {engine.backend}
            </span>
          ) : null}
          <PermissionGate
            status={camera.status}
            error={camera.error}
            onRequest={() => camera.start()}
          />
          {camera.status === "active" ? (
            <ModelLoader
              status={engine.status}
              stage={engine.stage}
              progress={engine.progress}
              error={engine.error}
              onRetry={engine.retry}
            />
          ) : null}
        </CameraView>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPaused((p) => !p)} disabled={!ready}>
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" onClick={snapshot} disabled={!ready || paused}>
            <Camera aria-hidden /> Snapshot
          </Button>
          {camera.devices.length > 1 ? (
            <Button variant="outline" onClick={camera.switchCamera}>
              <SwitchCamera aria-hidden /> Switch camera
            </Button>
          ) : null}
          <Button
            variant={showScores ? "secondary" : "ghost"}
            className="ml-auto"
            onClick={() => setShowScores((v) => !v)}
            aria-pressed={showScores}
          >
            <Activity aria-hidden /> Scores
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPaused(true);
              setLivenessOpen(true);
            }}
            disabled={!engine.ready}
          >
            <ShieldCheck aria-hidden /> Test liveness
          </Button>
        </div>
      </div>

      <div className="grid content-start gap-4">
        <InFramePanel faces={faces} people={people.data ?? []} />
        {showScores ? <ScoresPanel faces={faces} /> : null}
      </div>

      <Dialog
        open={livenessOpen}
        onOpenChange={(open) => {
          setLivenessOpen(open);
          if (!open) setPaused(false);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Liveness check</DialogTitle>
            <DialogDescription>
              Follow two random prompts. Used later for biometric login (Phase 3).
            </DialogDescription>
          </DialogHeader>
          {livenessOpen ? <LivenessChallenge /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
