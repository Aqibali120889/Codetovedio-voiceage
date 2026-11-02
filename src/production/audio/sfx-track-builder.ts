/**
 * Sound Effects Track Builder.
 *
 * Compiles discrete frame-accurate sound cues into a unified 48kHz stereo WAV track
 * with sample-accurate placement and soft saturation to prevent clipping.
 */

import fs from "fs";
import path from "path";
import type { SoundEffectCue } from "../post-production/post-production-types";
import { ensureSfxLibrary } from "./sfx-generator";

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

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export function buildSfxTrack(
  soundCues: SoundEffectCue[],
  totalDurationSeconds: number,
  outputPath: string
): { success: boolean; sfxPath?: string; cuesPlaced: number } {
  if (!soundCues || soundCues.length === 0) {
    return { success: false, cuesPlaced: 0 };
  }

  const { sfxDir } = ensureSfxLibrary();
  const sampleRate = 48000;
  const numChannels = 2;
  const totalSamples = Math.ceil(totalDurationSeconds * sampleRate);

  // Allocate float arrays for mixing with headroom
  const leftMix = new Float32Array(totalSamples);
  const rightMix = new Float32Array(totalSamples);

  let cuesPlaced = 0;

  for (const cue of soundCues) {
    const sfxFile = path.join(sfxDir, `${cue.soundEffectId}.wav`);
    if (!fs.existsSync(sfxFile)) continue;

    try {
      const fileBuf = fs.readFileSync(sfxFile);
      // Skip 44-byte WAV header
      const dataOffset = 44;
      const numSfxSamples = Math.floor((fileBuf.length - dataOffset) / 4);

      const startSample = Math.floor(cue.timestamp_seconds * sampleRate);
      const volume = Math.max(0.02, Math.min(0.5, cue.volume || 0.20));

      for (let i = 0; i < numSfxSamples; i++) {
        const destIdx = startSample + i;
        if (destIdx >= totalSamples) break;

        const byteIdx = dataOffset + i * 4;
        const lSample = fileBuf.readInt16LE(byteIdx) / 32768;
        const rSample = fileBuf.readInt16LE(byteIdx + 2) / 32768;

        leftMix[destIdx] += lSample * volume;
        rightMix[destIdx] += rSample * volume;
      }

      cuesPlaced++;
    } catch (err) {
      console.warn(`[SfxTrackBuilder] Failed to place cue ${cue.soundEffectId}: ${(err as Error).message}`);
    }
  }

  if (cuesPlaced === 0) {
    return { success: false, cuesPlaced: 0 };
  }

  // Soft-saturate and write 16-bit PCM buffer
  const pcmBuffer = Buffer.alloc(totalSamples * numChannels * 2);
  for (let i = 0; i < totalSamples; i++) {
    // Soft clip tanh
    const l = Math.tanh(leftMix[i]);
    const r = Math.tanh(rightMix[i]);

    const int16Left = Math.round(Math.max(-1, Math.min(1, l)) * 32767);
    const int16Right = Math.round(Math.max(-1, Math.min(1, r)) * 32767);

    pcmBuffer.writeInt16LE(int16Left, i * 4);
    pcmBuffer.writeInt16LE(int16Right, i * 4 + 2);
  }

  const header = writeWavHeader(sampleRate, numChannels, totalSamples);
  fs.writeFileSync(outputPath, Buffer.concat([header, pcmBuffer]));

  return { success: true, sfxPath: outputPath, cuesPlaced };
}
