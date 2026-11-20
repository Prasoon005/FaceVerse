"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, CircleCheck, CircleX, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CameraView } from "@/components/camera/camera-view";
import { FaceOverlay } from "@/components/camera/face-overlay";
import { ModelLoader } from "@/components/camera/model-loader";
import { PermissionGate } from "@/components/camera/permission-gate";
import { ScanOverlay } from "@/components/camera/scan-overlay";
import { Button } from "@/components/ui/button";
import { recognitionConfig } from "@/config/recognition";
import { useCamera } from "@/hooks/use-camera";
import { useDetectionLoop } from "@/hooks/use-detection-loop";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { captureFaceThumbnail } from "@/lib/ai/capture";
import { qualityCheck, qualityLabels, type QualityReason, qualityScore } from "@/lib/ai/quality";
import type { DetectResult, FaceResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export type CapturedSample = {
  embedding: Float32Array;
  quality: number;
  thumbnail: Blob;
  previewUrl: string;
  pose: string;
};

type Pose = { key: string; instruction: string };

const POSES: Pose[] = [
  { key: "straight", instruction: "Look straight at the camera" },
  { key: "side-a", instruction: "Turn your head slightly to one side" },
  { key: "side-b", instruction: "Now turn slightly to the other side" },
];
const EXTRA_POSE: Pose = { key: "extra", instruction: "Extra sample: any comfortable angle" };

const cfg = recognitionConfig.enrollment;

function poseMatches(pose: Pose, face: FaceResult, firstSideSign: number | null) {
  const yaw = Math.abs(face.yaw);
  switch (pose.key) {
    case "straight":
      return yaw < cfg.straightMaxYawDeg;
    case "side-a":
      return yaw >= cfg.sideMinYawDeg && yaw <= cfg.sideMaxYawDeg;
    case "side-b":
      // Must be the opposite direction from the first side pose (works regardless of
      // camera mirroring or yaw sign conventions).
      return (
        yaw >= cfg.sideMinYawDeg &&
        yaw <= cfg.sideMaxYawDeg &&
        firstSideSign !== null &&
        Math.sign(face.yaw) === -firstSideSign
      );
    default:
      return yaw <= recognitionConfig.quality.maxYawDeg;
  }
}

export function FaceCaptureStep({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (samples: CapturedSample[]) => void;
}) {
  const camera = useCamera();
  const engine = useFaceEngine();
  const sound = useSoundFeedback();
  const [samples, setSamples] = useState<CapturedSample[]>([]);
  /** Bumped on every capture to replay the camera flash. */
  const [flash, setFlash] = useState(0);
  const [frame, setFrame] = useState<DetectResult | null>(null);
  const [reasons, setReasons] = useState<QualityReason[]>(["no_face"]);
  const [poseOk, setPoseOk] = useState(false);
  const [wantsExtra, setWantsExtra] = useState(false);
  const stableRef = useRef(0);
  const capturingRef = useRef(false);
  const firstSideSignRef = useRef<number | null>(null);

  const posesDone = samples.length >= POSES.length;
  const pose = posesDone ? (wantsExtra ? EXTRA_POSE : null) : POSES[samples.length]!;
  const canAddExtra = posesDone && samples.length < recognitionConfig.samples.faceMax;

  async function capture(face: FaceResult, currentPose: Pose) {
    const video = camera.videoRef.current;
    if (!video || !face.embedding || capturingRef.current) return;
    capturingRef.current = true;
    try {
      const thumbnail = await captureFaceThumbnail(video, face.box);
      if (currentPose.key === "side-a") firstSideSignRef.current = Math.sign(face.yaw) || 1;
      setSamples((prev) => [
        ...prev,
        {
          embedding: face.embedding!,
          quality: qualityScore(face),
          thumbnail,
          previewUrl: URL.createObjectURL(thumbnail),
          pose: currentPose.key,
        },
      ]);
      setWantsExtra(false);
      stableRef.current = 0;
      setFlash((n) => n + 1);
      // The last required pose gets a success chime instead of the shutter.
      sound.play(samples.length + 1 === POSES.length ? "success" : "capture");
    } catch {
      toast.error("Couldn't capture that frame, please try again.");
    } finally {
      capturingRef.current = false;
    }
  }

  const { fps } = useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: engine.ready && camera.status === "active" && pose !== null,
    fps: 8,
    options: { quality: true, fresh: true },
    onResult: (result) => {
      setFrame(result);
      const qc = qualityCheck(result.faces);
      const face = result.faces[0];
      const matches = Boolean(face && pose && poseMatches(pose, face, firstSideSignRef.current));
      setReasons(qc.reasons);
      setPoseOk(matches);
      if (qc.ok && matches && face?.embedding && pose) {
        stableRef.current += 1;
        if (stableRef.current >= cfg.stableFrames) void capture(face, pose);
      } else {
        stableRef.current = 0;
      }
    },
  });

  function manualCapture() {
    const face = frame?.faces[0];
    if (!face || !pose) return;
    if (!qualityCheck(frame.faces).ok) {
      toast.warning("Fix the highlighted issues first.");
      return;
    }
    void capture(face, pose);
  }

  function removeSample(index: number) {
    setSamples((prev) => {
      URL.revokeObjectURL(prev[index]!.previewUrl);
      const next = prev.filter((_, i) => i !== index);
      // Removing a side pose invalidates the "opposite side" reference.
      if (next.length < 2) firstSideSignRef.current = null;
      return next;
    });
  }

  const ready = engine.ready && camera.status === "active";
  const goodFrame = reasons.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="grid gap-3">
        <CameraView
          videoRef={camera.videoRef}
          dimensions={camera.dimensions}
          onDimensions={camera.setDimensions}
          mirrored={camera.mirrored}
          maxHeight="60vh"
        >
          {frame && ready ? (
            <FaceOverlay
              frame={frame}
              mirrored={camera.mirrored}
              faces={frame.faces.map((f, i) => ({
                id: i,
                box: f.box,
                status: goodFrame && poseOk ? "match" : goodFrame ? "neutral" : "unknown",
              }))}
            />
          ) : null}
          {ready && pose && goodFrame && poseOk ? <ScanOverlay label="Hold still…" /> : null}
          <AnimatePresence>
            {flash > 0 ? (
              <motion.div
                key={flash}
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.75 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            ) : null}
          </AnimatePresence>
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

        <div aria-live="polite" className="grid gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-medium">
              {pose ? pose.instruction : "All poses captured"}
            </p>
            {ready && pose ? (
              <span className="ml-auto font-mono text-xs text-muted-foreground">{fps} fps</span>
            ) : null}
          </div>
          {pose ? (
            <ul className="flex flex-wrap gap-2" aria-label="Quality checks">
              {reasons.length === 0 ? (
                <Chip ok label="Quality looks good" />
              ) : (
                reasons.map((r) => <Chip key={r} ok={false} label={qualityLabels[r]} />)
              )}
              {reasons.length === 0 ? (
                <Chip
                  ok={poseOk}
                  label={poseOk ? "Pose matched, hold still" : "Adjust your pose"}
                />
              ) : null}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {pose ? (
              <Button
                variant="outline"
                size="sm"
                onClick={manualCapture}
                disabled={!ready || !goodFrame}
              >
                <Camera aria-hidden /> Capture now
              </Button>
            ) : null}
            {canAddExtra && !wantsExtra ? (
              <Button variant="outline" size="sm" onClick={() => setWantsExtra(true)}>
                <Plus aria-hidden /> Add extra sample
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">
            Samples{" "}
            <span className="font-mono text-muted-foreground">
              {samples.length}/{recognitionConfig.samples.faceMin}
            </span>
          </h3>
          <ul className="grid grid-cols-3 gap-2 lg:grid-cols-2">
            {[...Array(Math.max(POSES.length, samples.length))].map((_, i) => {
              const sample = samples[i];
              return (
                <li
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  {sample ? (
                    <motion.div
                      key={sample.previewUrl}
                      className="size-full"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                      <img
                        src={sample.previewUrl}
                        alt={`Sample ${i + 1}`}
                        className={cn("size-full object-cover", camera.mirrored && "-scale-x-100")}
                      />
                      <button
                        type="button"
                        onClick={() => removeSample(i)}
                        className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
                        aria-label={`Remove sample ${i + 1}`}
                      >
                        <CircleX className="size-4" aria-hidden />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 font-mono text-[10px]">
                        {Math.round(sample.quality * 100)}%
                      </span>
                    </motion.div>
                  ) : (
                    <span className="grid size-full place-items-center text-xs text-muted-foreground">
                      {POSES[i]?.key === "straight" ? "Front" : `Side ${i}`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden /> Back
          </Button>
          <Button
            className="flex-1"
            disabled={samples.length < recognitionConfig.samples.faceMin}
            onClick={() => onComplete(samples)}
          >
            Review <ArrowRight aria-hidden />
          </Button>
        </div>
      </aside>
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
      <Icon className="size-3.5" aria-hidden />
      {label}
    </li>
  );
}
