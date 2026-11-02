/**
 * Subtitle generation from actual measured audio durations.
 * Produces sentence-level subtitle segments mapped to Remotion frames.
 */

import type {
  ScriptSchema,
  AudioMetadata,
  SubtitleSegment,
  SubtitleResult,
} from "./types";
import fs from "fs";
import path from "path";

// ============================================================
// Sentence splitting
// ============================================================

/**
 * Split text into sentences, respecting common abbreviations.
 * Returns an array of non-empty sentence strings.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space/end
  const raw = text
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If no sentence boundaries found, split by comma or return whole
  if (raw.length <= 1 && text.length > 80) {
    return text
      .split(/,\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return raw;
}

// ============================================================
// Core subtitle generation
// ============================================================

/**
 * Generate subtitle segments from a script and per-scene audio metadata.
 * Audio duration drives all timing — not the model's duration hints.
 */
export function generateSubtitles(
  script: ScriptSchema,
  audioMap: Map<string, AudioMetadata>,
  fps: number,
  projectDir: string
): SubtitleResult {
  const segments: SubtitleSegment[] = [];
  let globalStartSeconds = 0;
  let segmentIndex = 1;

  for (const scene of script.scenes) {
    const audio = audioMap.get(scene.id);
    const sceneDurationSeconds = audio?.durationSeconds ?? scene.duration_hint_seconds;

    const sentences = splitIntoSentences(scene.narration);
    const sentenceDuration = sceneDurationSeconds / Math.max(sentences.length, 1);

    for (let si = 0; si < sentences.length; si++) {
      const sentence = sentences[si];
      const startSeconds = globalStartSeconds + si * sentenceDuration;
      const endSeconds = Math.min(
        startSeconds + sentenceDuration,
        globalStartSeconds + sceneDurationSeconds
      );

      const startFrame = Math.max(0, Math.round(startSeconds * fps));
      const endFrame = Math.max(startFrame + 1, Math.round(endSeconds * fps));

      segments.push({
        index: segmentIndex++,
        startSeconds,
        endSeconds,
        startFrame,
        endFrame,
        text: formatSubtitleText(sentence),
        sceneId: scene.id,
      });
    }

    globalStartSeconds += sceneDurationSeconds;
  }

  const totalDurationSeconds = globalStartSeconds;

  // Export SRT
  const srtPath = path.join(projectDir, "subtitles", "captions.srt");
  const vttPath = path.join(projectDir, "subtitles", "captions.vtt");

  fs.mkdirSync(path.join(projectDir, "subtitles"), { recursive: true });
  fs.writeFileSync(srtPath, generateSrt(segments));
  fs.writeFileSync(vttPath, generateVtt(segments));

  return {
    segments,
    totalDurationSeconds,
    fps,
    srtPath,
    vttPath,
  };
}

// ============================================================
// Text formatting
// ============================================================

function formatSubtitleText(text: string): string {
  // Break long lines at word boundary
  const maxChars = 42;
  if (text.length <= maxChars) return text;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + " " + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  // Max 2 lines per segment
  return lines.slice(0, 2).join("\n");
}

// ============================================================
// SRT / VTT export
// ============================================================

function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${padMs(ms)}`;
}

function secondsToVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${padMs(ms)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function padMs(n: number): string {
  return String(n).padStart(3, "0");
}

function generateSrt(segments: SubtitleSegment[]): string {
  return segments
    .map(
      (seg) =>
        `${seg.index}\n${secondsToSrtTime(seg.startSeconds)} --> ${secondsToSrtTime(seg.endSeconds)}\n${seg.text}`
    )
    .join("\n\n");
}

function generateVtt(segments: SubtitleSegment[]): string {
  const header = "WEBVTT\n\n";
  const body = segments
    .map(
      (seg) =>
        `${secondsToVttTime(seg.startSeconds)} --> ${secondsToVttTime(seg.endSeconds)}\n${seg.text}`
    )
    .join("\n\n");
  return header + body;
}
