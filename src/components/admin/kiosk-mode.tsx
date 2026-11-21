"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CircleX,
  Clock,
  LogIn,
  LogOut,
  Maximize,
  Minimize,
  MonitorSmartphone,
  ScanFace,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LivenessChallenge } from "@/components/camera/liveness-challenge";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { formatTimeIn } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KioskResponse } from "@/app/api/kiosk/attendance/route";

type Result =
  | {
      kind: "success";
      name: string;
      action: "check_in" | "check_out";
      at: string;
      avatarUrl: string | null;
    }
  | { kind: "error"; message: string; name?: string };

type LogEntry = { id: number; name: string; action: "check_in" | "check_out"; at: string };

const RESULT_MS = 4000;

function greeting(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Attendance kiosk: a shared device (laptop/tablet at the entrance) that anyone walks up to.
 * Liveness → face capture → server identifies the member → big animated welcome, then it
 * resets for the next person automatically.
 */
export function KioskMode({ timezone }: { timezone: string }) {
  const { play } = useSoundFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      clearInterval(id);
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const next = useCallback((delay: number) => {
    setTimeout(() => {
      setResult(null);
      setRound((n) => n + 1);
    }, delay);
  }, []);

  async function identify(embedding: Float32Array) {
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceEmbedding: Array.from(embedding), livenessPassed: true }),
      });
      const body = (await res.json()) as KioskResponse;
      if (body.ok) {
        play("recognized");
        setResult({
          kind: "success",
          name: body.name,
          action: body.action,
          at: body.at,
          avatarUrl: body.avatarUrl,
        });
        setLog((l) =>
          [{ id: Date.now(), name: body.name, action: body.action, at: body.at }, ...l].slice(
            0,
            12,
          ),
        );
      } else {
        play(body.error === "done" ? "step" : "unknown");
        setResult({ kind: "error", message: body.message, name: body.name });
      }
    } catch {
      play("error");
      setResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setBusy(false);
      next(RESULT_MS);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      // Fullscreen is optional.
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative grid gap-4 overflow-hidden rounded-2xl border bg-card p-4 lg:grid-cols-[1fr_300px]",
        fullscreen && "h-dvh rounded-none border-0 p-6",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-80 animate-aurora rounded-full bg-brand/15 blur-3xl"
      />

      <section className="relative grid content-start gap-4">
        <header className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/15 text-brand">
            <MonitorSmartphone className="size-5" aria-hidden />
          </span>
          <div className="grid">
            <h2 className="font-semibold">{greeting(timezone)}! Look at the camera</h2>
            <p className="text-xs text-muted-foreground">
              Follow the two prompts, then hold still. Second scan of the day = check-out.
            </p>
          </div>
          <span
            className="ml-auto font-mono text-2xl font-semibold tabular-nums sm:text-3xl"
            aria-label="Current time"
          >
            {formatTimeIn(clock, timezone)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </Button>
        </header>

        <div className="relative">
          <div
            className={cn(
              result || busy ? "pointer-events-none opacity-30 blur-sm" : "",
              "transition-all",
            )}
          >
            <LivenessChallenge
              key={round}
              captureFace
              autoStart
              onFaceCaptured={identify}
              onComplete={(r) => {
                if (!r.passed) next(2500);
              }}
            />
          </div>

          <AnimatePresence>
            {busy && !result ? (
              <motion.div
                key="busy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center"
              >
                <div className="grid justify-items-center gap-3">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="grid size-16 place-items-center rounded-full border-4 border-brand/30 border-t-brand"
                  >
                    <ScanFace className="size-6 text-brand" aria-hidden />
                  </motion.span>
                  <p className="font-medium">Identifying…</p>
                </div>
              </motion.div>
            ) : null}

            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="absolute inset-0 grid place-items-center p-4"
                aria-live="assertive"
              >
                {result.kind === "success" ? (
                  <div className="grid justify-items-center gap-3 rounded-2xl border border-success/40 bg-card/95 p-5 text-center shadow-2xl sm:p-8">
                    <div className="relative">
                      {[0, 1, 2].map((ring) => (
                        <motion.span
                          key={ring}
                          aria-hidden
                          className="absolute inset-0 rounded-full border-2 border-success"
                          initial={{ scale: 1, opacity: 0.7 }}
                          animate={{ scale: 1.9, opacity: 0 }}
                          transition={{ duration: 1.4, delay: ring * 0.25, repeat: Infinity }}
                        />
                      ))}
                      <PersonAvatar
                        name={result.name}
                        url={result.avatarUrl}
                        className="size-16 sm:size-24"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.action === "check_in" ? "Welcome" : "See you tomorrow"},
                    </p>
                    <p className="text-2xl font-bold sm:text-3xl">{result.name}</p>
                    <p className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success-foreground">
                      {result.action === "check_in" ? (
                        <LogIn className="size-4" aria-hidden />
                      ) : (
                        <LogOut className="size-4" aria-hidden />
                      )}
                      {result.action === "check_in" ? "Checked in" : "Checked out"} at{" "}
                      <span className="font-mono">{formatTimeIn(result.at, timezone)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="grid max-w-sm justify-items-center gap-3 rounded-2xl border border-danger/40 bg-card/95 p-5 text-center shadow-2xl sm:p-8">
                    <motion.span
                      animate={{ x: [0, -8, 8, -5, 5, 0] }}
                      transition={{ duration: 0.5 }}
                      className="grid size-16 place-items-center rounded-full bg-danger/10 text-danger-foreground"
                    >
                      {result.name ? (
                        <Clock className="size-8" aria-hidden />
                      ) : (
                        <UserX className="size-8" aria-hidden />
                      )}
                    </motion.span>
                    <p className="font-semibold">
                      {result.name ? `Hi ${result.name}` : "Not recognised"}
                    </p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      <aside className="relative grid content-start gap-3 rounded-xl border bg-background/60 p-4">
        <h3 className="text-sm font-medium">This session</h3>
        {log.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleX className="size-4" aria-hidden /> No scans yet
          </p>
        ) : (
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {log.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      entry.action === "check_in" ? "bg-success" : "bg-brand",
                    )}
                    aria-hidden
                  />
                  <span className="truncate font-medium">{entry.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {entry.action === "check_in" ? "in" : "out"} {formatTimeIn(entry.at, timezone)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </aside>
    </div>
  );
}
