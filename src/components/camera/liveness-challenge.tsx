"use client";

import {
  CircleCheck,
  CircleX,
  Eye,
  MoveLeft,
  MoveRight,
  Play,
  RotateCw,
  Smile,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { recognitionConfig } from "@/config/recognition";
import { useCamera } from "@/hooks/use-camera";
import { useDetectionLoop } from "@/hooks/use-detection-loop";
import { useFaceEngine } from "@/hooks/use-face-engine";
import {
  type ChallengeType,
  challengeLabels,
  createLivenessState,
  failureLabels,
  type LivenessResult,
  type LivenessState,
  pickChallenges,
  toLivenessResult,
  updateLiveness,
} from "@/lib/ai/liveness";
import { FaceTracker } from "@/lib/ai/tracker";
import type { DetectResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

import { CameraView } from "./camera-view";
import { FaceOverlay } from "./face-overlay";
import { ModelLoader } from "./model-loader";
import { PermissionGate } from "./permission-gate";

const challengeIcons: Record<ChallengeType, typeof Eye> = {
  blink: Eye,
  turn_left: MoveLeft,
  turn_right: MoveRight,
  smile: Smile,
};

/**
 * Reusable liveness check (PROJECT_SPEC §7.2): a random sequence of 2 challenges,
 * 8 s each, with a continuous face track required throughout.
 */
export function LivenessChallenge({
  onComplete,
  autoStart = false,
}: {
  onComplete?: (result: LivenessResult) => void;
  autoStart?: boolean;
}) {
  const camera = useCamera();
  const engine = useFaceEngine();
  const [state, setState] = useState<LivenessState | null>(null);
  const [lastFrame, setLastFrame] = useState<DetectResult | null>(null);
  const [now, setNow] = useState(0);
  const trackerRef = useRef(new FaceTracker());
  const reportedRef = useRef(false);

  const start = useCallback(() => {
    trackerRef.current.reset();
    reportedRef.current = false;
    const t = performance.now();
    setNow(t);
    setState(createLivenessState(pickChallenges(), t));
  }, []);

  const running = state !== null && state.finishedAt === null;
  const ready = engine.ready && camera.status === "active";

  useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: ready,
    fps: 10,
    onResult: (result) => {
      setLastFrame(result);
      const t = performance.now();
      setNow(t);
      const ids = trackerRef.current.update(result.faces.map((f) => f.box));
      setState((current) => {
        // autoStart: begin the sequence on the first frame once camera + engine are ready.
        const prev = current ?? (autoStart ? createLivenessState(pickChallenges(), t) : null);
        if (!prev || prev.finishedAt !== null) return prev;
        const face = result.faces[0];
        const next = updateLiveness(
          prev,
          face
            ? {
                faceCount: result.faces.length,
                trackId: ids[0] ?? null,
                ear: face.ear,
                yawDeg: face.yaw,
                happy: face.happy,
              }
            : null,
          t,
        );
        if (next.finishedAt !== null && !reportedRef.current) {
          reportedRef.current = true;
          queueMicrotask(() => onComplete?.(toLivenessResult(next)));
        }
        return next;
      });
    },
  });

  const step = state ? state.steps[state.current] : null;
  const timeLeft =
    running && step?.startedAt != null
      ? Math.max(0, recognitionConfig.liveness.challengeTimeoutMs - (now - step.startedAt))
      : 0;

  return (
    <div className="grid gap-4">
      <CameraView
        videoRef={camera.videoRef}
        dimensions={camera.dimensions}
        onDimensions={camera.setDimensions}
        mirrored={camera.mirrored}
        maxHeight="50vh"
      >
        {lastFrame && running ? (
          <FaceOverlay
            frame={lastFrame}
            mirrored={camera.mirrored}
            faces={lastFrame.faces.map((f, i) => ({ id: i, box: f.box, status: "neutral" }))}
          />
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

      <div aria-live="polite" className="grid gap-3 rounded-xl border bg-card p-4">
        {!state ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              You&apos;ll get two quick prompts, like blinking or turning your head.
            </p>
            <Button onClick={start} disabled={!ready}>
              <Play aria-hidden /> Start liveness check
            </Button>
          </div>
        ) : running && step ? (
          <>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = challengeIcons[step.type];
                return <Icon className="size-5 text-brand" aria-hidden />;
              })()}
              <p className="text-base font-medium">{challengeLabels[step.type]}</p>
              <span className="ml-auto font-mono text-sm text-muted-foreground">
                {Math.ceil(timeLeft / 1000)}s
              </span>
            </div>
            <Progress
              value={(timeLeft / recognitionConfig.liveness.challengeTimeoutMs) * 100}
              className="h-1"
              aria-label="Time left"
            />
          </>
        ) : state.passed ? (
          <div className="flex flex-wrap items-center gap-3">
            <CircleCheck className="size-5 text-success-foreground" aria-hidden />
            <p className="text-sm font-medium">
              Liveness passed in {(toLivenessResult(state).durationMs / 1000).toFixed(1)}s
            </p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={start}>
              <RotateCw aria-hidden /> Run again
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <CircleX className="size-5 text-danger-foreground" aria-hidden />
            <p className="text-sm font-medium">
              Liveness failed. {state.failure ? failureLabels[state.failure] : null}
            </p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={start}>
              <RotateCw aria-hidden /> Try again
            </Button>
          </div>
        )}

        {state ? (
          <ol className="flex flex-wrap gap-2" aria-label="Challenge steps">
            {state.steps.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                  s.status === "passed" && "border-success/40 text-success-foreground",
                  s.status === "failed" && "border-danger/40 text-danger-foreground",
                  s.status === "active" && "border-brand/50 text-foreground",
                  s.status === "pending" && "text-muted-foreground",
                )}
              >
                {s.status === "passed" ? (
                  <CircleCheck className="size-3.5" aria-hidden />
                ) : s.status === "failed" ? (
                  <CircleX className="size-3.5" aria-hidden />
                ) : null}
                {challengeLabels[s.type]}
                <span className="sr-only">: {s.status}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
