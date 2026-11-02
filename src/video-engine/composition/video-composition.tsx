/**
 * Remotion Video Composition.
 *
 * Primary entry point for rendering validated Video Blueprints into Remotion.
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useCurrentFrame,
  staticFile,
} from "remotion";
import type { VideoBlueprint, TimelineBlueprint } from "../types";
import { buildTimeline } from "../timeline/build-timeline";
import { resolveTheme } from "../themes/presets";
import { SceneDispatcher } from "./scene-dispatcher";
import { SubtitleOverlay, adaptPipelineSubtitles } from "../components/captions/subtitle-overlay";
import type { PostProductionPlan } from "../../production/post-production/post-production-types";

export interface VideoCompositionProps {
  blueprint?: VideoBlueprint | TimelineBlueprint;
  [key: string]: unknown;
}

function resolveAudioSrc(audioPath: string | null | undefined): string | null {
  if (!audioPath) return null;
  if (
    audioPath.startsWith("http://") ||
    audioPath.startsWith("https://") ||
    audioPath.startsWith("data:")
  ) {
    return audioPath;
  }
  let clean = audioPath.replace(/\\/g, "/");
  if (clean.includes("/public/")) {
    clean = clean.split("/public/")[1];
  } else if (clean.includes("/data/projects/")) {
    clean = "projects/" + clean.split("/data/projects/")[1];
  }
  clean = clean.replace(/^\/+/, "");
  try {
    return staticFile(clean);
  } catch {
    return null;
  }
}

export const VideoComposition: React.FC<VideoCompositionProps> = (rawProps) => {
  const currentFrame = useCurrentFrame();

  // Extract blueprint from raw props
  const raw = rawProps as Record<string, unknown>;
  const bp: VideoBlueprint =
    (raw?.blueprint as VideoBlueprint) ??
    (raw?.manifest as unknown as VideoBlueprint) ??
    (raw as unknown as VideoBlueprint);

  const isProductionRender = Boolean(
    raw?.isProductionRender ||
      (raw?.blueprint as Record<string, unknown>)?.isProductionRender ||
      (bp as unknown as Record<string, unknown>)?.isProductionRender
  );

  // Compute timeline if not already pre-calculated
  const timeline: TimelineBlueprint =
    "totalFrames" in bp && Array.isArray((bp as TimelineBlueprint).scenes) && "startFrame" in (bp as TimelineBlueprint).scenes[0]
      ? (bp as TimelineBlueprint)
      : buildTimeline(bp);

  const theme = resolveTheme(timeline.theme_preset);
  const fps = timeline.fps || 60;

  // Extract subtitle segments from blueprint (if provided by production pipeline)
  // Accepts both camelCase (pipeline/types) and snake_case (production/types) formats
  const rawSubtitles =
    (bp as unknown as Record<string, unknown>).subtitles as Array<Record<string, unknown>> | undefined;
  const subtitleSegments = rawSubtitles && Array.isArray(rawSubtitles) && rawSubtitles.length > 0
    ? adaptPipelineSubtitles(
        rawSubtitles as Parameters<typeof adaptPipelineSubtitles>[0]
      )
    : [];

  const editingPlan = (bp as unknown as Record<string, unknown>).editing_plan as
    | PostProductionPlan
    | undefined;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontBody,
        overflow: "hidden",
      }}
    >
      {/* Laser horizon scanline */}
      <div
        style={{
          position: "absolute",
          top: (currentFrame * 3) % (timeline.height || 1920),
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${theme.colors.accentGlow}, transparent)`,
          boxShadow: `0 0 16px ${theme.colors.accent}`,
          pointerEvents: "none",
          zIndex: 900,
        }}
      />

      {/* Render Scenes in Sequences */}
      {timeline.scenes.map((scene) => {
        const audioSrc = resolveAudioSrc(scene.audio_path);
        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
          >
            <SceneDispatcher
              scene={scene}
              fps={fps}
              theme={theme}
              editingPlan={editingPlan}
            />
            {audioSrc && !isProductionRender && <Audio src={audioSrc} volume={1} />}
          </Sequence>
        );
      })}

      {/* Burned-in subtitles — displayed above all scene content */}
      {subtitleSegments.length > 0 && (
        <SubtitleOverlay
          segments={subtitleSegments}
          fps={fps}
          bottomPercent={14}
          fontSize={34}
          accentColor={timeline.brand?.accent_color ?? theme.colors.accent}
          enabled
        />
      )}

      {/* Global Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 48,
          right: 48,
          height: 3,
          backgroundColor: theme.colors.surfaceBorder,
          borderRadius: 2,
          overflow: "hidden",
          zIndex: 950,
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (currentFrame / (timeline.totalFrames || 1)) * 100)}%`,
            height: "100%",
            backgroundColor: theme.colors.accent,
            boxShadow: `0 0 8px ${theme.colors.accent}`,
          }}
        />
      </div>

      {/* Brand Signature */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 13,
          fontWeight: 800,
          fontFamily: theme.typography.fontCode,
          letterSpacing: 4,
          color: theme.colors.textMuted,
          zIndex: 950,
        }}
      >
        VOICEAGE <span style={{ color: theme.colors.accent }}>SYSTEMS</span>
      </div>
    </AbsoluteFill>
  );
};

