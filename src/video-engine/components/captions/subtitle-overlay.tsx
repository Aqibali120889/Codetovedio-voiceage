/**
 * Subtitle Overlay Component.
 *
 * Renders burned-in captions inside the Remotion composition.
 * Reads SubtitleSegment data from the blueprint/manifest and displays
 * each segment at the correct frame, with proper safe-area positioning,
 * contrast, line wrapping, and optional word emphasis.
 *
 * Design decisions:
 * - Position: bottom 14% of screen (safe zone for 9:16)
 * - Max 2 lines per caption, 42 chars per line
 * - Bold black outline for contrast on any background
 * - Fade in/out in 4 frames at segment boundaries
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

// ============================================================
// Types
// ============================================================

export interface CaptionSegment {
  index: number;
  start_frame: number;
  end_frame: number;
  text: string;
  scene_id?: string;
}

export interface SubtitleOverlayProps {
  segments: CaptionSegment[];
  fps: number;
  /** Safe area bottom percent (0-100). Default: 14 */
  bottomPercent?: number;
  /** Font size in pixels. Default: 36 */
  fontSize?: number;
  /** Accent color for emphasized words */
  accentColor?: string;
  /** Whether to show subtitles at all */
  enabled?: boolean;
}

// ============================================================
// Line wrapping
// ============================================================

const MAX_CHARS_PER_LINE = 38;

function wrapLines(text: string): string[] {
  // Respect existing newlines first
  const rawLines = text.split("\n");
  const result: string[] = [];

  for (const raw of rawLines) {
    if (raw.length <= MAX_CHARS_PER_LINE) {
      result.push(raw.trim());
      continue;
    }
    // Word-wrap
    const words = raw.split(" ");
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length > MAX_CHARS_PER_LINE) {
        if (currentLine) result.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) result.push(currentLine.trim());
  }

  // Hard cap at 2 lines
  return result.slice(0, 2);
}

// ============================================================
// Component
// ============================================================

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  segments,
  fps: _fps,
  bottomPercent = 14,
  fontSize = 36,
  accentColor = "#FF5F00",
  enabled = true,
}) => {
  const frame = useCurrentFrame();

  if (!enabled || segments.length === 0) return null;

  // Find the active segment for the current frame
  const activeSegment = segments.find(
    (seg) => frame >= seg.start_frame && frame <= seg.end_frame
  );

  if (!activeSegment) return null;

  // Fade in at segment start, fade out before end
  const FADE_FRAMES = 4;
  const opacity = interpolate(
    frame,
    [
      activeSegment.start_frame,
      activeSegment.start_frame + FADE_FRAMES,
      activeSegment.end_frame - FADE_FRAMES,
      activeSegment.end_frame,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const lines = wrapLines(activeSegment.text);
  const maxLineLen = Math.max(...lines.map((l) => l.length), 0);
  const effectiveFontSize =
    maxLineLen > 34
      ? Math.max(26, Math.round(fontSize * Math.pow(34 / maxLineLen, 0.5)))
      : fontSize;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: `${bottomPercent}%`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "0 48px",
        zIndex: 1000,
        opacity,
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      {lines.map((line, lineIdx) => (
        <div
          key={lineIdx}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.78)",
            padding: "8px 22px",
            borderRadius: 6,
            textAlign: "center",
            maxWidth: "92%",
            boxSizing: "border-box",
          }}
        >
          {line.split(" ").map((w, wIdx) => {
            const cleanWord = w.replace(/[^a-zA-Z0-9%$-]/g, "");
            const isMetricOrKeyword =
              /\d/.test(w) ||
              w.includes("%") ||
              w.includes("$") ||
              /^(AI|API|AST|LLM|GPU|autonomous|latency|verified|compiler|settlement|deterministic|protocol|telemetry)$/i.test(
                cleanWord
              );

            return (
              <span
                key={wIdx}
                style={{
                  color: isMetricOrKeyword ? accentColor : "#FFFFFF",
                  fontWeight: isMetricOrKeyword ? 900 : 700,
                  fontSize: effectiveFontSize,
                  fontFamily:
                    "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  lineHeight: 1.35,
                  letterSpacing: 0.3,
                  marginRight: "0.28em",
                  textShadow: isMetricOrKeyword
                    ? `0 0 16px ${accentColor}aa, 0 1px 3px rgba(0,0,0,0.95)`
                    : "0 1px 3px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.8)",
                  display: "inline-block",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// Adapter: converts pipeline SubtitleSegment to CaptionSegment
// ============================================================

/** pipeline/types SubtitleSegment has startFrame/endFrame (camelCase) */
export function adaptPipelineSubtitles(
  subtitles: Array<{
    index: number;
    startFrame?: number;
    endFrame?: number;
    start_frame?: number;
    end_frame?: number;
    text: string;
    sceneId?: string;
    scene_id?: string;
  }>
): CaptionSegment[] {
  return subtitles.map((seg) => ({
    index: seg.index,
    start_frame: seg.startFrame ?? seg.start_frame ?? 0,
    end_frame: seg.endFrame ?? seg.end_frame ?? 0,
    text: seg.text,
    scene_id: seg.sceneId ?? seg.scene_id,
  }));
}
