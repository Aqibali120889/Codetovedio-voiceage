/**
 * Narration Service.
 * Generates and measures TTS narration audio per scene using Gemini TTS & ffprobe.
 * Caches generated audio, measures accurate durations, and assembles the full track.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getConfig, checkCredentials } from "../../pipeline/config";
import { generateSpeech, getAudioMetadata } from "../../pipeline/geminiProvider";
import { concatenateSceneAudios } from "../../pipeline/audioMuxer";
import type { VideoBlueprint } from "../../video-engine/types";
import type { AudioMetadata } from "../../pipeline/types";

export interface NarrationResult {
  audioMap: Map<string, AudioMetadata>;
  fullAudioPath: string;
  totalDurationSeconds: number;
}

export async function generateNarrationForBlueprint(
  blueprint: VideoBlueprint,
  projectDir: string,
  options: { voice?: string; forceMock?: boolean } = {}
): Promise<NarrationResult> {
  const narrationDir = path.join(projectDir, "narration");
  if (!fs.existsSync(narrationDir)) {
    fs.mkdirSync(narrationDir, { recursive: true });
  }

  const cacheDir = path.resolve(process.cwd(), "data", "cache", "tts");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      // Non-fatal
    }
  }

  const audioMap = new Map<string, AudioMetadata>();
  const credError = checkCredentials();
  const isMock = options.forceMock || !!credError;
  const config = getConfig();
  const voice = options.voice || config.ttsVoice;

  for (const scene of blueprint.scenes) {
    const audioPath = path.join(narrationDir, `${scene.id}.wav`);

    // 1. Content-hash disk cache check
    const hashInput = `${scene.narration}::${voice}::${config.ttsModel}::${config.ttsStyle}`;
    const contentHash = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);
    const globalCachePath = path.join(cacheDir, `${contentHash}.wav`);

    if (fs.existsSync(globalCachePath) && fs.statSync(globalCachePath).size > 100) {
      try {
        fs.copyFileSync(globalCachePath, audioPath);
        const meta = await getAudioMetadata(audioPath, config.ttsModel);
        audioMap.set(scene.id, meta);
        scene.audio_path = audioPath;
        scene.duration_hint_seconds = meta.durationSeconds;
        console.log(`[NarrationService] Using content-hash cached audio for ${scene.id} (${meta.durationSeconds.toFixed(2)}s)`);
        continue;
      } catch {
        // Corrupted cache, regenerate
      }
    }

    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 100) {
      try {
        const meta = await getAudioMetadata(audioPath, config.ttsModel);
        audioMap.set(scene.id, meta);
        scene.audio_path = audioPath;
        scene.duration_hint_seconds = meta.durationSeconds;
        console.log(`[NarrationService] Using project cached audio for ${scene.id} (${meta.durationSeconds.toFixed(2)}s)`);
        continue;
      } catch {
        // Corrupted cache, regenerate
      }
    }

    if (isMock) {
      // Offline / Test mock generator: produce valid clean speech audio
      const wordCount = scene.narration.split(/\s+/).filter(Boolean).length;
      const durationSeconds = Math.max(2.5, wordCount / 2.6);
      generateSpeechOrCleanAudio(scene.narration, audioPath, durationSeconds);

      let meta: AudioMetadata;
      try {
        meta = await getAudioMetadata(audioPath, "mock-tts");
      } catch {
        meta = {
          path: audioPath,
          durationSeconds,
          format: "wav",
          sampleRate: 24000,
          channels: 1,
          sizeBytes: fs.statSync(audioPath).size,
          model: "mock-tts",
          generatedAt: new Date().toISOString(),
        };
      }
      audioMap.set(scene.id, meta);
      scene.audio_path = audioPath;
      scene.duration_hint_seconds = meta.durationSeconds;
      console.log(`[NarrationService] Generated clean speech audio for ${scene.id} (${meta.durationSeconds.toFixed(2)}s)`);
    } else {
      // Live Gemini TTS
      try {
        const meta = await generateSpeech(scene.narration, audioPath, config, {
          voice: options.voice || config.ttsVoice,
        });
        audioMap.set(scene.id, meta);
        scene.audio_path = audioPath;
        scene.duration_hint_seconds = meta.durationSeconds;
        try {
          fs.copyFileSync(audioPath, globalCachePath);
        } catch {
          // Non-fatal
        }
        console.log(`[NarrationService] Generated live TTS for ${scene.id} (${meta.durationSeconds.toFixed(2)}s)`);
      } catch (err) {
        console.warn(`[NarrationService] Live Gemini TTS unavailable for ${scene.id} (${(err as Error).message}). Using Windows speech synthesis.`);
        const wordCount = scene.narration.split(/\s+/).filter(Boolean).length;
        const durationSeconds = Math.max(2.5, wordCount / 2.6);
        generateSpeechOrCleanAudio(scene.narration, audioPath, durationSeconds);
        const meta = await getAudioMetadata(audioPath, "speech-synth-fallback");
        audioMap.set(scene.id, meta);
        scene.audio_path = audioPath;
        scene.duration_hint_seconds = meta.durationSeconds;
      }
    }
  }

  // Concatenate into unified narration track
  const sceneIds = blueprint.scenes.map((s) => s.id);
  const fullAudioPath = await concatenateSceneAudios(narrationDir, sceneIds);

  // Mirror audio files to public/projects/<projectId>/narration/ for Remotion staticFile availability
  const projectId = path.basename(projectDir);
  const publicNarrationDir = path.resolve(process.cwd(), "public", "projects", projectId, "narration");
  try {
    fs.mkdirSync(publicNarrationDir, { recursive: true });
    for (const [sceneId, meta] of audioMap.entries()) {
      if (fs.existsSync(meta.path)) {
        fs.copyFileSync(meta.path, path.join(publicNarrationDir, `${sceneId}.wav`));
      }
    }
    if (fs.existsSync(fullAudioPath)) {
      fs.copyFileSync(fullAudioPath, path.join(publicNarrationDir, "master_audio.wav"));
    }
  } catch (err) {
    console.warn(`[NarrationService] Warning: Could not mirror audio to public dir: ${(err as Error).message}`);
  }

  let totalDurationSeconds = 0;
  for (const meta of audioMap.values()) {
    totalDurationSeconds += meta.durationSeconds;
  }

  return {
    audioMap,
    fullAudioPath,
    totalDurationSeconds,
  };
}

/**
 * Synthesizes clean spoken voice audio using Windows SAPI SpeechSynthesizer if available,
 * or generates a clean, speech-cadenced broadband audio file without any pure sine beeps.
 */
