"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRef, useState } from "react";

import { recognitionConfig } from "@/config/recognition";
import { useCamera } from "@/hooks/use-camera";
import { useDetectionLoop } from "@/hooks/use-detection-loop";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { captureFaceThumbnail } from "@/lib/ai/capture";
import { qualityCheck, qualityLabels, type QualityReason, qualityScore } from "@/lib/ai/quality";
import type { DetectResult } from "@/lib/ai/types";
import { normalize } from "@/lib/ai/vector";
import { cn } from "@/lib/utils";

import { CameraView } from "./camera-view";
import { FaceOverlay } from "./face-overlay";
import { ModelLoader } from "./model-loader";
import { PermissionGate } from "./permission-gate";
import { ScanOverlay } from "./scan-overlay";

export type ScannedFace = { embedding: Float32Array; quality: number; thumbnail: Blob };

/** Good frames averaged into one embedding (steadier than a single frame). */
const FRAMES = 3;

/**
 * One-shot face scan: waits for a single, good-quality face, averages a few frames into one
 * embedding, grabs a thumbnail and reports it once. Remount (change `key`) to scan again.
 */
export function FaceScanner({
  onCaptured,
  maxHeight = "50vh",
}: {
  onCaptured: (face: ScannedFace) => void;
  maxHeight?: string;
}) {
  const camera = useCamera();
  const engine = useFaceEngine();
  const sound = useSoundFeedback();
  const [frame, setFrame] = useState<DetectResult | null>(null);
  const [reasons, setReasons] = useState<QualityReason[]>(["no_face"]);
  const [done, setDone] = useState(false);
  const framesRef = useRef<Float32Array[]>([]);
  const busyRef = useRef(false);

  const ready = engine.ready && camera.status === "active";

  useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: ready && !done,
    fps: 8,
    options: { quality: true, fresh: true },
    onResult: async (result) => {
      setFrame(result);
      const qc = qualityCheck(result.faces);
      setReasons(qc.reasons);
      const face = result.faces[0];
      if (!qc.ok || !face?.embedding) {
        framesRef.current = [];
        return;
      }
      framesRef.current.push(face.embedding);
      if (framesRef.current.length < Math.max(FRAMES, recognitionConfig.enrollment.stableFrames)) {
        return;
      }
      const video = camera.videoRef.current;
      if (!video || busyRef.current) return;
      busyRef.current = true;
      try {
        const sum = new Float32Array(face.embedding.length);
        for (const e of framesRef.current.slice(-FRAMES)) {
          for (let i = 0; i < e.length; i++) sum[i]! += e[i]!;
        }
        const thumbnail = await captureFaceThumbnail(video, face.box);
        setDone(true);
        sound.play("capture");
        onCaptured({ embedding: normalize(sum), quality: qualityScore(face), thumbnail });
      } finally {
        busyRef.current = false;
      }
    },
  });

  const good = reasons.length === 0;

  return (
    <div className="grid gap-3">
      <CameraView
        videoRef={camera.videoRef}
        dimensions={camera.dimensions}
        onDimensions={camera.setDimensions}
        mirrored={camera.mirrored}
        maxHeight={maxHeight}
      >
        {frame && ready ? (
          <FaceOverlay
            frame={frame}
            mirrored={camera.mirrored}
            faces={frame.faces.map((f, i) => ({
              id: i,
              box: f.box,
              status: good ? "match" : "unknown",
            }))}
          />
        ) : null}
        {ready && good && !done ? <ScanOverlay label="Hold still…" /> : null}
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
      {ready && !done ? (
        <ul className="flex flex-wrap gap-2" aria-live="polite" aria-label="Quality checks">
          {good ? (
            <Chip ok label="Looks good, hold still" />
          ) : (
            reasons.map((r) => <Chip key={r} ok={false} label={qualityLabels[r]} />)
          )}
        </ul>
      ) : null}
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
        ok
          ? "border-success/40 text-success-foreground"
          : "border-warning/40 text-warning-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden /> {label}
    </li>
  );
}
