/**
 * Caption & Subtitle Generator.
 * Calculates frame-accurate subtitles based on actual measured scene audio durations.
 * Produces structured SubtitleSegments, burned-in display timings, and standalone SRT/VTT files.
 */

import fs from "fs";
import path from "path";
import type { VideoBlueprint } from "../../video-engine/types";
import type { AudioMetadata } from "../../pipeline/types";
import type { SubtitleSegment } from "../types";

export interface CaptionGenerationResult {
  segments: SubtitleSegment[];
  srtPath: string;
  vttPath: string;
  totalDurationSeconds: number;
}

export function generateCaptionsForBlueprint(
  blueprint: VideoBlueprint,
  audioMap: Map<string, AudioMetadata>,
  fps = 60,
  projectDir: string
): CaptionGenerationResult {
  const subtitlesDir = path.join(projectDir, "subtitles");
  if (!fs.existsSync(subtitlesDir)) {
    fs.mkdirSync(subtitlesDir, { recursive: true });
  }

  const segments: SubtitleSegment[] = [];
  let currentSecondOffset = 0;
  let segmentIndex = 1;

  for (const scene of blueprint.scenes) {
    const audioMeta = audioMap.get(scene.id);
    const sceneDuration = audioMeta?.durationSeconds ?? scene.duration_hint_seconds ?? 5;

    // Split scene narration into natural phrase chunks
    const sentences = splitIntoPhrases(scene.narration);
    if (sentences.length === 0) {
      currentSecondOffset += sceneDuration;
      continue;
    }

    // ── Word-count-proportional timing ────────────────────────────────────
    // Each phrase gets time proportional to its word count, so longer
    // sentences stay on screen longer. This better mirrors speech rate
    // than equal-time distribution.
    const wordCounts = sentences.map((s) => Math.max(1, s.trim().split(/\s+/).length));
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);

    let phraseStart = currentSecondOffset;

    for (let pIdx = 0; pIdx < sentences.length; pIdx++) {
      const phraseText = sentences[pIdx];
      // Duration is proportional to word count
      const phraseDuration = (wordCounts[pIdx] / totalWords) * sceneDuration;

      const startSec = phraseStart;
      // Hard-cap end time to the scene boundary so captions never run past audio
      const endSec = Math.min(
        phraseStart + phraseDuration,
        currentSecondOffset + sceneDuration - 0.05
      );

      // Clamp to non-negative frame numbers
      const startFrame = Math.max(0, Math.round(startSec * fps));
      const endFrame = Math.max(startFrame + 1, Math.round(endSec * fps));

      segments.push({
        index: segmentIndex++,
        start_seconds: parseFloat(startSec.toFixed(3)),
        end_seconds: parseFloat(endSec.toFixed(3)),
        start_frame: startFrame,
        end_frame: endFrame,
        text: phraseText,
        scene_id: scene.id,
      });

      phraseStart += phraseDuration;
    }

    currentSecondOffset += sceneDuration;
  }

  // Validate: ensure no segment's end_frame exceeds total composition duration
  const totalFrames = Math.round(currentSecondOffset * fps);
  for (const seg of segments) {
    if (seg.end_frame > totalFrames) {
      seg.end_frame = totalFrames;
      seg.end_seconds = currentSecondOffset;
    }
  }

  // Generate SRT
  const srtContent = buildSrtString(segments);
  const srtPath = path.join(subtitlesDir, "captions.srt");
  fs.writeFileSync(srtPath, srtContent, "utf-8");

  // Generate WebVTT
  const vttContent = buildVttString(segments);
  const vttPath = path.join(subtitlesDir, "captions.vtt");
  fs.writeFileSync(vttPath, vttContent, "utf-8");

  return {
    segments,
    srtPath,
    vttPath,
    totalDurationSeconds: currentSecondOffset,
  };
}

export function splitIntoPhrases(narration: string): string[] {
  const cleaned = narration.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  // Split on punctuation first
  const clauses = cleaned.split(/(?<=[.?!,;:])\s+/);
  const result: string[] = [];

  for (const clause of clauses) {
    const words = clause.split(/\s+/);
    if (words.length <= 10) {
      result.push(clause.trim());
    } else {
      // Split long clauses in half
      const mid = Math.ceil(words.length / 2);
      result.push(words.slice(0, mid).join(" "));
      result.push(words.slice(mid).join(" "));
    }
  }

  return result.filter(Boolean);
}

export function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function formatVttTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function buildSrtString(segments: SubtitleSegment[]): string {
  return segments
    .map(
      (s) =>
        `${s.index}\n${formatSrtTimestamp(s.start_seconds)} --> ${formatSrtTimestamp(s.end_seconds)}\n${s.text}\n`
    )
    .join("\n");
}

function buildVttString(segments: SubtitleSegment[]): string {
  return (
    "WEBVTT\n\n" +
    segments
      .map(
        (s) =>
          `${s.index}\n${formatVttTimestamp(s.start_seconds)} --> ${formatVttTimestamp(s.end_seconds)}\n${s.text}\n`
      )
      .join("\n")
  );
}
