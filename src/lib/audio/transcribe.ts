/**
 * Thin wrapper around the Web Speech API (Chrome/Edge/Safari) used to check that the
 * challenge phrase was actually spoken. Where it's missing, callers fall back to
 * speaker verification + liveness only (PROJECT_SPEC §7.3).
 */

type RecognitionAlternative = { transcript: string };
type RecognitionResultList = ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal: boolean }>;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: RecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isTranscriptionSupported() {
  return getConstructor() !== null;
}

export type Transcriber = {
  /** Stops listening and resolves with the transcript, or null if recognition failed. */
  stop: () => Promise<string | null>;
  abort: () => void;
};

/** Starts listening immediately. Returns null when the browser has no speech recognition. */
export function startTranscriber(): Transcriber | null {
  const Recognition = getConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  const lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
  recognition.lang = lang.toLowerCase().startsWith("en") ? lang : "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let transcript = "";
  let failed = false;
  let resolveEnd: () => void;
  const ended = new Promise<void>((resolve) => (resolveEnd = resolve));

  recognition.onresult = (event) => {
    transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ");
  };
  recognition.onerror = (event) => {
    // "no-speech" just means an empty transcript; anything else means we can't judge.
    if (event.error !== "no-speech") failed = true;
  };
  recognition.onend = () => resolveEnd();

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: async () => {
      recognition.stop();
      // Some browsers never fire `end` after an error; don't wait forever.
      await Promise.race([ended, new Promise((resolve) => setTimeout(resolve, 2500))]);
      return failed ? null : transcript.trim();
    },
    abort: () => recognition.abort(),
  };
}
