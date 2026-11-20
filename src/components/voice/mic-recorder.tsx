"use client";

import { Mic, MicOff, ShieldAlert, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { recognitionConfig } from "@/config/recognition";
import { useMicrophone } from "@/hooks/use-microphone";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { startTranscriber, type Transcriber } from "@/lib/audio/transcribe";

import { Waveform } from "./waveform";

export type Recording = {
  blob: Blob;
  /** Web Speech transcript; null when transcription is unsupported or failed. */
  transcript: string | null;
  durationMs: number;
};

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

type Session = {
  recorder: MediaRecorder;
  context: AudioContext;
  transcriber: Transcriber | null;
  startedAt: number;
  chunks: Blob[];
};

/**
 * Records one clip from the microphone with a live waveform. Stops on click or after
 * `maxRecordSeconds`. Optionally runs speech recognition alongside the recording.
 */
export function MicRecorder({
  onRecorded,
  transcribe = false,
  disabled = false,
  label = "Start recording",
}: {
  onRecorded: (recording: Recording) => void;
  transcribe?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const mic = useMicrophone();
  const sound = useSoundFeedback();
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });
  const maxMs = recognitionConfig.voice.maxRecordSeconds * 1000;
  const recording = analyser !== null;

  async function start() {
    const stream = await mic.start();
    if (!stream || sessionRef.current) return;
    const context = new AudioContext();
    const node = context.createAnalyser();
    node.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(node);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const session: Session = {
      recorder,
      context,
      transcriber: transcribe ? startTranscriber() : null,
      startedAt: performance.now(),
      chunks: [],
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) session.chunks.push(e.data);
    };
    recorder.onstop = async () => {
      const durationMs = performance.now() - session.startedAt;
      sound.play("record-stop");
      const transcript = session.transcriber ? await session.transcriber.stop() : null;
      void session.context.close();
      sessionRef.current = null;
      setAnalyser(null);
      setElapsed(0);
      const blob = new Blob(session.chunks, { type: recorder.mimeType || mimeType });
      onRecordedRef.current({ blob, transcript, durationMs });
    };
    sessionRef.current = session;
    sound.play("record-start");
    recorder.start();
    setAnalyser(node);
  }

  function stop() {
    const session = sessionRef.current;
    if (session && session.recorder.state === "recording") session.recorder.stop();
  }

  // Elapsed timer + auto-stop.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      const ms = performance.now() - session.startedAt;
      setElapsed(ms);
      if (ms >= maxMs && session.recorder.state === "recording") session.recorder.stop();
    }, 100);
    return () => clearInterval(timer);
  }, [recording, maxMs]);

  // Abandon an in-progress recording on unmount.
  useEffect(
    () => () => {
      const session = sessionRef.current;
      if (!session) return;
      session.recorder.onstop = null;
      if (session.recorder.state === "recording") session.recorder.stop();
      session.transcriber?.abort();
      void session.context.close();
    },
    [],
  );

  if (mic.status === "denied" || mic.status === "unavailable" || mic.status === "error") {
    const Icon = mic.status === "denied" ? ShieldAlert : MicOff;
    return (
      <div
        role="alert"
        className="grid justify-items-center gap-2 rounded-lg border p-4 text-center"
      >
        <Icon className="size-5 text-warning-foreground" aria-hidden />
        <p className="text-sm font-medium">
          {mic.status === "denied" ? "Microphone blocked" : "Microphone unavailable"}
        </p>
        <p className="text-sm text-muted-foreground">
          {mic.status === "denied"
            ? "Click the microphone icon in your address bar, allow access, then try again."
            : mic.error}
        </p>
        <Button size="sm" variant="outline" onClick={() => void mic.start()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Waveform analyser={analyser} />
      <div className="flex items-center gap-3">
        {recording ? (
          <Button variant="destructive" onClick={stop}>
            <Square aria-hidden /> Stop
          </Button>
        ) : (
          <Button onClick={() => void start()} disabled={disabled || mic.status === "requesting"}>
            <Mic aria-hidden /> {mic.status === "requesting" ? "Waiting for permission…" : label}
          </Button>
        )}
        <span className="ml-auto font-mono text-sm text-muted-foreground" aria-live="off">
          {(elapsed / 1000).toFixed(1)}s / {maxMs / 1000}s
        </span>
      </div>
      {recording ? (
        <p className="sr-only" aria-live="polite">
          Recording
        </p>
      ) : null}
    </div>
  );
}
