/** Recording → speaker embedding pipeline shared by enrollment and biometric login. */
import { recognitionConfig } from "@/config/recognition";
import { embedVoice } from "@/lib/ai/voice";

import { type ChallengePhrase, scoreTranscript } from "./phrase";
import { decodeToMono16k } from "./resample";
import { trimSilence } from "./vad";

export type VoiceSample = {
  embedding: Float32Array;
  phrase: ChallengePhrase;
  /** Share of the phrase heard by speech recognition; null when it couldn't run. */
  phraseScore: number | null;
  speechSeconds: number;
};

export class RecordingError extends Error {}

export async function processRecording(
  recording: { blob: Blob; transcript: string | null },
  phrase: ChallengePhrase,
): Promise<VoiceSample> {
  const { sampleRate, minSpeechSeconds } = recognitionConfig.voice;
  let samples: Float32Array;
  try {
    samples = await decodeToMono16k(recording.blob);
  } catch {
    throw new RecordingError("Couldn't read the recording. Please try again.");
  }
  const { audio, speechSeconds } = trimSilence(samples, sampleRate);
  if (speechSeconds < minSpeechSeconds) {
    throw new RecordingError(
      `Heard only ${speechSeconds.toFixed(1)}s of speech. Speak the whole phrase clearly (at least ${minSpeechSeconds}s).`,
    );
  }
  const embedding = await embedVoice(audio);
  const phraseScore = scoreTranscript(phrase, recording.transcript);
  return { embedding, phrase, phraseScore, speechSeconds };
}
