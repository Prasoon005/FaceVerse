/**
 * Challenge phrases (PROJECT_SPEC §7.3): 3 random words from a curated list + 2 digits,
 * and a fuzzy check that a transcript actually contains them.
 */
import { recognitionConfig } from "@/config/recognition";

/** Short, common words that speech recognisers get right and that don't sound alike. */
export const PHRASE_WORDS = [
  "apple", "basket", "camera", "dolphin", "engine", "forest", "garden", "hammer",
  "island", "jacket", "kettle", "lemon", "mirror", "number", "orange", "pencil",
  "rocket", "silver", "tiger", "window", "yellow", "bridge", "candle", "desert",
  "planet", "river", "summer", "winter", "violin", "rabbit", "pepper", "castle",
  "button", "carpet", "doctor", "falcon", "guitar", "harbor", "market", "monkey",
  "pocket", "purple", "school", "spider", "thunder", "tomato", "valley", "wallet",
] as const; // prettier-ignore

const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", won: "1", two: "2", to: "2", too: "2", three: "3",
  four: "4", for: "4", five: "5", six: "6", seven: "7", eight: "8", ate: "8", nine: "9",
}; // prettier-ignore

export type ChallengePhrase = { words: string[]; digits: string[]; text: string };

export function generatePhrase(random: () => number = Math.random): ChallengePhrase {
  const pool = [...PHRASE_WORDS];
  const words: string[] = [];
  for (let i = 0; i < 3; i++) {
    const index = Math.floor(random() * pool.length);
    words.push(pool.splice(index, 1)[0]!);
  }
  const digits = [0, 1].map(() => String(Math.floor(random() * 10)));
  return { words, digits, text: [...words, ...digits].join(" ") };
}

/** Lower-cases, strips punctuation, maps number words to digits and splits "47" into "4 7". */
export function normalizeTranscript(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (DIGIT_WORDS[token]) return [DIGIT_WORDS[token]];
      if (/^\d+$/.test(token)) return token.split("");
      return [token];
    });
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return dp[b.length]!;
}

function tokensMatch(expected: string, heard: string) {
  if (expected === heard) return true;
  // Allow one slip (plurals, "harbour") on longer words; digits must be exact.
  return expected.length >= 5 && editDistance(expected, heard) <= 1;
}

/** Share (0..1) of the phrase's tokens found in the transcript; each heard token counts once. */
export function phraseMatchScore(phrase: ChallengePhrase, transcript: string): number {
  const expected = [...phrase.words, ...phrase.digits];
  const heard = normalizeTranscript(transcript);
  let matched = 0;
  for (const token of expected) {
    const index = heard.findIndex((h) => tokensMatch(token, h));
    if (index !== -1) {
      matched++;
      heard.splice(index, 1);
    }
  }
  return matched / expected.length;
}

/**
 * Phrase score for a recording that already passed the speech check (VAD found real speech).
 * A missing or empty transcript then means speech recognition didn't work on this device
 * (common on phones, where the recorder already holds the mic), not that the user said
 * nothing, so the words can't be judged: null, like a browser without speech recognition.
 */
export function scoreTranscript(phrase: ChallengePhrase, transcript: string | null): number | null {
  if (transcript === null || normalizeTranscript(transcript).length === 0) return null;
  return phraseMatchScore(phrase, transcript);
}

export function phrasePassed(score: number | null): boolean {
  return score === null || score >= recognitionConfig.voice.phraseMatchRatio;
}
