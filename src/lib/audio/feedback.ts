/**
 * Short synthesized UI sounds (no audio files). Soft tones at low volume; callers
 * decide whether sound is enabled (see useSoundFeedback).
 */
export type FeedbackSound =
  | "step"
  | "scan"
  | "success"
  | "error"
  | "capture"
  | "recognized"
  | "unknown"
  | "record-start"
  | "record-stop"
  | "toggle";

type Note = { freq: number; at: number; length: number; type?: OscillatorType; volume?: number };

const SEQUENCES: Record<FeedbackSound, Note[]> = {
  step: [{ freq: 880, at: 0, length: 0.09 }],
  scan: [
    { freq: 520, at: 0, length: 0.07 },
    { freq: 780, at: 0.09, length: 0.07 },
  ],
  success: [
    { freq: 660, at: 0, length: 0.1 },
    { freq: 880, at: 0.1, length: 0.1 },
    { freq: 1320, at: 0.2, length: 0.18 },
  ],
  error: [
    { freq: 330, at: 0, length: 0.14 },
    { freq: 247, at: 0.15, length: 0.2 },
  ],
  // Camera-shutter feel: a bright tick followed by a lower one.
  capture: [
    { freq: 2200, at: 0, length: 0.03, type: "square", volume: 0.025 },
    { freq: 1200, at: 0.05, length: 0.05, type: "triangle" },
  ],
  recognized: [
    { freq: 784, at: 0, length: 0.12 },
    { freq: 1175, at: 0.11, length: 0.2 },
  ],
  unknown: [{ freq: 294, at: 0, length: 0.16, type: "triangle" }],
  "record-start": [{ freq: 988, at: 0, length: 0.08 }],
  "record-stop": [{ freq: 659, at: 0, length: 0.08 }],
  toggle: [{ freq: 1400, at: 0, length: 0.04, type: "triangle", volume: 0.04 }],
};

let context: AudioContext | null = null;

export function playFeedback(sound: FeedbackSound) {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    for (const note of SEQUENCES[sound]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = note.type ?? "sine";
      osc.frequency.value = note.freq;
      // Quick fade in/out avoids clicks.
      gain.gain.setValueAtTime(0, now + note.at);
      gain.gain.linearRampToValueAtTime(note.volume ?? 0.06, now + note.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.length);
      osc.connect(gain).connect(context.destination);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.length + 0.02);
    }
  } catch {
    // Sound is decoration only.
  }
}
