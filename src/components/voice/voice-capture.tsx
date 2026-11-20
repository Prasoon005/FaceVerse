"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";

import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { useVoiceEngine } from "@/hooks/use-voice-engine";
import type { ChallengePhrase as Phrase } from "@/lib/audio/phrase";
import { processRecording, RecordingError, type VoiceSample } from "@/lib/audio/process-recording";

import { ChallengePhrase } from "./challenge-phrase";
import { MicRecorder } from "./mic-recorder";
import { VoiceModelStatus } from "./voice-model-status";
import { VoiceScan } from "./voice-scan";

/**
 * One voice sample: shows the phrase, records it, then trims silence and computes the
 * speaker embedding on-device. Used by the enrollment wizard and biometric login.
 */
export function VoiceCapture({
  phrase,
  onRefreshPhrase,
  onSample,
  transcribe = true,
  recordLabel,
}: {
  phrase: Phrase;
  onRefreshPhrase?: () => void;
  onSample: (sample: VoiceSample) => void;
  transcribe?: boolean;
  recordLabel?: string;
}) {
  const engine = useVoiceEngine();
  const sound = useSoundFeedback();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <ChallengePhrase phrase={phrase} onRefresh={onRefreshPhrase} disabled={processing} />
      <VoiceModelStatus
        status={engine.status}
        stage={engine.stage}
        progress={engine.progress}
        error={engine.error}
        onRetry={engine.retry}
      />
      <MicRecorder
        transcribe={transcribe}
        disabled={!engine.ready || processing}
        label={recordLabel}
        onRecorded={async (recording) => {
          sound.play("scan");
          setProcessing(true);
          setError(null);
          try {
            onSample(await processRecording(recording, phrase));
          } catch (err) {
            sound.play("error");
            setError(
              err instanceof RecordingError
                ? err.message
                : "Couldn't analyse the recording. Please try again.",
            );
          } finally {
            setProcessing(false);
          }
        }}
      />
      <div aria-live="polite">
        {processing ? (
          <VoiceScan />
        ) : error ? (
          <p className="flex items-start gap-2 text-sm text-danger-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
