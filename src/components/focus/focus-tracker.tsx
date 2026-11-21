"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BedDouble, Eye, EyeOff, Pause, Play, RotateCw, Target, UserX } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CameraView } from "@/components/camera/camera-view";
import { FaceOverlay } from "@/components/camera/face-overlay";
import { ModelLoader } from "@/components/camera/model-loader";
import { PermissionGate } from "@/components/camera/permission-gate";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/use-camera";
import { useDetectionLoop } from "@/hooks/use-detection-loop";
import { useFaceEngine } from "@/hooks/use-face-engine";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import type { DetectResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type FocusState = "focused" | "away" | "drowsy" | "absent";

/** Eyes count as closed below this eye aspect ratio. */
const EAR_CLOSED = 0.2;
/** Eyes closed this long = drowsy (a blink is ~0.3 s). */
const DROWSY_MS = 1500;
const MAX_YAW = 30;
const MAX_PITCH = 25;
const TIMELINE_SECONDS = 120;

const styles: Record<FocusState, { label: string; bar: string; text: string; icon: typeof Eye }> = {
  focused: { label: "Focused", bar: "bg-success", text: "text-success-foreground", icon: Eye },
  away: { label: "Looking away", bar: "bg-warning", text: "text-warning-foreground", icon: EyeOff },
  drowsy: { label: "Drowsy", bar: "bg-danger", text: "text-danger-foreground", icon: BedDouble },
  absent: {
    label: "Not at desk",
    bar: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    icon: UserX,
  },
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * E4: focus / drowsiness tracker. Eye aspect ratio (closed eyes) and head pose (looking away)
 * from the face engine, sampled every second into a session timeline. Nothing is stored.
 */
export function FocusTracker() {
  const camera = useCamera();
  const engine = useFaceEngine();
  const sound = useSoundFeedback();
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState<DetectResult | null>(null);
  const [state, setState] = useState<FocusState>("absent");
  const [timeline, setTimeline] = useState<FocusState[]>([]);
  const [counts, setCounts] = useState<Record<FocusState, number>>({
    focused: 0,
    away: 0,
    drowsy: 0,
    absent: 0,
  });
  const [elapsed, setElapsed] = useState(0);
  const closedSinceRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const startedRef = useRef(0);
  const alertedRef = useRef(false);

  const ready = engine.ready && camera.status === "active";

  useDetectionLoop({
    videoRef: camera.videoRef,
    enabled: ready && running,
    fps: 8,
    onResult: (result) => {
      setFrame(result);
      const now = performance.now();
      const face = result.faces[0];
      let next: FocusState;
      if (!face) {
        next = "absent";
        closedSinceRef.current = null;
      } else {
        const closed = face.ear !== null && face.ear < EAR_CLOSED;
        if (closed) closedSinceRef.current ??= now;
        else closedSinceRef.current = null;
        const drowsy = closedSinceRef.current !== null && now - closedSinceRef.current >= DROWSY_MS;
        next = drowsy
          ? "drowsy"
          : Math.abs(face.yaw) > MAX_YAW || Math.abs(face.pitch) > MAX_PITCH
            ? "away"
            : "focused";
      }
      setState(next);
      if (next === "drowsy" && !alertedRef.current) {
        alertedRef.current = true;
        sound.play("error");
        setTimeout(() => sound.play("error"), 300);
        toast.warning("You look sleepy", { description: "Take a short break or stretch." });
      } else if (next !== "drowsy") {
        alertedRef.current = false;
      }
      // One timeline sample per second.
      if (now - lastTickRef.current >= 1000) {
        lastTickRef.current = now;
        setTimeline((t) => [...t, next].slice(-TIMELINE_SECONDS));
        setCounts((c) => ({ ...c, [next]: c[next] + 1 }));
        setElapsed(now - startedRef.current);
      }
    },
  });

  function start() {
    if (!running && elapsed === 0) startedRef.current = performance.now();
    else if (!running) startedRef.current = performance.now() - elapsed;
    lastTickRef.current = 0;
    setRunning((r) => !r);
    sound.play("toggle");
  }

  function reset() {
    setRunning(false);
    setTimeline([]);
    setCounts({ focused: 0, away: 0, drowsy: 0, absent: 0 });
    setElapsed(0);
    setState("absent");
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const focusPct = total ? Math.round((counts.focused / total) * 100) : 0;
  const S = styles[state];
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-3">
        <CameraView
          videoRef={camera.videoRef}
          dimensions={camera.dimensions}
          onDimensions={camera.setDimensions}
          mirrored={camera.mirrored}
          maxHeight="55vh"
        >
          {frame && ready && running ? (
            <FaceOverlay
              frame={frame}
              mirrored={camera.mirrored}
              faces={frame.faces.slice(0, 1).map((f, i) => ({
                id: i,
                box: f.box,
                status: state === "focused" ? "match" : state === "away" ? "neutral" : "unknown",
              }))}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={start} disabled={!ready}>
            {running ? <Pause aria-hidden /> : <Play aria-hidden />}{" "}
            {running ? "Pause" : elapsed ? "Resume" : "Start session"}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={total === 0}>
            <RotateCw aria-hidden /> Reset
          </Button>
          <span
            className="ml-auto font-mono text-2xl font-semibold tabular-nums"
            aria-label="Session time"
          >
            {formatDuration(elapsed)}
          </span>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Last {TIMELINE_SECONDS} seconds</span>
          <div
            className="flex h-6 gap-px overflow-hidden rounded-md bg-muted"
            role="img"
            aria-label={`Timeline: ${focusPct}% focused`}
          >
            {timeline.map((s, i) => (
              <motion.span
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                className={cn("h-full flex-1", styles[s].bar)}
              />
            ))}
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className="grid justify-items-center gap-2 rounded-2xl border bg-card p-5">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            role="img"
            aria-label={`${focusPct}% focused`}
          >
            <circle cx="70" cy="70" r={r} className="fill-none stroke-muted" strokeWidth="10" />
            <motion.circle
              cx="70"
              cy="70"
              r={r}
              className="fill-none stroke-success"
              strokeWidth="10"
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              strokeDasharray={c}
              animate={{ strokeDashoffset: c * (1 - focusPct / 100) }}
              transition={{ duration: 0.6 }}
            />
            <text
              x="70"
              y="76"
              textAnchor="middle"
              className="fill-foreground font-mono text-[24px] font-bold"
            >
              {focusPct}%
            </text>
          </svg>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="size-4" aria-hidden /> Focus score
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={running ? state : "idle"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex items-center gap-1.5 font-semibold",
                running ? S.text : "text-muted-foreground",
              )}
            >
              {running ? <S.icon className="size-4" aria-hidden /> : null}
              {running ? S.label : "Not running"}
            </motion.span>
          </AnimatePresence>
        </div>
        <ul className="grid gap-2 rounded-xl border bg-card p-4 text-sm">
          {(Object.keys(styles) as FocusState[]).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", styles[k].bar)} aria-hidden />
              {styles[k].label}
              <span className="ml-auto font-mono">{formatDuration(counts[k] * 1000)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Eyes closed for {DROWSY_MS / 1000}s = drowsy (with an alert). Head turned more than{" "}
          {MAX_YAW}° = looking away. Video never leaves this device and nothing is saved.
        </p>
      </aside>
    </div>
  );
}
