/**
 * Audio conversion for the voice engine (PROJECT_SPEC §7.3): any recording → mono
 * 16 kHz Float32Array.
 */
import { recognitionConfig } from "@/config/recognition";

/** Averages channels into one. All channels must have the same length. */
export function downmix(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0]!;
  const out = new Float32Array(channels[0]!.length);
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++) out[i]! += channel[i]! / channels.length;
  }
  return out;
}

/**
 * Linear-interpolation resampler. Used where OfflineAudioContext isn't available;
 * good enough for speech embeddings (the model only looks at < 8 kHz content).
 */
export function resampleLinear(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, input.length - 1);
    const frac = pos - left;
    out[i] = input[left]! * (1 - frac) + input[right]! * frac;
  }
  return out;
}

/** Decodes a recorded blob (webm/ogg/mp4) and returns mono 16 kHz samples. */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const targetRate = recognitionConfig.voice.sampleRate;
  const bytes = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    if (typeof OfflineAudioContext !== "undefined") {
      // The browser's resampler includes proper low-pass filtering.
      const length = Math.ceil(decoded.duration * targetRate);
      const offline = new OfflineAudioContext(1, Math.max(1, length), targetRate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start();
      const rendered = await offline.startRendering();
      return rendered.getChannelData(0).slice();
    }
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
      decoded.getChannelData(i),
    );
    return resampleLinear(downmix(channels), decoded.sampleRate, targetRate);
  } finally {
    void context.close();
  }
}
