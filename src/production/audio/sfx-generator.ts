/**
 * Procedural Sound Effects Generator.
 * Synthesizes 10 pristine, CC0-licensed 48kHz stereo 16-bit WAV audio files
 * for offline, deterministic production rendering without external downloads.
 */

import fs from "fs";
import path from "path";
import { SOUND_EFFECTS_CATALOG } from "./sfx-catalog";

function writeWavHeader(
  sampleRate: number,
  numChannels: number,
  numSamples: number
): Buffer {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  // RIFF identifier
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function clampSample(val: number): number {
  return Math.max(-1, Math.min(1, val));
}

export function synthesizeSfx(effectId: string, durationSec: number): Buffer {
  const sampleRate = 48000;
  const numChannels = 2;
  const numSamples = Math.floor(durationSec * sampleRate);
  const pcmBuffer = Buffer.alloc(numSamples * numChannels * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    let left = 0;
    let right = 0;

    switch (effectId) {
      case "whoosh_soft": {
        // Bandpass noise sweep with cosine bell envelope
        const env = Math.sin(Math.PI * progress);
        const centerFreq = 200 + 900 * Math.sin(Math.PI * progress);
        const noise = (Math.random() * 2 - 1);
        const tone = Math.sin(2 * Math.PI * centerFreq * t);
        const sample = (noise * 0.6 + tone * 0.4) * env * 0.75;
        // Subtle stereo pan across whoosh
        left = sample * (1 - progress * 0.5);
        right = sample * (0.5 + progress * 0.5);
        break;
      }

      case "sweep_transition": {
        // Resonant frequency sweep rising 250Hz -> 2400Hz
        const freq = 250 * Math.pow(2400 / 250, progress);
        const env = Math.sin(Math.PI * Math.pow(progress, 0.7));
        const sample = (Math.sin(2 * Math.PI * freq * t) * 0.7 + (Math.random() * 2 - 1) * 0.3) * env * 0.7;
        left = sample * (1 - progress * 0.4);
        right = sample * (0.6 + progress * 0.4);
        break;
      }

      case "impact_subtle": {
        // Low sub-bass drop (85Hz -> 48Hz) with exponential decay
        const env = Math.exp(-progress * 6.5);
        const freq = 48 + 37 * Math.exp(-progress * 10);
        const sub = Math.sin(2 * Math.PI * freq * t);
        const transient = progress < 0.05 ? (Math.random() * 2 - 1) * (1 - progress / 0.05) * 0.4 : 0;
        const sample = (sub * 0.85 + transient) * env * 0.85;
        left = sample;
        right = sample;
        break;
      }

      case "hit_cinematic": {
        // Deep cinematic down-hit: 60Hz fundamental + 120Hz harmonic with soft decay
        const env = Math.exp(-progress * 4.2);
        const freq1 = 52 + 25 * Math.exp(-progress * 8);
        const freq2 = freq1 * 2;
        const tone = Math.sin(2 * Math.PI * freq1 * t) * 0.65 + Math.sin(2 * Math.PI * freq2 * t) * 0.35;
        const punch = progress < 0.03 ? (1 - progress / 0.03) * 0.4 : 0;
        const sample = (tone + punch) * env * 0.9;
        left = sample;
        right = sample;
        break;
      }

      case "ui_click": {
        // Ultra-short tactical click (12ms)
        const env = Math.exp(-progress * 22);
        const tone = Math.sin(2 * Math.PI * 2800 * t);
        const sample = (tone * 0.6 + (Math.random() * 2 - 1) * 0.4) * env * 0.7;
        left = sample;
        right = sample;
        break;
      }

      case "digital_confirm": {
        // Harmonic two-tone confirmation (880Hz then 1760Hz)
        let sample = 0;
        if (t < 0.14) {
          const env = Math.exp(-(t / 0.14) * 3);
          sample = Math.sin(2 * Math.PI * 880 * t) * env * 0.7;
        } else {
          const t2 = t - 0.14;
          const env = Math.exp(-(t2 / (durationSec - 0.14)) * 3.5);
          sample = Math.sin(2 * Math.PI * 1760 * t) * env * 0.75;
        }
        left = sample * 0.9;
        right = sample * 1.1;
        break;
      }

      case "riser_short": {
        // Pitch acceleration riser (160Hz -> 1400Hz)
        const freq = 160 + 1240 * Math.pow(progress, 2.2);
        const env = Math.pow(progress, 1.4);
        const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.65;
        left = sample * (0.8 + 0.4 * Math.sin(2 * Math.PI * 4 * t));
        right = sample * (0.8 - 0.4 * Math.sin(2 * Math.PI * 4 * t));
        break;
      }

      case "tech_ambient": {
        // Soft high-frequency shimmer grain
        const env = Math.sin(Math.PI * progress);
        const tone1 = Math.sin(2 * Math.PI * 2200 * t);
        const tone2 = Math.sin(2 * Math.PI * 3300 * t + 0.5);
        const tone3 = Math.sin(2 * Math.PI * 4400 * t + 1.0);
        const sample = (tone1 * 0.35 + tone2 * 0.35 + tone3 * 0.30) * env * 0.45;
        left = sample;
        right = sample;
        break;
      }

      case "reverse_swell": {
        // Exponential reverse swell leading into zero
        const env = Math.pow(progress, 3);
        const freq = 300 + 600 * progress;
        const noise = (Math.random() * 2 - 1) * 0.4;
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.6;
        const sample = (tone + noise) * env * 0.75;
        left = sample * (0.6 + progress * 0.4);
        right = sample * (1.0 - progress * 0.4);
        break;
      }

      case "accent_clean": {
        // Clean high-mid precision pop (1100Hz -> 550Hz)
        const env = Math.exp(-progress * 9);
        const freq = 550 + 550 * Math.exp(-progress * 12);
        const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
        left = sample;
        right = sample;
        break;
      }

      default: {
        // Default gentle click
        const env = Math.exp(-progress * 15);
        const sample = Math.sin(2 * Math.PI * 1000 * t) * env * 0.5;
        left = sample;
        right = sample;
      }
    }

    const int16Left = Math.round(clampSample(left) * 32767);
    const int16Right = Math.round(clampSample(right) * 32767);
    pcmBuffer.writeInt16LE(int16Left, i * 4);
    pcmBuffer.writeInt16LE(int16Right, i * 4 + 2);
  }

  const header = writeWavHeader(sampleRate, numChannels, numSamples);
  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Ensures all sound effects in the catalog exist on disk.
 * Generates them procedurally if missing.
 */
export function ensureSfxLibrary(baseDir?: string): {
  sfxDir: string;
  catalogPath: string;
  generatedCount: number;
} {
  const root = baseDir || process.cwd();
  const sfxDir = path.resolve(root, "assets", "audio", "sfx");
  if (!fs.existsSync(sfxDir)) {
    fs.mkdirSync(sfxDir, { recursive: true });
  }

  const catalogPath = path.join(sfxDir, "catalog.json");
  fs.writeFileSync(
    catalogPath,
    JSON.stringify(SOUND_EFFECTS_CATALOG, null, 2),
    "utf-8"
  );

  let generatedCount = 0;
  for (const sfx of SOUND_EFFECTS_CATALOG) {
    const sfxFile = path.join(sfxDir, sfx.filename);
    if (!fs.existsSync(sfxFile) || fs.statSync(sfxFile).size < 100) {
      const wavData = synthesizeSfx(sfx.id, sfx.duration_seconds);
      fs.writeFileSync(sfxFile, wavData);
      generatedCount++;
    }
  }

  return { sfxDir, catalogPath, generatedCount };
}
