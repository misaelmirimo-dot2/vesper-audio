// Deterministic WAV synthesizer for development/fallback preview mode when JAMENDO_CLIENT_ID is absent.
// Generates valid PCM 16-bit WAV audio unique to each track ID so playback, seeking,
// download progress streaming, and Cache Storage offline playback all work reliably.

const CHORD_PROGRESSIONS: number[][] = [
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G6
  [164.81, 196.0, 246.94, 329.63], // Em7
  [146.83, 220.0, 261.63, 349.23], // Dm9
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
];

export function generateTrackWavBuffer(seedStr: string, durationSec = 24): Buffer {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const clampedDuration = Math.min(Math.max(durationSec, 12), 32);
  const totalSamples = sampleRate * clampedDuration;
  const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const chordStart = hash % CHORD_PROGRESSIONS.length;
  const tempoBpm = 72 + (hash % 44);
  const beatSeconds = 60 / tempoBpm;
  const transpose = 0.85 + ((hash % 7) * 0.05);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIdx = Math.floor(t / (beatSeconds * 4));
    const chord = CHORD_PROGRESSIONS[(chordStart + barIdx) % CHORD_PROGRESSIONS.length];

    // Smooth fade in/out + warm pad envelope
    const fadeIn = Math.min(1, t / 0.8);
    const fadeOut = Math.min(1, (clampedDuration - t) / 1.2);
    const beatPhase = (t % beatSeconds) / beatSeconds;
    const pulse = 0.55 + 0.45 * Math.exp(-beatPhase * 3.5);

    let sample = 0;
    for (let v = 0; v < chord.length; v++) {
      const freq = chord[v] * transpose;
      const detune = 1 + (v - 1.5) * 0.0018;
      sample += Math.sin(2 * Math.PI * freq * detune * t) * (v === 0 ? 0.34 : 0.2);
    }

    // Gentle arpeggio pluck every half beat
    const stepIdx = Math.floor(t / (beatSeconds / 2)) % chord.length;
    const subPhase = (t % (beatSeconds / 2)) / (beatSeconds / 2);
    const arpEnv = Math.exp(-subPhase * 5.0);
    sample += Math.sin(2 * Math.PI * chord[stepIdx] * 2 * transpose * t) * 0.14 * arpEnv;

    const value = Math.max(-0.92, Math.min(0.92, sample * fadeIn * fadeOut * pulse * 0.45));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  return buffer;
}