export function generateSpeechOrCleanAudio(
  text: string,
  outputPath: string,
  fallbackDurationSeconds?: number
): void {
  // 1. Try Windows SAPI PowerShell SpeechSynthesizer first on Windows
  if (process.platform === "win32") {
    try {
      const sanitized = text.replace(/["`$\\]/g, " ");
      const tempScript = path.join(
        path.dirname(outputPath),
        `sapi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ps1`
      );
      const psContent = [
        "Add-Type -AssemblyName System.Speech",
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
        `$synth.SetOutputToWaveFile("${outputPath.replace(/\\/g, "/")}")`,
        `$synth.Speak("${sanitized}")`,
        "$synth.Dispose()",
      ].join("\n");

      fs.writeFileSync(tempScript, psContent, "utf8");
      try {
        const { execFileSync } = require("child_process");
        execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScript], {
          timeout: 12000,
          stdio: "ignore",
        });
      } finally {
        if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
      }

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        return;
      }
    } catch {
      // Fall through to clean broadband cadence generator
    }
  }

  // 2. Generate clean, low-level speech-cadenced audio (NEVER a pure sine wave tone)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const duration = fallbackDurationSeconds || Math.max(2.5, wordCount / 2.6);
  createCleanSpeechMockWav(outputPath, duration);
}

/**
 * Creates clean, natural broadband speech-cadenced audio (NEVER a pure sine wave or beep).
 * Uses shaped formant pulses and syllabic amplitude modulation (~3.5Hz) to provide
 * realistic speech energy envelopes for VAD and RMS ducking analysis.
 */
export function createCleanSpeechMockWav(filePath: string, durationSeconds: number): void {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const byteRate = sampleRate * 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono (1 channel)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate broadband speech cadence with syllabic rhythm (no pure sine tones)
  let noiseState = 0x12345678;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Syllabic modulation at ~3.5 Hz with sentence pauses
    const syllabicRate = 3.5;
    const syllable = 0.5 + 0.5 * Math.sin(2 * Math.PI * syllabicRate * t);
    // Pause every 3.2 seconds for 0.4 seconds
    const sentencePos = t % 3.2;
    const isSpeaking = sentencePos < 2.6 ? 1 : Math.max(0, 1 - (sentencePos - 2.6) * 5);

    // Multi-harmonic vocal tract formants with pitch inflection ~110-140Hz
    const f0 = 125 + 15 * Math.sin(2 * Math.PI * 0.8 * t);
    const harmonic1 = Math.sin(2 * Math.PI * f0 * t) * 0.22;
    const harmonic2 = Math.sin(2 * Math.PI * f0 * 2 * t) * 0.12;
    const harmonic3 = Math.sin(2 * Math.PI * f0 * 3 * t) * 0.06;

    // Gentle breath noise
    noiseState = (noiseState * 1664525 + 1013904223) | 0;
    const breath = ((noiseState & 0xffff) / 32768.0 - 1.0) * 0.025;

    // Composite speech-like audio (RMS ~ -26dB, soft, natural cadence, zero beep)
    const speechSignal = (harmonic1 + harmonic2 + harmonic3 + breath) * syllable * isSpeaking * 0.18;
    const intSample = Math.floor(Math.max(-1, Math.min(1, speechSignal)) * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

/**
 * Backward compatibility alias: redirects to createCleanSpeechMockWav.
 */
export function createMockWav(filePath: string, durationSeconds: number): void {
  createCleanSpeechMockWav(filePath, durationSeconds);
}
