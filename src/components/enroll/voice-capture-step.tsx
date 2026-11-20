"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, SkipForward, Trash2 } from "lucide-react";
import { useState } from "react";

import { VoiceCapture } from "@/components/voice/voice-capture";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { recognitionConfig } from "@/config/recognition";
import { useIsClient } from "@/hooks/use-is-client";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { generatePhrase, phrasePassed } from "@/lib/audio/phrase";
import type { VoiceSample } from "@/lib/audio/process-recording";
import { isTranscriptionSupported } from "@/lib/audio/transcribe";

type Props = {
  onBack: () => void;
  onComplete: (samples: VoiceSample[]) => void;
  /** Voice is optional for new people (e.g. visitors who will never log in). */
  onSkip?: () => void;
};

/** Enrollment voice step (PROJECT_SPEC §8 screen 4): 3 different phrases with a waveform. */
export function VoiceCaptureStep(props: Props) {
  // Phrases are random, so render only on the client to avoid a hydration mismatch.
  const isClient = useIsClient();
  if (!isClient) return <Skeleton className="h-80 max-w-2xl rounded-xl" />;
  return <VoiceCaptureStepInner {...props} />;
}

function VoiceCaptureStepInner({ onBack, onComplete, onSkip }: Props) {
  const required = recognitionConfig.samples.voice;
  const sound = useSoundFeedback();
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [phrase, setPhrase] = useState(generatePhrase);
  const done = samples.length >= required;

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-1">
        <h3 className="text-base font-medium">
          Record {required} phrases{" "}
          <span className="font-mono text-muted-foreground">
            {Math.min(samples.length, required)}/{required}
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Speak in your normal voice, about an arm&apos;s length from the mic, somewhere quiet.
          Audio is analysed on this device; only the voice embedding is saved.
          {!isTranscriptionSupported()
            ? " This browser can't transcribe speech, so the words aren't checked."
            : null}
        </p>
      </div>

      {!done ? (
        <VoiceCapture
          key={phrase.text}
          phrase={phrase}
          onRefreshPhrase={() => setPhrase(generatePhrase())}
          recordLabel={`Record phrase ${samples.length + 1}`}
          onSample={(sample) => {
            sound.play(samples.length + 1 >= required ? "success" : "step");
            setSamples((prev) => [...prev, sample]);
            setPhrase(generatePhrase());
          }}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-success/40 p-3 text-sm text-success-foreground">
          <CircleCheck className="size-4" aria-hidden /> All {required} phrases recorded.
        </p>
      )}

      {samples.length > 0 ? (
        <ul className="grid gap-2" aria-label="Recorded phrases">
          {samples.map((s, i) => {
            const heardOk = phrasePassed(s.phraseScore);
            return (
              <motion.li
                key={s.phrase.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                {heardOk ? (
                  <CircleCheck className="size-4 text-success-foreground" aria-hidden />
                ) : (
                  <CircleAlert className="size-4 text-warning-foreground" aria-hidden />
                )}
                <span className="flex-1 truncate">&ldquo;{s.phrase.text}&rdquo;</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {s.speechSeconds.toFixed(1)}s
                  {s.phraseScore !== null ? ` · heard ${Math.round(s.phraseScore * 100)}%` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove phrase ${i + 1}`}
                  onClick={() => setSamples((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </motion.li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {onSkip ? (
          <Button variant="outline" onClick={onSkip}>
            <SkipForward aria-hidden /> Skip voice
          </Button>
        ) : null}
        <Button disabled={!done} onClick={() => onComplete(samples.slice(0, required))}>
          Review <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
