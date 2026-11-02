import "./index.css";
import React from "react";
import { Composition } from "remotion";
import DopamineDropOffReel, { compositionConfig } from "./Composition";
import AIVideoStudio from "./AIVideoStudio";
import type { RenderManifest } from "./pipeline/types";

// ---------------------------------------------------------------------------
// Default manifest for Remotion Studio preview (no real audio/render data)
// ---------------------------------------------------------------------------
const PREVIEW_MANIFEST: RenderManifest = {
  projectId: "preview",
  compositionId: "AIVideoStudio",
  fps: 60,
  width: 1080,
  height: 1920,
  totalFrames: 1800, // 30 seconds @ 60fps
  totalDurationSeconds: 30,
  scenes: [
    {
      sceneId: "scene_001",
      narration: "Welcome to Voiceage Systems — where AI meets real-world automation.",
      visual_description: "Clean dark terminal with animated orange accent lines",
      on_screen_text: "AI MEETS AUTOMATION",
      audioPath: null,
      startFrame: 0,
      endFrame: 600,
      durationFrames: 600,
    },
    {
      sceneId: "scene_002",
      narration: "We build production-grade AI pipelines that actually ship.",
      visual_description: "Data flow diagram with glowing nodes",
      on_screen_text: "PRODUCTION-GRADE PIPELINES",
      audioPath: null,
      startFrame: 600,
      endFrame: 1200,
      durationFrames: 600,
    },
    {
      sceneId: "scene_003",
      narration: "Follow for practical AI engineering you can use today.",
      visual_description: "Call-to-action panel with green highlight",
      on_screen_text: "FOLLOW FOR MORE",
      audioPath: null,
      startFrame: 1200,
      endFrame: 1800,
      durationFrames: 600,
    },
  ],
  subtitles: [
    {
      index: 1,
      startSeconds: 0,
      endSeconds: 5,
      startFrame: 0,
      endFrame: 300,
      text: "Welcome to Voiceage Systems —\nwhere AI meets automation.",
      sceneId: "scene_001",
    },
    {
      index: 2,
      startSeconds: 5,
      endSeconds: 10,
      startFrame: 300,
      endFrame: 600,
      text: "Where AI meets real-world automation.",
      sceneId: "scene_001",
    },
    {
      index: 3,
      startSeconds: 10,
      endSeconds: 20,
      startFrame: 600,
      endFrame: 1200,
      text: "We build production-grade AI pipelines\nthat actually ship.",
      sceneId: "scene_002",
    },
    {
      index: 4,
      startSeconds: 20,
      endSeconds: 30,
      startFrame: 1200,
      endFrame: 1800,
      text: "Follow for practical AI engineering\nyou can use today.",
      sceneId: "scene_003",
    },
  ],
  scriptPath: "data/projects/preview/script.json",
  generatedAt: new Date().toISOString(),
};

// Typed default props object matching AIVideoStudio expectations
const STUDIO_DEFAULT_PROPS: { manifest: RenderManifest } & Record<string, unknown> = {
  manifest: PREVIEW_MANIFEST,
};

import { VideoComposition } from "./video-engine/composition/video-composition";
import showcaseBlueprint from "./video-engine/examples/registry-showcase.json";
import { buildTimeline } from "./video-engine/timeline/build-timeline";
import type { VideoBlueprint } from "./video-engine/types";

const SHOWCASE_TIMELINE = buildTimeline(showcaseBlueprint as unknown as VideoBlueprint);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Existing composition — preserved exactly ─────────────────── */}
      <Composition
        id={compositionConfig.id}
        component={DopamineDropOffReel}
        durationInFrames={compositionConfig.durationInSeconds * compositionConfig.fps}
        fps={compositionConfig.fps}
        width={compositionConfig.width}
        height={compositionConfig.height}
      />

      {/* ── AI Video Studio composition (Milestone 1) ────────────────── */}
      <Composition
        id="AIVideoStudio"
        component={AIVideoStudio}
        durationInFrames={PREVIEW_MANIFEST.totalFrames}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={STUDIO_DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          const raw = props as Record<string, unknown> | undefined;
          const m =
            Array.isArray(raw?.scenes) && raw?.projectId !== "preview"
              ? (raw as unknown as RenderManifest)
              : raw?.manifest && typeof raw.manifest === "object" && "scenes" in (raw.manifest as object)
              ? (raw.manifest as RenderManifest)
              : raw && "scenes" in raw
              ? (raw as unknown as RenderManifest)
              : PREVIEW_MANIFEST;
          return {
            durationInFrames: m?.totalFrames ?? PREVIEW_MANIFEST.totalFrames,
            fps: m?.fps ?? 60,
            width: m?.width ?? 1080,
            height: m?.height ?? 1920,
          };
        }}
      />

      {/* ── Scene Renderer Registry Showcase (Milestone 2) ───────────── */}
      <Composition
        id="RegistryShowcase"
        component={VideoComposition}
        durationInFrames={SHOWCASE_TIMELINE.totalFrames}
        fps={SHOWCASE_TIMELINE.fps}
        width={SHOWCASE_TIMELINE.width}
        height={SHOWCASE_TIMELINE.height}
        defaultProps={{ blueprint: showcaseBlueprint as unknown as VideoBlueprint }}
        calculateMetadata={({ props }) => {
          const raw = props as Record<string, unknown> | undefined;
          const bp = (raw?.blueprint as VideoBlueprint) ?? (raw as unknown as VideoBlueprint);
          if (bp?.scenes && Array.isArray(bp.scenes)) {
            const tl = buildTimeline(bp);
            return {
              durationInFrames: tl.totalFrames,
              fps: tl.fps,
              width: tl.width,
              height: tl.height,
            };
          }
          return {
            durationInFrames: SHOWCASE_TIMELINE.totalFrames,
            fps: SHOWCASE_TIMELINE.fps,
            width: SHOWCASE_TIMELINE.width,
            height: SHOWCASE_TIMELINE.height,
          };
        }}
      />

      {/* ── Production Video Composition (Milestone 3) ────────────────── */}
      <Composition
        id="ProductionVideo"
        component={VideoComposition}
        durationInFrames={SHOWCASE_TIMELINE.totalFrames}
        fps={SHOWCASE_TIMELINE.fps}
        width={SHOWCASE_TIMELINE.width}
        height={SHOWCASE_TIMELINE.height}
        defaultProps={{ blueprint: showcaseBlueprint as unknown as VideoBlueprint }}
        calculateMetadata={({ props }) => {
          const raw = props as Record<string, unknown> | undefined;
          const bp = (raw?.blueprint as VideoBlueprint) ?? (raw as unknown as VideoBlueprint);
          if (bp?.scenes && Array.isArray(bp.scenes)) {
            const tl = buildTimeline(bp);
            return {
              durationInFrames: tl.totalFrames,
              fps: tl.fps,
              width: tl.width,
              height: tl.height,
            };
          }
          return {
            durationInFrames: SHOWCASE_TIMELINE.totalFrames,
            fps: SHOWCASE_TIMELINE.fps,
            width: SHOWCASE_TIMELINE.width,
            height: SHOWCASE_TIMELINE.height,
          };
        }}
      />
    </>
  );
};
