/**
 * Audio Mixer & Ducking Engine.
 * Mixes narration audio with optional background music using ffmpeg,
 * applying audio ducking, fade-in/out, and providing safe voice-only fallback.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import type { AudioMixPlan } from "../types";
import type { SoundEffectCue } from "../post-production/post-production-types";
import { mixWithSpeechAwareDucking } from "./ducking-engine";
import { buildSfxTrack } from "./sfx-track-builder";

export interface AudioMixResult {
  mixedAudioPath: string;
  musicApplied: boolean;
  duckingEventsCount?: number;
  sfxCuesCount?: number;
}

export function buildDuckingFilter(volume = 0.20): string {
  const musicVol = Math.max(0.02, Math.min(0.5, volume));
  return `[1:a]volume=${musicVol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[out]`;
}

export async function mixAudioTracks(
  plan: AudioMixPlan,
  outputDir: string
): Promise<AudioMixResult> {
  const finalMixedPath = path.join(outputDir, "master_audio.wav");

  const defaultBgmPath = path.resolve(
    process.cwd(),
    "assets",
    "audio",
    "music",
    "cyber_ambient_pulse.wav"
  );
  const resolvedBgm =
    plan.background_music_path && fs.existsSync(plan.background_music_path)
      ? plan.background_music_path
      : fs.existsSync(defaultBgmPath)
      ? defaultBgmPath
      : undefined;

async function layerSfxIntoMaster(
  baseAudioPath: string,
  sfxCues: SoundEffectCue[],
  outputDir: string
): Promise<number> {
  const sfxTrackPath = path.join(outputDir, "sfx_track.wav");
  const stat = fs.statSync(baseAudioPath);
  const durSec = Math.max(1, (stat.size - 44) / 192000);

  const sfxBuild = buildSfxTrack(sfxCues, durSec, sfxTrackPath);
  if (!sfxBuild.success || !fs.existsSync(sfxTrackPath)) {
    return 0;
  }

  const sfxMixedPath = path.join(outputDir, "master_with_sfx.wav");
  await new Promise<void>((resolve) => {
    const proc = spawn("ffmpeg", [
      "-y",
      "-i",
      baseAudioPath,
      "-i",
      sfxTrackPath,
      "-filter_complex",
      "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.92[out]",
      "-map",
      "[out]",
      sfxMixedPath,
    ]);
    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(sfxMixedPath)) {
        fs.copyFileSync(sfxMixedPath, baseAudioPath);
        try { fs.unlinkSync(sfxMixedPath); } catch {}
        console.log(`[AudioMixer] ✓ Layered ${sfxBuild.cuesPlaced} sound effects into master track.`);
        resolve();
      } else {
        console.warn(`[AudioMixer] Failed to layer SFX track via ffmpeg (code ${code}), continuing without SFX.`);
        resolve();
      }
    });
    proc.on("error", (err) => {
      console.warn(`[AudioMixer] FFmpeg spawn error for SFX: ${err.message}`);
      resolve();
    });
  });

  return sfxBuild.cuesPlaced;
}

  // 1. Voice-only fallback
  if (plan.voice_only || !resolvedBgm) {
    if (fs.existsSync(plan.narration_audio_path)) {
      fs.copyFileSync(plan.narration_audio_path, finalMixedPath);
      let sfxCount = 0;
      if (plan.sfx_cues && plan.sfx_cues.length > 0) {
        sfxCount = await layerSfxIntoMaster(finalMixedPath, plan.sfx_cues, outputDir);
      }
      return {
        mixedAudioPath: finalMixedPath,
        musicApplied: false,
        sfxCuesCount: sfxCount,
      };
    } else {
      throw new Error(`Narration audio not found at: ${plan.narration_audio_path}`);
    }
  }

  // 2. Speech-aware background music ducking
  try {
    const duckRes = await mixWithSpeechAwareDucking(
      plan.narration_audio_path,
      resolvedBgm,
      finalMixedPath,
      {
        baseMusicVolume: plan.music_volume ?? 0.20,
        duckedMusicVolume: 0.035,
        attackMs: 60,
        releaseMs: 500,
        threshold: 0.032,
      }
    );

    let sfxCount = 0;
    if (plan.sfx_cues && plan.sfx_cues.length > 0) {
      sfxCount = await layerSfxIntoMaster(finalMixedPath, plan.sfx_cues, outputDir);
    }

    return {
      mixedAudioPath: finalMixedPath,
      musicApplied: true,
      duckingEventsCount: duckRes.duckingEventsCount,
      sfxCuesCount: sfxCount,
    };
  } catch (err) {
    console.warn(
      `[AudioMixer] Speech-aware ducking mix failed (${(err as Error).message}), falling back to voice-only.`
    );
    fs.copyFileSync(plan.narration_audio_path, finalMixedPath);
    let sfxCount = 0;
    if (plan.sfx_cues && plan.sfx_cues.length > 0) {
      sfxCount = await layerSfxIntoMaster(finalMixedPath, plan.sfx_cues, outputDir);
    }
    return {
      mixedAudioPath: finalMixedPath,
      musicApplied: false,
      sfxCuesCount: sfxCount,
    };
  }
}
